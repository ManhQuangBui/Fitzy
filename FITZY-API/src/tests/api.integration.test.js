const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.GEMINI_API_KEY = '';
process.env.BANK_TRANSFER_BANK_NAME = 'Test Bank';
process.env.BANK_TRANSFER_ACCOUNT_NAME = 'FITZY TEST';
process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '1234567890';
process.env.MOMO_PARTNER_CODE = 'MOMO_TEST'; process.env.MOMO_ACCESS_KEY = 'momo-access-test'; process.env.MOMO_SECRET_KEY = 'momo-secret-test'; process.env.MOMO_IPN_URL = 'https://fitzy.example/api/payments/ipn/momo'; process.env.MOMO_REDIRECT_URL = 'fitzy://payment-result';
process.env.ZALOPAY_APP_ID = '2553'; process.env.ZALOPAY_KEY1 = 'zalo-key1-test'; process.env.ZALOPAY_KEY2 = 'zalo-key2-test'; process.env.ZALOPAY_CALLBACK_URL = 'https://fitzy.example/api/payments/ipn/zalopay'; process.env.ZALOPAY_REDIRECT_URL = 'fitzy://payment-result';
process.env.VNPAY_TMN_CODE = 'FITZYTEST'; process.env.VNPAY_HASH_SECRET = 'vnpay-secret-test'; process.env.VNPAY_RETURN_URL = 'https://fitzy.example/api/payments/return/vnpay'; process.env.VNPAY_IPN_URL = 'https://fitzy.example/api/payments/ipn/vnpay';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `fitzy-api-test-uploads-${process.pid}`);
let replicaSet; let app; let customerToken; let product; let variant; let adminUser; let placedOrder;
const { syncFirebaseUser } = require('../services/authService');

test.before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replicaSet.getUri());
  app = require('../app');
  const User = require('../models/User'); const Category = require('../models/Category'); const Product = require('../models/Product'); const Promotion = require('../models/Promotion');
  adminUser = await User.create({ name: 'Test Admin', email: 'admin@test.fitzy', passwordHash: 'not-a-login-hash', role: 'admin' });
  const category = await Category.create({ name: 'Test shirts', slug: 'test-shirts' });
  product = await Product.create({ name: 'Test T-shirt', slug: 'test-shirt', category: category._id, price: 100000, status: 'active', variants: [{ size: 'M', color: 'Black', quantity: 100 }] });
  variant = product.variants[0];
  await Promotion.create({ code: 'SAVE10', discountType: 'percent', discountValue: 10, minimumOrder: 0, startsAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 3600000), active: true });
});

test.after(async () => { await mongoose.disconnect(); await replicaSet?.stop(); await fs.rm(process.env.UPLOAD_DIR, { recursive: true, force: true }); });

test('auth validates registration, login, and rejects invalid credentials', async () => {
  const registered = await request(app).post('/api/auth/register').send({ name: 'Test Buyer', email: 'buyer@test.fitzy', password: 'secure-pass-123' });
  assert.equal(registered.status, 201);
  assert.equal(typeof registered.body.data.token, 'string');
  assert.equal(registered.body.data.user.passwordHash, undefined);
  customerToken = registered.body.data.token;
  const login = await request(app).post('/api/auth/login').send({ email: 'buyer@test.fitzy', password: 'secure-pass-123' });
  assert.equal(login.status, 200);
  assert.equal((await request(app).post('/api/auth/login').send({ email: 'buyer@test.fitzy', password: 'wrong-password' })).status, 401);
});

test('Firebase sync creates a customer profile once and does not expose Firebase identifiers', async () => {
  const claims = { uid: 'firebase-new-customer', email: 'firebase-buyer@test.fitzy', email_verified: false, name: 'Firebase Buyer' };
  const first = await syncFirebaseUser(claims);
  const repeated = await syncFirebaseUser(claims);
  assert.equal(first.id, repeated.id);
  assert.equal(first.role, 'customer');
  assert.equal(first.email, claims.email);
  assert.equal(first.toJSON().firebaseUid, undefined);
  assert.equal(first.toJSON().passwordHash, undefined);
  assert.equal(await mongoose.model('User').countDocuments({ email: claims.email }), 1);
});

test('Firebase sync links a verified existing admin without changing its role', async () => {
  await syncFirebaseUser({ uid: 'firebase-existing-admin', email: adminUser.email, email_verified: true }, 'Linked Admin');
  const linked = await mongoose.model('User').findById(adminUser.id).select('+firebaseUid +passwordHash');
  assert.equal(linked.firebaseUid, 'firebase-existing-admin');
  assert.equal(linked.role, 'admin');
  assert.equal(linked.passwordHash, 'not-a-login-hash');
});

test('Firebase sync requires verified email before linking and rejects conflicting identities', async () => {
  const User = mongoose.model('User');
  const legacy = await User.create({ name: 'Legacy Buyer', email: 'legacy-buyer@test.fitzy', passwordHash: 'legacy-hash', role: 'customer' });
  await assert.rejects(
    syncFirebaseUser({ uid: 'firebase-unverified-legacy', email: legacy.email, email_verified: false }),
    error => error.code === 'EMAIL_VERIFICATION_REQUIRED'
  );
  const untouched = await User.findById(legacy.id).select('+firebaseUid');
  assert.equal(untouched.firebaseUid, undefined);
  await assert.rejects(
    syncFirebaseUser({ uid: 'firebase-other-admin', email: adminUser.email, email_verified: true }),
    error => error.code === 'FIREBASE_ACCOUNT_CONFLICT'
  );
});

test('product listing is public, filterable, and paginated', async () => {
  const result = await request(app).get('/api/products?size=M&page=1&limit=5');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.items[0].slug, 'test-shirt');
  assert.equal(result.body.data.pagination.total, 1);
});

test('stylist fallback returns only in-stock database products and requires a session', async () => {
  const response = await request(app).post('/api/ai/stylist').set('Authorization', `Bearer ${customerToken}`).send({ occasion: 'casual', style: 'minimal', colors: 'Black', size: 'M', budget: 150000 });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.usedFallback, true);
  assert.ok(response.body.data.products.some(item => item._id === product.id));
  const denied = await request(app).post('/api/ai/stylist').send({ style: 'casual' });
  assert.equal(denied.status, 401);
});

test('customers cannot access admin endpoints', async () => {
  assert.equal((await request(app).get('/api/admin/products')).status, 401);
  const denied = await request(app).get('/api/admin/products').set('Authorization', `Bearer ${customerToken}`);
  assert.equal(denied.status, 403);
});

test('promotions are calculated on server and order creation reserves inventory', async () => {
  const check = await request(app).post('/api/promotions/check').set('Authorization', `Bearer ${customerToken}`).send({ code: 'SAVE10', items: [{ productId: product.id, variantId: variant.id, quantity: 1 }] });
  assert.equal(check.status, 200);
  assert.equal(check.body.data.discount, 10000);
  const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
    items: [{ productId: product.id, variantId: variant.id, quantity: 1, unitPrice: 1 }], promotionCode: 'SAVE10', paymentMethod: 'cod', total: 1,
    shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.data.order.subtotal, 100000);
  assert.equal(placed.body.data.order.total, 120000);
  placedOrder = placed.body.data.order;
  assert.deepEqual(placedOrder.statusHistory.map(event => event.status), ['pending']);
  const refreshed = await mongoose.model('Product').findById(product.id);
  assert.equal(refreshed.variants.id(variant.id).quantity, 99);
  await mongoose.model('Product').updateOne({ _id: product.id, 'variants._id': variant.id }, { $set: { 'variants.$.quantity': 0 } });
  const overstock = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({ items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' } });
  assert.equal(overstock.status, 409);
  await mongoose.model('Product').updateOne({ _id: product.id, 'variants._id': variant.id }, { $set: { 'variants.$.quantity': 99 } });
});

test('order ownership is enforced and cancellation restores stock', async () => {
  const other = await request(app).post('/api/auth/register').send({ name: 'Other Buyer', email: 'other@test.fitzy', password: 'secure-pass-456' });
  const otherToken = other.body.data.token;
  const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({ items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' } });
  assert.equal(placed.status, 201);
  const forbiddenRead = await request(app).get(`/api/orders/${placed.body.data.order._id}`).set('Authorization', `Bearer ${otherToken}`);
  assert.equal(forbiddenRead.status, 404);
  const otherOrders = await request(app).get('/api/orders').set('Authorization', `Bearer ${otherToken}`);
  assert.equal(otherOrders.status, 200);
  assert.equal(otherOrders.body.data.items.some(order => order._id === placed.body.data.order._id), false);
  const ownerDetail = await request(app).get(`/api/orders/${placed.body.data.order._id}`).set('Authorization', `Bearer ${customerToken}`);
  assert.equal(ownerDetail.status, 200);
  assert.equal(ownerDetail.body.data.order.user.email, 'buyer@test.fitzy');
  const cancelled = await request(app).post(`/api/orders/${placed.body.data.order._id}/cancel`).set('Authorization', `Bearer ${customerToken}`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.order.status, 'cancelled');
  const refreshed = await mongoose.model('Product').findById(product.id);
  assert.equal(refreshed.variants.id(variant.id).quantity, 99);
});

test('admin product CRUD validates categories and variants, populates category names, and records activity', async () => {
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${adminToken}` };
  const category = await mongoose.model('Category').create({ name: 'Admin apparel', slug: 'admin-apparel' });
  const hiddenCategory = await mongoose.model('Category').create({ name: 'Hidden apparel', slug: 'hidden-apparel', status: 'hidden' });
  const denied = await request(app).post('/api/admin/products').set('Authorization', `Bearer ${customerToken}`).send({ name: 'No access', category: category.id, price: 1000, variants: [{ size: 'M', color: 'Black', quantity: 1 }] });
  assert.equal(denied.status, 403);

  const created = await request(app).post('/api/admin/products').set(headers).send({ name: 'Admin polo', category: category.id, price: 120000, compareAtPrice: 150000, images: ['https://example.test/polo.jpg'], variants: [{ sku: 'POLO-M-BLK', size: 'M', color: 'Black', quantity: 3 }] });
  assert.equal(created.status, 201);
  const createdProduct = created.body.data.item;
  const invalidCategory = await request(app).post('/api/admin/products').set(headers).send({ name: 'Bad category', category: hiddenCategory.id, price: 1000, variants: [{ size: 'M', color: 'Black', quantity: 1 }] });
  assert.equal(invalidCategory.status, 400);
  const missingCategory = await request(app).post('/api/admin/products').set(headers).send({ name: 'Missing category', category: new mongoose.Types.ObjectId().toString(), price: 1000, variants: [{ size: 'M', color: 'Black', quantity: 1 }] });
  assert.equal(missingCategory.status, 400);
  const invalidInventory = await request(app).patch(`/api/admin/products/${createdProduct._id}`).set(headers).send({ variants: [{ ...createdProduct.variants[0], quantity: -1 }] });
  assert.equal(invalidInventory.status, 400);
  const missingReason = await request(app).patch(`/api/admin/products/${createdProduct._id}`).set(headers).send({ variants: [{ ...createdProduct.variants[0], quantity: 5 }] });
  assert.equal(missingReason.status, 400);

  const updated = await request(app).patch(`/api/admin/products/${createdProduct._id}`).set(headers).send({ price: 110000, variants: [{ ...createdProduct.variants[0], quantity: 5 }], inventoryReason: 'Nhập hàng bổ sung' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.item.variants[0].quantity, 5);
  const listed = await request(app).get('/api/admin/products?category=' + category.id).set(headers);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.items[0].category.name, category.name);
  assert.equal(listed.body.data.items[0].variants[0].sku, 'POLO-M-BLK');

  const activities = await request(app).get(`/api/admin/products/${createdProduct._id}/activity`).set(headers);
  assert.equal(activities.status, 200);
  assert.ok(activities.body.data.items.some(item => item.action === 'price_changed'));
  const stockActivity = activities.body.data.items.find(item => item.action === 'inventory_changed');
  assert.equal(stockActivity.reason, 'Nhập hàng bổ sung');
  assert.equal(stockActivity.actor._id, adminUser.id);
  assert.equal(stockActivity.changes[0].before, 3);
  assert.equal(stockActivity.changes[0].after, 5);
  assert.equal((await request(app).get(`/api/admin/products/${createdProduct._id}/activity`).set('Authorization', `Bearer ${customerToken}`)).status, 403);

  const hidden = await request(app).delete(`/api/admin/products/${createdProduct._id}`).set(headers);
  assert.equal(hidden.status, 200);
  const publicList = await request(app).get('/api/products?q=Admin%20polo');
  assert.equal(publicList.body.data.items.some(item => item._id === createdProduct._id), false);
  assert.equal((await request(app).get(`/api/products/${createdProduct._id}`)).status, 404);
  const hiddenList = await request(app).get('/api/admin/products?status=hidden').set(headers);
  assert.ok(hiddenList.body.data.items.some(item => item._id === createdProduct._id));
});

test('admin category CRUD and image upload enforce access and file constraints', async () => {
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${adminToken}` };
  const category = await request(app).post('/api/admin/categories').set(headers).send({ name: 'Temporary category', description: 'For API tests', status: 'active' });
  assert.equal(category.status, 201);
  const patched = await request(app).patch(`/api/admin/categories/${category.body.data.item._id}`).set(headers).send({ status: 'hidden' });
  assert.equal(patched.status, 200);
  const deniedUpload = await request(app).post('/api/admin/uploads').set('Authorization', `Bearer ${customerToken}`).attach('image', Buffer.from('fake'), { filename: 'image.png', contentType: 'image/png' });
  assert.equal(deniedUpload.status, 403);
  const upload = await request(app).post('/api/admin/uploads').set(headers).attach('image', Buffer.from('test-image'), { filename: 'image.png', contentType: 'image/png' });
  assert.equal(upload.status, 201);
  assert.match(upload.body.data.url, /\/uploads\//);
  const invalidUpload = await request(app).post('/api/admin/uploads').set(headers).attach('image', Buffer.from('test'), { filename: 'image.gif', contentType: 'image/gif' });
  assert.equal(invalidUpload.status, 400);
  assert.equal((await request(app).delete(`/api/admin/categories/${category.body.data.item._id}`).set(headers)).status, 200);
});

test('bank transfer is listed when configured and can be confirmed by an admin', async () => {
  const methods = await request(app).get('/api/payments/methods');
  assert.equal(methods.status, 200);
  assert.deepEqual(methods.body.data.methods.map(method => method.id), ['cod', 'bank_transfer', 'momo', 'zalopay', 'vnpay']);
  assert.equal(methods.body.data.methods[1].bankAccount.accountNumber, '1234567890');
  const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
    items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'bank_transfer',
    shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.body.data.order.paymentMethod, 'bank_transfer');
  assert.equal(placed.body.data.order.paymentStatus, 'unpaid');
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await request(app).patch(`/api/orders/${placed.body.data.order._id}/payment/confirm`).set('Authorization', `Bearer ${customerToken}`)).status, 403);
  const confirmed = await request(app).patch(`/api/orders/${placed.body.data.order._id}/payment/confirm`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.body.data.order.paymentStatus, 'paid');
  assert.equal((await request(app).patch(`/api/orders/${placed.body.data.order._id}/payment/confirm`).set('Authorization', `Bearer ${adminToken}`)).status, 409);
  assert.equal((await request(app).post(`/api/orders/${placed.body.data.order._id}/cancel`).set('Authorization', `Bearer ${customerToken}`)).status, 409);
  const refunded = await request(app).patch(`/api/orders/${placed.body.data.order._id}/payment/refund`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(refunded.status, 200);
  assert.equal(refunded.body.data.order.paymentStatus, 'refunded');
  const cancelled = await request(app).post(`/api/orders/${placed.body.data.order._id}/cancel`).set('Authorization', `Bearer ${customerToken}`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.data.order.status, 'cancelled');
  assert.equal(cancelled.body.data.order.statusHistory.at(-1).status, 'cancelled');
  assert.equal((await request(app).post(`/api/orders/${placed.body.data.order._id}/cancel`).set('Authorization', `Bearer ${customerToken}`)).status, 409);
});

test('MoMo checkout uses a signed provider request and accepts a signed IPN', async () => {
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.partnerCode, 'MOMO_TEST');
    assert.ok(sent.signature);
    return { ok: true, status: 200, json: async () => ({ resultCode: 0, payUrl: 'https://test-payment.momo.vn/pay/mock', transId: 89001 }) };
  };
  let placed;
  try {
    placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'momo',
      shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
    });
  } finally { global.fetch = originalFetch; }
  assert.equal(placed.status, 201);
  assert.equal(placed.body.data.paymentUrl, 'https://test-payment.momo.vn/pay/mock');
  const order = placed.body.data.order;
  const callback = { accessKey: process.env.MOMO_ACCESS_KEY, amount: order.total, extraData: '', message: 'Success', orderId: order.orderNumber, orderInfo: `Thanh toan don ${order.orderNumber}`, orderType: 'momo_wallet', partnerCode: process.env.MOMO_PARTNER_CODE, payType: 'webApp', requestId: order.providerTransactionId, responseTime: 1760000000000, resultCode: 0, transId: 89001 };
  const signData = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'].map(key => `${key}=${callback[key]}`).join('&');
  callback.signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(signData).digest('hex');
  const badAmount = { ...callback, amount: order.total + 1 };
  const badSignData = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'].map(key => `${key}=${badAmount[key]}`).join('&');
  badAmount.signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(badSignData).digest('hex');
  assert.equal((await request(app).post('/api/payments/ipn/momo').send(badAmount)).body.resultCode, 1);
  assert.equal((await mongoose.model('Order').findById(order._id)).paymentStatus, 'pending');
  const failedCallback = { ...callback, message: 'Payment cancelled by customer', resultCode: 1, transId: 0 };
  const failedSignData = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'].map(key => `${key}=${failedCallback[key]}`).join('&');
  failedCallback.signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(failedSignData).digest('hex');
  const failedPayment = await request(app).post('/api/payments/ipn/momo').send(failedCallback);
  assert.equal(failedPayment.body.resultCode, 0);
  const failedOrder = await mongoose.model('Order').findById(order._id);
  assert.equal(failedOrder.paymentStatus, 'failed');
  assert.equal(failedOrder.providerTransactionId, callback.requestId);
  assert.equal(failedOrder.paymentUrl, 'https://test-payment.momo.vn/pay/mock');
  const notified = await request(app).post('/api/payments/ipn/momo').send(callback);
  assert.equal(notified.body.resultCode, 0);
  const duplicate = await request(app).post('/api/payments/ipn/momo').send(callback);
  assert.equal(duplicate.body.resultCode, 0);
  assert.equal((await mongoose.model('Order').findById(order._id)).paymentStatus, 'paid');
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refunded = await request(app).patch(`/api/orders/${order._id}/payment/refund`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(refunded.body.data.order.paymentStatus, 'refunded');
  assert.equal((await request(app).patch(`/api/orders/${order._id}/payment/refund`).set('Authorization', `Bearer ${adminToken}`)).status, 409);
  const cancelled = await request(app).post(`/api/orders/${order._id}/cancel`).set('Authorization', `Bearer ${customerToken}`);
  assert.equal(cancelled.body.data.order.status, 'cancelled');
});

test('unpaid orders cannot be refunded; expired online payments release reserved stock and reject late success', async () => {
  const Order = mongoose.model('Order');
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const unpaid = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
    items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'bank_transfer',
    shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
  });
  assert.equal((await request(app).patch(`/api/orders/${unpaid.body.data.order._id}/payment/refund`).set('Authorization', `Bearer ${adminToken}`)).status, 409);

  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ resultCode: 0, payUrl: 'https://test-payment.momo.vn/pay/expiry', transId: 99001 }) });
  let placed;
  try {
    placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'momo',
      shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
    });
  } finally { global.fetch = originalFetch; }
  assert.equal(placed.status, 201);
  const order = await Order.findById(placed.body.data.order._id);
  const reservedQuantity = (await mongoose.model('Product').findById(product.id)).variants.id(variant.id).quantity;
  assert.ok(order.paymentExpiresAt instanceof Date);
  order.paymentExpiresAt = new Date(Date.now() - 1000);
  await order.save();
  const expiredCount = await require('../services/orderService').expirePendingPaymentOrders();
  assert.equal(expiredCount, 1);
  const expired = await Order.findById(order._id);
  assert.equal(expired.status, 'cancelled');
  assert.equal(expired.paymentStatus, 'expired');
  assert.equal(expired.statusHistory.at(-1).status, 'cancelled');
  const inventory = await mongoose.model('Product').findById(product.id);
  assert.equal(inventory.variants.id(variant.id).quantity, reservedQuantity + 1);
  const lateCallback = {
    accessKey: process.env.MOMO_ACCESS_KEY, amount: expired.total, extraData: '', message: 'Success', orderId: expired.orderNumber,
    orderInfo: `Thanh toan don ${expired.orderNumber}`, orderType: 'momo_wallet', partnerCode: process.env.MOMO_PARTNER_CODE, payType: 'webApp',
    requestId: expired.providerTransactionId, responseTime: Date.now(), resultCode: 0, transId: 99001
  };
  const lateSignData = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'].map(key => `${key}=${lateCallback[key]}`).join('&');
  lateCallback.signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(lateSignData).digest('hex');
  const latePayment = await require('../services/paymentGatewayService').processMomoCallback(lateCallback);
  assert.equal(latePayment.ok, false);
  assert.equal(latePayment.reason, 'ORDER_EXPIRED');
});

test('a gateway request timeout keeps its reference so a later MoMo IPN can reconcile payment', async () => {
  const Order = mongoose.model('Order');
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('simulated connection timeout'); };
  let response;
  try {
    response = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'momo',
      shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
    });
  } finally { global.fetch = originalFetch; }
  assert.equal(response.status, 201);
  assert.equal(response.body.data.paymentSetupFailed, true);
  const order = response.body.data.order;
  assert.equal(order.paymentStatus, 'pending');
  assert.ok(order.providerTransactionId);
  const callback = { accessKey: process.env.MOMO_ACCESS_KEY, amount: order.total, extraData: '', message: 'Success', orderId: order.orderNumber, orderInfo: `Thanh toan don ${order.orderNumber}`, orderType: 'momo_wallet', partnerCode: process.env.MOMO_PARTNER_CODE, payType: 'webApp', requestId: order.providerTransactionId, responseTime: Date.now(), resultCode: 0, transId: 99101 };
  const signData = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'].map(key => `${key}=${callback[key]}`).join('&');
  callback.signature = crypto.createHmac('sha256', process.env.MOMO_SECRET_KEY).update(signData).digest('hex');
  const notified = await request(app).post('/api/payments/ipn/momo').send(callback);
  assert.equal(notified.body.resultCode, 0);
  assert.equal((await Order.findById(order._id)).paymentStatus, 'paid');
});

test('cancellation rejects stale order data if payment became paid before the cancel transaction', async () => {
  const Order = mongoose.model('Order');
  const placed = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
    items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'bank_transfer',
    shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
  });
  const staleOrder = await Order.findById(placed.body.data.order._id);
  await Order.updateOne({ _id: staleOrder._id }, { $set: { paymentStatus: 'paid' } });
  const quantityAfterOrder = (await mongoose.model('Product').findById(product.id)).variants.id(variant.id).quantity;
  await assert.rejects(require('../services/orderService').cancelOrder(staleOrder, staleOrder.user.toString()), error => error.code === 'CANCEL_NOT_ALLOWED');
  const current = await Order.findById(staleOrder._id);
  assert.equal(current.paymentStatus, 'paid');
  assert.equal(current.status, 'pending');
  assert.equal((await mongoose.model('Product').findById(product.id)).variants.id(variant.id).quantity, quantityAfterOrder);
});

test('ZaloPay and VNPay create signed payments and verify signed callbacks', async () => {
  const Order = mongoose.model('Order');
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    const sign = `${sent.app_id}|${sent.app_trans_id}|${sent.app_user}|${sent.amount}|${sent.app_time}|${sent.embed_data}|${sent.item}`;
    assert.equal(sent.mac, crypto.createHmac('sha256', process.env.ZALOPAY_KEY1).update(sign).digest('hex'));
    return { ok: true, status: 200, json: async () => ({ return_code: 1, order_url: 'https://qcgateway.zalopay.vn/openinapp?mock=1' }) };
  };
  let zaloPlaced;
  try {
    zaloPlaced = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
      items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'zalopay',
      shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
    });
  } finally { global.fetch = originalFetch; }
  assert.equal(zaloPlaced.status, 201);
  assert.equal(zaloPlaced.body.data.paymentUrl, 'https://qcgateway.zalopay.vn/openinapp?mock=1');
  const zaloOrder = zaloPlaced.body.data.order;
  const zaloData = JSON.stringify({ app_id: 2553, app_trans_id: zaloOrder.providerTransactionId, amount: zaloOrder.total, zp_trans_id: 77701 });
  const zaloMac = crypto.createHmac('sha256', process.env.ZALOPAY_KEY2).update(zaloData).digest('hex');
  const wrongZaloData = JSON.stringify({ app_id: 2553, app_trans_id: zaloOrder.providerTransactionId, amount: zaloOrder.total + 1, zp_trans_id: 77701 });
  const wrongZaloMac = crypto.createHmac('sha256', process.env.ZALOPAY_KEY2).update(wrongZaloData).digest('hex');
  const wrongZaloCallback = await request(app).post('/api/payments/ipn/zalopay').send({ data: wrongZaloData, mac: wrongZaloMac, type: 1 });
  assert.equal(wrongZaloCallback.body.return_code, 2);
  assert.equal((await Order.findById(zaloOrder._id)).paymentStatus, 'pending');
  const zaloCallback = await request(app).post('/api/payments/ipn/zalopay').send({ data: zaloData, mac: zaloMac, type: 1 });
  assert.equal(zaloCallback.body.return_code, 1);
  assert.equal((await Order.findById(zaloOrder._id)).paymentStatus, 'paid');
  assert.equal((await request(app).post('/api/payments/ipn/zalopay').send({ data: zaloData, mac: zaloMac, type: 1 })).body.return_code, 1);

  const vnPlaced = await request(app).post('/api/orders').set('Authorization', `Bearer ${customerToken}`).send({
    items: [{ productId: product.id, variantId: variant.id, quantity: 1 }], paymentMethod: 'vnpay',
    shipping: { recipient: 'Test Buyer', phone: '0912345678', line1: '12 Test Street', district: 'District 1', city: 'Ho Chi Minh City' }
  });
  assert.equal(vnPlaced.status, 201);
  const vnOrder = vnPlaced.body.data.order;
  const params = Object.fromEntries(new URL(vnPlaced.body.data.paymentUrl).searchParams.entries());
  params.vnp_ResponseCode = '24'; params.vnp_TransactionStatus = '02'; params.vnp_TransactionNo = '0';
  let unsigned = Object.fromEntries(Object.entries(params).filter(([key]) => !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
  params.vnp_SecureHash = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(require('node:querystring').stringify(unsigned, undefined, undefined, { encodeURIComponent: value => value })).digest('hex');
  const vnCancelled = await request(app).get('/api/payments/ipn/vnpay').query(params);
  assert.equal(vnCancelled.body.RspCode, '00');
  assert.equal((await Order.findById(vnOrder._id)).paymentStatus, 'failed');
  params.vnp_ResponseCode = '00'; params.vnp_TransactionStatus = '00'; params.vnp_TransactionNo = '88002';
  unsigned = Object.fromEntries(Object.entries(params).filter(([key]) => !['vnp_SecureHash', 'vnp_SecureHashType'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
  params.vnp_SecureHash = crypto.createHmac('sha512', process.env.VNPAY_HASH_SECRET).update(require('node:querystring').stringify(unsigned, undefined, undefined, { encodeURIComponent: value => value })).digest('hex');
  const vnCallback = await request(app).get('/api/payments/ipn/vnpay').query(params);
  assert.equal(vnCallback.body.RspCode, '00');
  assert.equal((await Order.findById(vnOrder._id)).paymentStatus, 'paid');
  assert.equal((await request(app).get('/api/payments/ipn/vnpay').query(params)).body.RspCode, '00');
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  assert.equal((await request(app).patch(`/api/orders/${vnOrder._id}/payment/refund`).set('Authorization', `Bearer ${adminToken}`)).status, 200);
  assert.equal((await request(app).post(`/api/orders/${vnOrder._id}/cancel`).set('Authorization', `Bearer ${customerToken}`)).status, 200);
});

test('order status history records supported transitions and only delivered orders permit reviews', async () => {
  const adminToken = require('jsonwebtoken').sign({ sub: adminUser.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const skip = await request(app).patch(`/api/orders/${placedOrder._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'shipping' });
  assert.equal(skip.status, 409);
  const beforeCompletion = await request(app).post(`/api/products/${product.id}/reviews`).set('Authorization', `Bearer ${customerToken}`).send({ orderId: placedOrder._id, rating: 5, comment: 'Good fit' });
  assert.equal(beforeCompletion.status, 403);
  for (const [status, note] of [['confirmed'], ['preparing', 'Đang gói hàng.'], ['shipping'], ['delivery_failed'], ['shipping'], ['completed']]) {
    const transition = await request(app).patch(`/api/orders/${placedOrder._id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status, ...(note ? { note } : {}) });
    assert.equal(transition.status, 200);
  }
  const completed = await mongoose.model('Order').findById(placedOrder._id);
  assert.equal(completed.paymentStatus, 'paid');
  assert.deepEqual(completed.statusHistory.map(event => event.status), ['pending', 'confirmed', 'preparing', 'shipping', 'delivery_failed', 'shipping', 'completed']);
  assert.equal(completed.statusHistory[2].note, 'Đang gói hàng.');
  assert.ok(completed.statusHistory.every(event => event.at instanceof Date));
  assert.equal((await request(app).post(`/api/orders/${placedOrder._id}/cancel`).set('Authorization', `Bearer ${customerToken}`)).status, 409);
  const validReview = await request(app).post(`/api/products/${product.id}/reviews`).set('Authorization', `Bearer ${customerToken}`).send({ orderId: placedOrder._id, rating: 5, comment: 'Good fit' });
  assert.equal(validReview.status, 201);
  const reviewId = validReview.body.data.review._id;
  const edited = await request(app).patch(`/api/reviews/${reviewId}`).set('Authorization', `Bearer ${customerToken}`).send({ rating: 4, comment: 'Still good' });
  assert.equal(edited.status, 200);
  const stats = await request(app).get('/api/stats').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(stats.body.data.revenue, 120000);
  const refreshed = await mongoose.model('Product').findById(product.id);
  assert.equal(refreshed.salesCount, 1);
});
