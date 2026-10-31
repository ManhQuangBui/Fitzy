const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const { AppError } = require('../utils/errors');
const { enabledProviders } = require('./paymentGatewayService');

const SHIPPING_THRESHOLD = 500000;
const SHIPPING_FEE = 30000;

function calculateDiscount(promo, subtotal) {
  if (!promo) return 0;
  const raw = promo.discountType === 'percent' ? subtotal * promo.discountValue / 100 : promo.discountValue;
  return Math.round(Math.min(subtotal, promo.maximumDiscount ? Math.min(raw, promo.maximumDiscount) : raw));
}

async function createOrder(userId, input) {
  if (!Array.isArray(input.items) || !input.items.length) throw new AppError('Your order has no items', 400, 'EMPTY_ORDER');
  if (input.items.length > 30) throw new AppError('An order can contain up to 30 variants', 400, 'ORDER_TOO_LARGE');
  const shipping = input.shipping || {};
  for (const key of ['recipient', 'phone', 'line1', 'district', 'city']) {
    if (typeof shipping[key] !== 'string' || !shipping[key].trim()) throw new AppError(`Shipping ${key} is required`, 400, 'SHIPPING_REQUIRED');
  }
  if (!/^\+?[0-9\s()-]{8,20}$/.test(shipping.phone)) throw new AppError('Please enter a valid phone number', 400, 'INVALID_PHONE');
  const paymentMethod = input.paymentMethod || 'cod';
  if (!['cod', 'bank_transfer', 'momo', 'zalopay', 'vnpay'].includes(paymentMethod)) throw new AppError('Unsupported payment method', 400, 'INVALID_PAYMENT_METHOD');
  if (paymentMethod === 'bank_transfer' && !getBankTransferDetails()) throw new AppError('Bank transfer is not configured', 503, 'PAYMENT_METHOD_UNAVAILABLE');
  if (['momo', 'zalopay', 'vnpay'].includes(paymentMethod) && !enabledProviders().some(method => method.id === paymentMethod)) throw new AppError('Payment gateway is not configured', 503, 'PAYMENT_METHOD_UNAVAILABLE');
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const orderItems = [];
      let subtotal = 0;
      for (const item of input.items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new AppError('Item quantity must be between 1 and 20', 400, 'INVALID_QUANTITY');
        const product = await Product.findOne({ _id: item.productId, status: 'active' }).session(session);
        if (!product) throw new AppError('A product is no longer available', 409, 'PRODUCT_UNAVAILABLE');
        const variant = product.variants.id(item.variantId);
        if (!variant || !variant.isActive || variant.quantity < quantity) throw new AppError(`${product.name} (${variant?.size || 'variant'}) is out of stock`, 409, 'INSUFFICIENT_STOCK');
        const reserved = await Product.updateOne({ _id: product._id, status: 'active', variants: { $elemMatch: { _id: variant._id, isActive: true, quantity: { $gte: quantity } } } }, { $inc: { 'variants.$.quantity': -quantity } }, { session });
        if (!reserved.modifiedCount) throw new AppError(`${product.name} is out of stock`, 409, 'INSUFFICIENT_STOCK');
        const unitPrice = product.price;
        subtotal += unitPrice * quantity;
        orderItems.push({ product: product._id, variantId: variant._id, name: product.name, image: variant.images[0] || product.images[0] || '', size: variant.size, color: variant.color, quantity, unitPrice });
      }
      let promo = null;
      const code = input.promotionCode?.trim().toUpperCase();
      if (code) {
        const now = new Date();
        promo = await Promotion.findOne({ code, active: true, startsAt: { $lte: now }, endsAt: { $gte: now }, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] }).session(session);
        if (!promo) throw new AppError('Promotion code is invalid or expired', 400, 'PROMOTION_INVALID');
        if (subtotal < promo.minimumOrder) throw new AppError(`Minimum order for this code is ${promo.minimumOrder}`, 400, 'PROMOTION_MINIMUM');
        const consumed = await Promotion.updateOne({ _id: promo._id, active: true, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] }, { $inc: { usedCount: 1 } }, { session });
        if (!consumed.modifiedCount) throw new AppError('Promotion code has reached its usage limit', 409, 'PROMOTION_EXHAUSTED');
      }
      const discount = calculateDiscount(promo, subtotal);
      const shippingFee = subtotal - discount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
      const total = subtotal - discount + shippingFee;
      [created] = await Order.create([{
        orderNumber: `FZ${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`,
        user: userId, items: orderItems, shipping: input.shipping, paymentMethod, paymentStatus: ['momo', 'zalopay', 'vnpay'].includes(paymentMethod) ? 'pending' : 'unpaid', paymentExpiresAt: ['momo', 'zalopay', 'vnpay'].includes(paymentMethod) ? new Date(Date.now() + 15 * 60 * 1000) : undefined, subtotal, discount, shippingFee, total, promotionCode: code || '', status: 'pending', statusHistory: [{ status: 'pending', at: new Date(), note: 'Đơn hàng đã được tạo.' }]
      }], { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return created;
  } finally { await session.endSession(); }
}

function getBankTransferDetails() {
  const bankName = process.env.BANK_TRANSFER_BANK_NAME?.trim();
  const accountName = process.env.BANK_TRANSFER_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim();
  if (!bankName || !accountName || !accountNumber) return null;
  return { bankName, accountName, accountNumber, branch: process.env.BANK_TRANSFER_BRANCH?.trim() || '' };
}

const nextStatuses = { pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['shipping', 'cancelled'], shipping: ['completed', 'delivery_failed'], delivery_failed: ['shipping'], completed: [], cancelled: [] };
const statusNotes = { confirmed: 'Cửa hàng đã xác nhận đơn hàng.', preparing: 'Cửa hàng đang chuẩn bị sản phẩm.', shipping: 'Đơn hàng đang được giao.', completed: 'Đơn hàng đã giao thành công.', cancelled: 'Đơn hàng đã bị hủy.', delivery_failed: 'Giao hàng chưa thành công.' };

async function cancelOrder(order, userId, note = '') {
  if (userId !== 'admin' && order.user.toString() !== userId.toString()) throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
  if (!['pending', 'confirmed', 'preparing'].includes(order.status)) throw new AppError('This order can no longer be cancelled', 409, 'CANCEL_NOT_ALLOWED');
  if (['bank_transfer', 'momo', 'zalopay', 'vnpay'].includes(order.paymentMethod) && order.paymentStatus === 'paid') throw new AppError('Refund the payment before cancelling this order', 409, 'REFUND_REQUIRED');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product, 'variants._id': item.variantId }, { $inc: { 'variants.$.quantity': item.quantity } }, { session });
      }
      if (order.promotionCode) await Promotion.updateOne({ code: order.promotionCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
      const changedAt = new Date();
      const updateFilter = { _id: order._id, status: { $in: ['pending', 'confirmed', 'preparing'] } };
      if (['bank_transfer', 'momo', 'zalopay', 'vnpay'].includes(order.paymentMethod)) updateFilter.paymentStatus = { $ne: 'paid' };
      const updated = await Order.updateOne(updateFilter, { $set: { status: 'cancelled', cancelledAt: changedAt }, $push: { statusHistory: { status: 'cancelled', at: changedAt, note: note || statusNotes.cancelled } } }, { session });
      if (!updated.modifiedCount) throw new AppError('This order can no longer be cancelled', 409, 'CANCEL_NOT_ALLOWED');
    });
    return Order.findById(order._id);
  } finally { await session.endSession(); }
}

async function expirePendingPaymentOrders(now = new Date()) {
  const session = await mongoose.startSession();
  let expiredCount = 0;
  try {
    await session.withTransaction(async () => {
      const candidates = await Order.find({ status: { $in: ['pending', 'confirmed', 'preparing'] }, paymentStatus: { $in: ['pending', 'failed'] }, paymentMethod: { $in: ['momo', 'zalopay', 'vnpay'] }, paymentExpiresAt: { $lte: now } }).session(session);
      for (const order of candidates) {
        const updated = await Order.updateOne({ _id: order._id, status: { $in: ['pending', 'confirmed', 'preparing'] }, paymentStatus: { $in: ['pending', 'failed'] }, paymentExpiresAt: { $lte: now } }, { $set: { status: 'cancelled', paymentStatus: 'expired', cancelledAt: now, paymentUrl: '' }, $push: { statusHistory: { status: 'cancelled', at: now, note: 'Đơn hàng đã hủy do giao dịch thanh toán hết hạn.' } } }, { session });
        if (!updated.modifiedCount) continue;
        expiredCount += 1;
        for (const item of order.items) await Product.updateOne({ _id: item.product, 'variants._id': item.variantId }, { $inc: { 'variants.$.quantity': item.quantity } }, { session });
        if (order.promotionCode) await Promotion.updateOne({ code: order.promotionCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
      }
    });
    return expiredCount;
  } finally { await session.endSession(); }
}

async function changeOrderStatus(order, status, note = '') {
  if (!nextStatuses[order.status]?.includes(status)) throw new AppError(`Cannot change an order from ${order.status} to ${status}`, 409, 'INVALID_ORDER_TRANSITION');
  if (status === 'cancelled') return cancelOrder(order, 'admin', note);
  const changedAt = new Date();
  const historyEntry = { status, at: changedAt, note: note || statusNotes[status] || '' };
  if (status === 'completed') {
    if (order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid') throw new AppError('Payment must be confirmed before completing this order', 409, 'PAYMENT_REQUIRED');
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updated = await Order.updateOne({ _id: order._id, status: order.status }, { $set: { status, ...(order.paymentMethod === 'cod' ? { paymentStatus: 'paid' } : {}) }, $push: { statusHistory: historyEntry } }, { session });
        if (!updated.modifiedCount) throw new AppError('Order status changed; reload and try again', 409, 'ORDER_CHANGED');
        for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { salesCount: item.quantity } }, { session });
      });
    } finally { await session.endSession(); }
    return Order.findById(order._id);
  }
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: { status }, $push: { statusHistory: historyEntry } }, { new: true });
  if (!updated) throw new AppError('Order status changed; reload and try again', 409, 'ORDER_CHANGED');
  return updated;
}

module.exports = { createOrder, cancelOrder, changeOrderStatus, expirePendingPaymentOrders, calculateDiscount, nextStatuses, getBankTransferDetails, SHIPPING_FEE, SHIPPING_THRESHOLD };
