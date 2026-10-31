const slugify = require('slugify');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Promotion = require('../models/Promotion');
const Favorite = require('../models/Favorite');
const Review = require('../models/Review');
const User = require('../models/User');
const Order = require('../models/Order');
const ProductActivity = require('../models/ProductActivity');
const orderService = require('../services/orderService');
const { AppError, asyncHandler, pageResult } = require('../utils/errors');

const definitions = {
  categories: { Model: Category, fields: ['name', 'description', 'image', 'status'], uniqueSlug: true },
  products: { Model: Product, fields: ['name', 'description', 'category', 'images', 'price', 'compareAtPrice', 'variants', 'status', 'featured', 'tags', 'salesCount'], uniqueSlug: true },
  posts: { Model: Post, fields: ['title', 'excerpt', 'content', 'image', 'status', 'publishedAt'], slugField: 'title', uniqueSlug: true },
  promotions: { Model: Promotion, fields: ['code', 'discountType', 'discountValue', 'minimumOrder', 'maximumDiscount', 'startsAt', 'endsAt', 'usageLimit', 'active'] }
};

function pick(source, fields) { return Object.fromEntries(Object.entries(source || {}).filter(([key]) => fields.includes(key))); }
function slugBase(name) { return slugify(String(name || ''), { lower: true, strict: true }) || `item-${Date.now()}`; }

function adminList(kind) {
  const { Model } = definitions[kind];
  return asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const key = kind === 'posts' ? 'title' : kind === 'promotions' ? 'code' : 'name';
      const pattern = { $regex: String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      if (kind === 'products') filter.$or = [{ name: pattern }, { slug: pattern }, { 'variants.sku': pattern }];
      else filter[key] = pattern;
    }
    if (kind === 'products' && req.query.category) {
      if (!mongoose.isValidObjectId(req.query.category)) throw new AppError('Invalid category', 400, 'INVALID_CATEGORY');
      filter.category = req.query.category;
    }
    let query = Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    if (kind === 'products') query = query.populate('category', 'name slug');
    const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
    res.json({ success: true, data: pageResult(items, total, page, limit) });
  });
}

function adminCreate(kind) {
  const definition = definitions[kind];
  return asyncHandler(async (req, res) => {
    const data = pick(req.body, definition.fields);
    if (definition.uniqueSlug) data.slug = slugBase(req.body.slug || req.body[definition.slugField || 'name']);
    if (kind === 'posts' && data.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
    if (kind === 'products') await validateProductData(data);
    const item = await definition.Model.create(data);
    if (kind === 'products') await writeProductActivities(item, req.user.id, [
      { action: 'created', changes: [{ field: 'product', after: { name: item.name, price: item.price, category: item.category, status: item.status } }] },
      ...(item.variants.length ? [{ action: 'inventory_changed', reason: 'Tồn kho ban đầu khi tạo sản phẩm', changes: item.variants.map(variant => ({ field: 'inventory', variantId: variant._id, sku: variant.sku || '', before: 0, after: variant.quantity })) }] : [])
    ]);
    res.status(201).json({ success: true, data: { item } });
  });
}

function adminUpdate(kind) {
  const definition = definitions[kind];
  return asyncHandler(async (req, res) => {
    const update = pick(req.body, definition.fields);
    if (definition.uniqueSlug && (req.body.slug || req.body[definition.slugField || 'name'])) update.slug = slugBase(req.body.slug || req.body[definition.slugField || 'name']);
    if (kind === 'posts' && update.status === 'published' && !update.publishedAt) update.publishedAt = new Date();
    let item;
    if (kind === 'products') {
      const current = await Product.findById(req.params.id);
      if (!current) throw new AppError('Record not found', 404, 'NOT_FOUND');
      await validateProductData(update, current);
      if (hasInventoryChange(current.variants, update.variants)) {
        if (typeof req.body.inventoryReason !== 'string' || !req.body.inventoryReason.trim() || req.body.inventoryReason.trim().length > 500) throw new AppError('A reason of at most 500 characters is required when changing inventory', 400, 'INVENTORY_REASON_REQUIRED');
      }
      const before = current.toObject();
      current.set(update);
      item = await current.save();
      const activities = buildProductActivities(before, item.toObject(), req.user.id, req.body.inventoryReason);
      await writeProductActivities(item, req.user.id, activities);
    } else item = await definition.Model.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!item) throw new AppError('Record not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: { item } });
  });
}

function adminDelete(kind) {
  const { Model } = definitions[kind];
  return asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new AppError('Record not found', 404, 'NOT_FOUND');
    if (kind === 'categories') {
      if (await Product.exists({ category: item._id })) throw new AppError('Category has products. Hide it instead of deleting it.', 409, 'CATEGORY_IN_USE');
      await item.deleteOne();
    } else if (kind === 'products') {
      const before = item.status;
      item.status = 'hidden';
      await item.save();
      if (before !== item.status) await writeProductActivities(item, req.user.id, [{ action: 'visibility_changed', changes: [{ field: 'status', before, after: item.status }] }]);
    }
    else if (kind === 'promotions' && item.usedCount > 0) { item.active = false; await item.save(); }
    else await item.deleteOne();
    res.json({ success: true, data: { message: kind === 'products' ? 'Product hidden' : 'Record deleted' } });
  });
}

async function validateProductData(data, current) {
  const name = data.name ?? current?.name;
  const price = data.price ?? current?.price;
  const compareAtPrice = data.compareAtPrice ?? current?.compareAtPrice;
  const categoryId = data.category ?? current?.category;
  const status = data.status ?? current?.status ?? 'active';
  const variants = data.variants ?? current?.variants;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 160) throw new AppError('Product name is required and must be at most 160 characters', 400, 'INVALID_PRODUCT');
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) throw new AppError('Price must be a non-negative number', 400, 'INVALID_PRODUCT');
  if (compareAtPrice !== undefined && compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < price)) throw new AppError('List price must be greater than or equal to sale price', 400, 'INVALID_PRODUCT');
  if (!mongoose.isValidObjectId(categoryId)) throw new AppError('A valid category is required', 400, 'INVALID_CATEGORY');
  if (!await Category.exists({ _id: categoryId, status: 'active' })) throw new AppError('Category does not exist or is not active', 400, 'INVALID_CATEGORY');
  if (!['active', 'hidden'].includes(status)) throw new AppError('Invalid product status', 400, 'INVALID_PRODUCT');
  if (!Array.isArray(variants) || variants.length < 1 || variants.length > 100) throw new AppError('A product must have between 1 and 100 variants', 400, 'INVALID_VARIANTS');
  const skus = new Set();
  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || typeof variant.size !== 'string' || !variant.size.trim() || typeof variant.color !== 'string' || !variant.color.trim()) throw new AppError('Each variant requires a size and color', 400, 'INVALID_VARIANTS');
    if (!Number.isInteger(variant.quantity) || variant.quantity < 0) throw new AppError('Variant inventory must be a non-negative integer', 400, 'INVALID_VARIANTS');
    if (variant.sku) {
      if (typeof variant.sku !== 'string') throw new AppError('Variant SKU must be text', 400, 'INVALID_VARIANTS');
      const sku = String(variant.sku).trim().toLowerCase();
      if (skus.has(sku)) throw new AppError('Variant SKUs must be unique within a product', 400, 'INVALID_VARIANTS');
      skus.add(sku);
    }
  }
  if (data.images !== undefined && (!Array.isArray(data.images) || data.images.some(image => typeof image !== 'string' || !image.trim()))) throw new AppError('Product images must be a list of non-empty URLs', 400, 'INVALID_IMAGES');
  if (data.featured !== undefined && typeof data.featured !== 'boolean') throw new AppError('Featured must be a boolean', 400, 'INVALID_PRODUCT');
  if (data.status !== undefined && !['active', 'hidden'].includes(data.status)) throw new AppError('Invalid product status', 400, 'INVALID_PRODUCT');
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some(tag => typeof tag !== 'string'))) throw new AppError('Tags must be a list of strings', 400, 'INVALID_PRODUCT');
}

function buildProductActivities(before, after, actor, reason) {
  const changes = [];
  for (const field of ['name', 'description', 'category', 'images', 'price', 'compareAtPrice', 'status', 'featured', 'tags']) {
    const oldValue = before[field]?.toString?.() ?? before[field];
    const newValue = after[field]?.toString?.() ?? after[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) changes.push({ field, before: oldValue, after: newValue });
  }
  const oldVariants = new Map((before.variants || []).map(variant => [String(variant._id), variant]));
  const newVariants = new Map((after.variants || []).map(variant => [String(variant._id), variant]));
  const stockChanges = [];
  const variantChanges = [];
  const variantFields = ['sku', 'size', 'color', 'colorHex', 'isActive', 'images'];
  for (const [id, next] of newVariants) {
    const previous = oldVariants.get(id);
    if (!previous || previous.quantity !== next.quantity) stockChanges.push({ field: 'inventory', variantId: id, sku: next.sku || previous?.sku || '', before: previous?.quantity ?? 0, after: next.quantity });
    if (!previous || variantFields.some(field => JSON.stringify(previous[field]) !== JSON.stringify(next[field]))) variantChanges.push({ field: 'variant', variantId: id, sku: next.sku || '', before: previous ? Object.fromEntries(variantFields.map(field => [field, previous[field]])) : undefined, after: Object.fromEntries(variantFields.map(field => [field, next[field]])) });
  }
  for (const [id, previous] of oldVariants) if (!newVariants.has(id)) {
    stockChanges.push({ field: 'inventory', variantId: id, sku: previous.sku || '', before: previous.quantity, after: 0 });
    variantChanges.push({ field: 'variant', variantId: id, sku: previous.sku || '', before: Object.fromEntries(variantFields.map(field => [field, previous[field]])), after: undefined });
  }
  const activities = [];
  if (changes.some(change => change.field === 'status')) activities.push({ action: 'visibility_changed', changes: changes.filter(change => change.field === 'status') });
  if (changes.some(change => ['price', 'compareAtPrice'].includes(change.field))) activities.push({ action: 'price_changed', changes: changes.filter(change => ['price', 'compareAtPrice'].includes(change.field)) });
  if (stockChanges.length) activities.push({ action: 'inventory_changed', changes: stockChanges, reason: String(reason || '').trim() });
  const tracked = new Set(['status', 'price', 'compareAtPrice']);
  const otherChanges = [...changes.filter(change => !tracked.has(change.field)), ...variantChanges];
  if (otherChanges.length) activities.push({ action: 'updated', changes: otherChanges });
  return activities.map(activity => ({ ...activity, actor }));
}

function hasInventoryChange(currentVariants, nextVariants) {
  if (!Array.isArray(nextVariants)) return false;
  const previous = new Map((currentVariants || []).map(variant => [String(variant._id), variant.quantity]));
  const nextIds = new Set(nextVariants.map(variant => variant._id && String(variant._id)).filter(Boolean));
  return nextVariants.some(variant => !variant._id || previous.get(String(variant._id)) !== variant.quantity) || [...previous.keys()].some(id => !nextIds.has(id));
}

async function writeProductActivities(product, actor, activities) {
  if (!activities.length) return;
  try {
    await ProductActivity.insertMany(activities.map(activity => ({ ...activity, product: product._id, actor: activity.actor || actor })));
  } catch (error) {
    // Product writes must not be reported as failed after the product itself has already been saved.
    console.error('Could not persist product activity log:', error.message);
  }
}

const productActivity = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = { product: req.params.id };
  const [items, total] = await Promise.all([
    ProductActivity.find(filter).populate('actor', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ProductActivity.countDocuments(filter)
  ]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});

const publicCategories = asyncHandler(async (req, res) => res.json({ success: true, data: { items: await Category.find({ status: 'active' }).sort({ name: 1 }) } }));
const publicPosts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(30, Number(req.query.limit) || 10); const filter = { status: 'published', publishedAt: { $lte: new Date() } };
  const [items, total] = await Promise.all([Post.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit), Post.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const publicPostDetail = asyncHandler(async (req, res) => {
  const item = await Post.findOne({ slug: req.params.slug, status: 'published', publishedAt: { $lte: new Date() } });
  if (!item) throw new AppError('Article not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { item } });
});

const favoritesList = asyncHandler(async (req, res) => res.json({ success: true, data: { items: await Favorite.find({ user: req.user.id }).populate({ path: 'product', match: { status: 'active' }, populate: { path: 'category', select: 'name slug' } }) } }));
const favoriteAdd = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) throw new AppError('Invalid product id', 400, 'INVALID_ID');
  if (!await Product.exists({ _id: req.params.productId, status: 'active' })) throw new AppError('Product not found', 404, 'NOT_FOUND');
  const item = await Favorite.findOneAndUpdate({ user: req.user.id, product: req.params.productId }, { $setOnInsert: { user: req.user.id, product: req.params.productId } }, { upsert: true, new: true }).populate('product');
  res.status(201).json({ success: true, data: { item } });
});
const favoriteRemove = asyncHandler(async (req, res) => { await Favorite.deleteOne({ user: req.user.id, product: req.params.productId }); res.json({ success: true, data: { message: 'Favorite removed' } }); });

const createReview = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id, status: 'completed', 'items.product': req.params.productId });
  if (!order) throw new AppError('Only buyers with a completed order can review this product', 403, 'REVIEW_NOT_ALLOWED');
  const review = await Review.create({ product: req.params.productId, user: req.user.id, order: order._id, rating: req.body.rating, comment: req.body.comment || '' });
  res.status(201).json({ success: true, data: { review } });
});
const ownReviewUpdate = asyncHandler(async (req, res) => {
  const review = await Review.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: pick(req.body, ['rating', 'comment']) }, { new: true, runValidators: true });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { review } });
});
const ownReviewDelete = asyncHandler(async (req, res) => { const result = await Review.deleteOne({ _id: req.params.id, user: req.user.id }); if (!result.deletedCount) throw new AppError('Review not found', 404, 'NOT_FOUND'); res.json({ success: true, data: { message: 'Review deleted' } }); });

const adminReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = {};
  if (req.query.rating) filter.rating = Number(req.query.rating); if (req.query.product) filter.product = req.query.product; if (req.query.status) filter.status = req.query.status;
  const [items, total] = await Promise.all([Review.find(filter).populate('user', 'name email').populate('product', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Review.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const moderateReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true, runValidators: true });
  if (!review) throw new AppError('Review not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { review } });
});

const customers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = { role: 'customer' };
  if (req.query.q) { const q = String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }]; }
  const [items, total] = await Promise.all([User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const customerDetail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'customer' }).select('-passwordHash');
  if (!user) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  const [orderCount, spent] = await Promise.all([Order.countDocuments({ user: user._id }), Order.aggregate([{ $match: { user: user._id, status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }])]);
  res.json({ success: true, data: { user, orderCount, spent: spent[0]?.total || 0 } });
});
const blockCustomer = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({ _id: req.params.id, role: 'customer' }, { $set: { isBlocked: Boolean(req.body.isBlocked) } }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Customer not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { user } });
});

const adminOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Number(req.query.limit) || 20); const filter = {};
  if (req.query.status) filter.status = req.query.status; if (req.query.from || req.query.to) filter.createdAt = { ...(req.query.from ? { $gte: new Date(req.query.from) } : {}), ...(req.query.to ? { $lte: new Date(`${req.query.to}T23:59:59.999Z`) } : {}) };
  const [items, total] = await Promise.all([Order.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Order.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const changeAdminOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id); if (!order) throw new AppError('Order not found', 404, 'NOT_FOUND');
  res.json({ success: true, data: { order: await orderService.changeOrderStatus(order, req.body.status, req.body.note) } });
});

const stats = asyncHandler(async (req, res) => {
  const range = req.query.range || 'month'; const start = new Date();
  if (range === 'day') start.setDate(start.getDate() - 29); else if (range === 'year') start.setFullYear(start.getFullYear() - 4, 0, 1); else start.setMonth(start.getMonth() - 11, 1);
  const [revenue, orders, customers, products, daily, topProducts] = await Promise.all([
    Order.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ createdAt: { $gte: start } }), User.countDocuments({ role: 'customer' }), Product.countDocuments({ status: 'active' }),
    Order.aggregate([{ $match: { status: 'completed', createdAt: { $gte: start } } }, { $group: { _id: { $dateToString: { format: range === 'day' ? '%Y-%m-%d' : range === 'year' ? '%Y' : '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Product.find({ status: 'active' }).sort({ salesCount: -1 }).limit(5).select('name price salesCount images')
  ]);
  res.json({ success: true, data: { revenue: revenue[0]?.total || 0, orderCount: orders, customerCount: customers, productCount: products, chart: daily, topProducts } });
});

module.exports = { definitions, adminList, adminCreate, adminUpdate, adminDelete, productActivity, publicCategories, publicPosts, publicPostDetail, favoritesList, favoriteAdd, favoriteRemove, createReview, ownReviewUpdate, ownReviewDelete, adminReviews, moderateReview, customers, customerDetail, blockCustomer, adminOrders, changeAdminOrderStatus, stats };
