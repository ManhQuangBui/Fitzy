const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const mongoose = require('mongoose');
const { asyncHandler, pageResult } = require('../utils/errors');
const { AppError } = require('../utils/errors');

const list = asyncHandler(async (req, res) => {
  const page = readNumber(req.query.page, 'page', 1, 100000, 1); const limit = readNumber(req.query.limit, 'limit', 1, 48, 12);
  const filter = { status: 'active' };
  if (req.query.category) {
    const categoryFilter = mongoose.isValidObjectId(req.query.category) ? { $or: [{ _id: req.query.category }, { slug: req.query.category }] } : { slug: req.query.category };
    const category = await Category.findOne({ ...categoryFilter, status: 'active' }).select('_id');
    if (!category) return res.json({ success: true, data: pageResult([], 0, page, limit) });
    filter.category = category._id;
  }
  if (req.query.q?.trim()) { if (req.query.q.length > 100) throw new AppError('Search text is too long', 400, 'INVALID_SEARCH'); filter.$text = { $search: req.query.q.trim() }; }
  const minPrice = readOptionalNumber(req.query.minPrice, 'minPrice'); const maxPrice = readOptionalNumber(req.query.maxPrice, 'maxPrice');
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new AppError('Minimum price cannot exceed maximum price', 400, 'INVALID_PRICE_RANGE');
  if (minPrice !== undefined || maxPrice !== undefined) filter.price = { ...(minPrice !== undefined ? { $gte: minPrice } : {}), ...(maxPrice !== undefined ? { $lte: maxPrice } : {}) };
  for (const key of ['size', 'color']) if (req.query[key] && (typeof req.query[key] !== 'string' || req.query[key].length > 40)) throw new AppError(`Invalid ${key} filter`, 400, 'INVALID_FILTER');
  if (req.query.size || req.query.color) filter.variants = { $elemMatch: { isActive: true, ...(req.query.size ? { size: req.query.size } : {}), ...(req.query.color ? { color: new RegExp(`^${escapeRegExp(req.query.color)}$`, 'i') } : {}) } };
  const sort = { newest: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, popular: { salesCount: -1, createdAt: -1 } }[req.query.sort] || { featured: -1, createdAt: -1 };
  const [items, total] = await Promise.all([Product.find(filter).populate('category', 'name slug').sort(sort).skip((page - 1) * limit).limit(limit), Product.countDocuments(filter)]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
function readNumber(value, name, min, max, fallback) { const number = value === undefined ? fallback : Number(value); if (!Number.isInteger(number) || number < min || number > max) throw new AppError(`Invalid ${name}`, 400, 'INVALID_QUERY'); return number; }
function readOptionalNumber(value, name) { if (value === undefined || value === '') return undefined; const number = Number(value); if (!Number.isFinite(number) || number < 0 || number > 1000000000) throw new AppError(`Invalid ${name}`, 400, 'INVALID_QUERY'); return number; }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const detail = asyncHandler(async (req, res) => {
  const filter = mongoose.isValidObjectId(req.params.id) ? { $or: [{ _id: req.params.id }, { slug: req.params.id }] } : { slug: req.params.id };
  const product = await Product.findOne({ ...filter, status: 'active' }).populate('category', 'name slug');
  if (!product) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
  const reviews = await Review.find({ product: product._id, status: 'visible' }).populate('user', 'name').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: { product, reviews } });
});

module.exports = { list, detail };
