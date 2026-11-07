const Order = require('../models/Order');
const Review = require('../models/Review');
const orderService = require('../services/orderService');
const paymentGatewayService = require('../services/paymentGatewayService');
const { asyncHandler, pageResult } = require('../utils/errors');

const create = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.user.id, req.body);
  if (!['momo', 'zalopay', 'vnpay'].includes(order.paymentMethod)) return res.status(201).json({ success: true, data: { order } });
  order.providerTransactionId = paymentGatewayService.getPaymentReference(order.paymentMethod, order);
  await order.save();
  try {
    const payment = await paymentGatewayService.getPaymentUrl(order.paymentMethod, order, req.ip);
    order.providerTransactionId = payment.transactionId;
    order.paymentUrl = payment.url;
    await order.save();
    res.status(201).json({ success: true, data: { order, paymentUrl: payment.url } });
  } catch (error) {
    // Keep the order/reference so a delayed provider notification can reconcile a request timeout.
    res.status(201).json({ success: true, data: { order, paymentUrl: null, paymentSetupFailed: true } });
  }
});
const momoIpn = asyncHandler(async (req, res) => {
  const result = await paymentGatewayService.processMomoCallback(req.body);
  res.status(200).json({ resultCode: result.ok ? 0 : 1, message: result.ok ? 'Success' : result.reason });
});
const zaloPayIpn = asyncHandler(async (req, res) => {
  const result = await paymentGatewayService.processZaloPayCallback(req.body);
  res.status(200).json({ return_code: result.ok ? 1 : 2, return_message: result.ok ? 'Success' : 'Invalid' });
});
const vnPayIpn = asyncHandler(async (req, res) => {
  try {
    const result = await paymentGatewayService.processVnPayCallback(req.query);
    const errors = { ORDER_NOT_FOUND: ['01', 'Order not found'], AMOUNT_MISMATCH: ['04', 'Invalid amount'], INVALID_SIGNATURE: ['97', 'Invalid signature'], INVALID_MERCHANT: ['97', 'Invalid merchant'], INVALID_DATA: ['99', 'Invalid data'], ORDER_EXPIRED: ['02', 'Order expired'], ORDER_NOT_PAYABLE: ['02', 'Order already confirmed'] };
    const [RspCode, Message] = result.ok ? (result.duplicate ? ['02', 'Order already confirmed'] : ['00', 'Confirm Success']) : (errors[result.reason] || ['99', 'Unknown error']);
    res.status(200).json({ RspCode, Message });
  } catch {
    // VNPay retries IPN when processing fails; do not acknowledge an uncommitted update.
    res.status(200).json({ RspCode: '99', Message: 'Unable to process notification' });
  }
});
const vnPayReturn = asyncHandler(async (req, res) => {
  const result = await paymentGatewayService.inspectVnPayReturn(req.query);
  const returnUrl = new URL(process.env.FITZY_PAYMENT_RETURN_URL || 'fitzy://payment-result');
  returnUrl.searchParams.set('gateway', 'vnpay');
  returnUrl.searchParams.set('status', result.ok ? 'pending' : 'invalid');
  // Never forward an order identifier from an unverified callback to the app.
  returnUrl.searchParams.delete('orderId');
  returnUrl.searchParams.delete('order');
  returnUrl.searchParams.delete('responseCode');
  if (result.ok) {
    returnUrl.searchParams.set('orderId', result.order.id);
    returnUrl.searchParams.set('order', result.order.orderNumber);
    returnUrl.searchParams.set('responseCode', req.query.vnp_ResponseCode);
  }
  res.redirect(302, returnUrl.toString());
});
const mine = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const [items, total] = await Promise.all([Order.find({ user: req.user.id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Order.countDocuments({ user: req.user.id })]);
  res.json({ success: true, data: pageResult(items, total, page, limit) });
});
const detail = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };
  const order = await Order.findOne(filter).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
  res.json({ success: true, data: { order } });
});
const cancel = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
  res.json({ success: true, data: { order: await orderService.cancelOrder(order, req.user.id) } });
});
const markPaid = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, paymentMethod: 'bank_transfer', paymentStatus: 'unpaid', status: { $ne: 'cancelled' } }, { $set: { paymentStatus: 'paid' } }, { new: true });
  if (!order) return res.status(409).json({ success: false, error: { code: 'PAYMENT_NOT_UPDATABLE', message: 'Order is not an unpaid bank transfer' } });
  res.json({ success: true, data: { order } });
});
const markRefunded = asyncHandler(async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, paymentMethod: { $in: ['bank_transfer', 'momo', 'zalopay', 'vnpay'] }, paymentStatus: 'paid' }, { $set: { paymentStatus: 'refunded' } }, { new: true });
  if (!order) return res.status(409).json({ success: false, error: { code: 'REFUND_NOT_UPDATABLE', message: 'Order is not an eligible paid order' } });
  res.json({ success: true, data: { order } });
});
const createReview = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, user: req.user.id, status: 'completed', 'items.product': req.params.productId });
  if (!order) return res.status(403).json({ success: false, error: { message: 'Only buyers with a completed order can review this product' } });
  const review = await Review.create({ product: req.params.productId, user: req.user.id, order: order._id, rating: req.body.rating, comment: req.body.comment || '' });
  res.status(201).json({ success: true, data: { review } });
});

module.exports = { create, momoIpn, zaloPayIpn, vnPayIpn, vnPayReturn, mine, detail, cancel, markPaid, markRefunded, createReview };
