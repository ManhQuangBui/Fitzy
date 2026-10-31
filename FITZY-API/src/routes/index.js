const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { asyncHandler } = require('../utils/errors');
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const resources = require('../controllers/resourceController');
const stylistService = require('../integrations/gemini/stylistService');
const Promotion = require('../models/Promotion');
const Product = require('../models/Product');
const { calculateDiscount, getBankTransferDetails } = require('../services/orderService');
const paymentGatewayService = require('../services/paymentGatewayService');
const { orderRules } = require('../validators/orderValidators');
const stylistRules = require('../validators/stylistValidators');

const router = express.Router();
const admin = [auth.requireAuth, auth.requireAdmin];
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } } });
const firebaseExchangeLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } } });
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/health', (req, res) => res.json({ success: true, data: { service: 'fitzy-api', status: 'ok' } }));
router.get('/payments/methods', (req, res) => {
  const methods = [{ id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán tiền mặt khi nhận được đơn hàng.' }];
  const bankTransfer = getBankTransferDetails();
  if (bankTransfer) methods.push({ id: 'bank_transfer', name: 'Chuyển khoản ngân hàng', description: 'Chuyển khoản theo thông tin bên dưới; cửa hàng sẽ xác nhận thủ công.', bankAccount: bankTransfer });
  methods.push(...paymentGatewayService.enabledProviders());
  res.json({ success: true, data: { methods } });
});
router.post('/payments/ipn/momo', orderController.momoIpn);
router.post('/payments/ipn/zalopay', orderController.zaloPayIpn);
router.get('/payments/ipn/vnpay', orderController.vnPayIpn);
router.get('/payments/return/vnpay', orderController.vnPayReturn);
router.post('/auth/register', authController.registerRules, validate, authController.register);
router.post('/auth/login', loginLimit, authController.loginRules, validate, authController.login);
router.post('/auth/firebase/exchange', firebaseExchangeLimit, [body('idToken').isString().isLength({ min: 1, max: 8192 }), body('name').optional().isString().isLength({ max: 80 })], validate, authController.exchangeFirebase);
router.get('/users/me', auth.requireAuth, authController.me);
router.patch('/users/me', auth.requireAuth, authController.updateMe);

router.get('/categories', resources.publicCategories);
router.get('/products', productController.list);
router.get('/products/:id', productController.detail);
router.get('/posts', resources.publicPosts);
router.get('/posts/:slug', resources.publicPostDetail);

router.post('/orders', auth.requireAuth, orderRules, validate, orderController.create);
router.patch('/orders/:id/payment/confirm', admin, [param('id').isMongoId()], validate, orderController.markPaid);
router.patch('/orders/:id/payment/refund', admin, [param('id').isMongoId()], validate, orderController.markRefunded);
router.get('/orders', auth.requireAuth, orderController.mine);
router.get('/orders/admin/list', admin, resources.adminOrders);
router.get('/orders/:id', auth.requireAuth, [param('id').isMongoId()], validate, orderController.detail);
router.post('/orders/:id/cancel', auth.requireAuth, [param('id').isMongoId()], validate, orderController.cancel);
router.post('/products/:productId/reviews', auth.requireAuth, [body('rating').isInt({ min: 1, max: 5 }), body('orderId').isMongoId(), body('comment').optional().isString().isLength({ max: 1200 })], validate, resources.createReview);
router.patch('/reviews/:id', auth.requireAuth, resources.ownReviewUpdate);
router.delete('/reviews/:id', auth.requireAuth, resources.ownReviewDelete);
router.get('/favorites', auth.requireAuth, resources.favoritesList);
router.post('/favorites/:productId', auth.requireAuth, resources.favoriteAdd);
router.delete('/favorites/:productId', auth.requireAuth, resources.favoriteRemove);

router.post('/promotions/check', auth.requireAuth, [body('code').isString().trim().notEmpty(), body('items').isArray({ min: 1 })], validate, asyncHandler(async (req, res) => {
  const code = req.body.code.toUpperCase(); const now = new Date();
  const promotion = await Promotion.findOne({ code, active: true, startsAt: { $lte: now }, endsAt: { $gte: now }, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] });
  if (!promotion) return res.status(400).json({ success: false, error: { code: 'PROMOTION_INVALID', message: 'Promotion code is invalid or expired' } });
  let subtotal = 0;
  for (const line of req.body.items) {
    const product = await Product.findOne({ _id: line.productId, status: 'active' }); const variant = product?.variants.id(line.variantId);
    if (!product || !variant || !variant.isActive || variant.quantity < Number(line.quantity)) return res.status(409).json({ success: false, error: { message: 'An item in your cart is unavailable' } });
    subtotal += product.price * Number(line.quantity);
  }
  if (subtotal < promotion.minimumOrder) return res.status(400).json({ success: false, error: { message: `Minimum order is ${promotion.minimumOrder}` } });
  res.json({ success: true, data: { code, discount: calculateDiscount(promotion, subtotal), subtotal } });
}));
router.post('/ai/stylist', auth.requireAuth, aiLimit, stylistRules, validate, asyncHandler(async (req, res) => res.json({ success: true, data: await stylistService.advise(req.body) })));

router.get('/users', admin, resources.customers);
router.get('/users/:id', admin, resources.customerDetail);
router.patch('/users/:id/block', admin, [body('isBlocked').isBoolean()], validate, resources.blockCustomer);
router.patch('/orders/:id/status', admin, [param('id').isMongoId(), body('status').isIn(['pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled', 'delivery_failed']), body('note').optional().isString().trim().isLength({ max: 500 })], validate, resources.changeAdminOrderStatus);
router.get('/reviews/admin/list', admin, resources.adminReviews);
router.patch('/reviews/:id/moderate', admin, [body('status').isIn(['visible', 'hidden'])], validate, resources.moderateReview);
router.get('/stats', admin, resources.stats);
router.get('/admin/products/:id/activity', admin, [param('id').isMongoId()], validate, resources.productActivity);

for (const kind of ['categories', 'products', 'posts', 'promotions']) {
  router.get(`/admin/${kind}`, admin, resources.adminList(kind));
  router.post(`/admin/${kind}`, admin, resources.adminCreate(kind));
  router.patch(`/admin/${kind}/:id`, admin, [param('id').isMongoId()], validate, resources.adminUpdate(kind));
  router.delete(`/admin/${kind}/:id`, admin, [param('id').isMongoId()], validate, resources.adminDelete(kind));
}

const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({ destination: uploadDir, filename: (req, file, callback) => callback(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024 }, fileFilter: (req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) });
router.post('/admin/uploads', admin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { message: 'Choose a JPG, PNG or WebP image under 4 MB' } });
  res.status(201).json({ success: true, data: { url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` } });
});

module.exports = router;
