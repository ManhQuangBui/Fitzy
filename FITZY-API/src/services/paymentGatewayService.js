const crypto = require('node:crypto');
const querystring = require('node:querystring');
const Order = require('../models/Order');

const providers = {
  momo: {
    label: 'MoMo',
    config: () => ({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      accessKey: process.env.MOMO_ACCESS_KEY,
      secretKey: process.env.MOMO_SECRET_KEY,
      ipnUrl: process.env.MOMO_IPN_URL,
      redirectUrl: process.env.MOMO_REDIRECT_URL || process.env.FITZY_PAYMENT_RETURN_URL,
      endpoint: process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create'
    }),
    enabled: config => config.partnerCode && config.accessKey && config.secretKey && config.ipnUrl && config.redirectUrl
  },
  zalopay: {
    label: 'ZaloPay',
    config: () => ({
      appId: process.env.ZALOPAY_APP_ID,
      key1: process.env.ZALOPAY_KEY1,
      key2: process.env.ZALOPAY_KEY2,
      callbackUrl: process.env.ZALOPAY_CALLBACK_URL,
      redirectUrl: process.env.ZALOPAY_REDIRECT_URL || process.env.FITZY_PAYMENT_RETURN_URL,
      endpoint: process.env.ZALOPAY_API_URL || 'https://sb-openapi.zalopay.vn/v2/create'
    }),
    enabled: config => config.appId && config.key1 && config.key2 && config.callbackUrl && config.redirectUrl
  },
  vnpay: {
    label: 'VNPay',
    config: () => ({
      tmnCode: process.env.VNPAY_TMN_CODE,
      hashSecret: process.env.VNPAY_HASH_SECRET,
      paymentUrl: process.env.VNPAY_PAYMENT_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: process.env.VNPAY_RETURN_URL,
      ipnConfigured: process.env.VNPAY_IPN_URL
    }),
    enabled: config => config.tmnCode && config.hashSecret && config.returnUrl && config.ipnConfigured
  }
};

function enabledProviders() {
  return Object.entries(providers).filter(([, provider]) => provider.enabled(provider.config())).map(([id, provider]) => ({
    id,
    name: provider.label,
    description: id === 'vnpay' ? 'Thanh toán qua VNPay: ví, QR, thẻ và ngân hàng theo hợp đồng merchant.' : `Thanh toán qua ${provider.label}; phương thức cụ thể theo hợp đồng merchant.`,
    kind: 'gateway'
  }));
}

function hmac(algorithm, key, message) {
  return crypto.createHmac(algorithm, key).update(message, 'utf8').digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function postJson(url, payload) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Payment provider returned HTTP ${response.status}`);
  return data;
}

function getPaymentUrl(providerId, order, ipAddress) {
  const config = providers[providerId]?.config();
  if (!config || !providers[providerId].enabled(config)) throw new Error(`${providers[providerId]?.label || 'Payment method'} is not configured`);
  if (providerId === 'momo') return createMomoPayment(order, config);
  if (providerId === 'zalopay') return createZaloPayPayment(order, config);
  return createVnPayPayment(order, config, ipAddress);
}

function getPaymentReference(providerId, order) {
  if (providerId === 'momo') return `${order.orderNumber}-${new Date(order.createdAt || Date.now()).getTime()}`;
  if (providerId === 'zalopay') {
    const date = new Date(order.createdAt || Date.now());
    const transDate = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    return `${transDate}_${order.orderNumber}`;
  }
  if (providerId === 'vnpay') return order.orderNumber;
  throw new Error('Unsupported payment provider');
}

async function createMomoPayment(order, config) {
  const requestId = order.providerTransactionId || getPaymentReference('momo', order);
  const payload = { partnerCode: config.partnerCode, requestId, amount: order.total, orderId: order.orderNumber, orderInfo: `Thanh toan don ${order.orderNumber}`, redirectUrl: config.redirectUrl, ipnUrl: config.ipnUrl, requestType: 'payWithMethod', extraData: '', lang: 'vi', orderExpireTime: 15 };
  const signData = `accessKey=${config.accessKey}&amount=${payload.amount}&extraData=${payload.extraData}&ipnUrl=${payload.ipnUrl}&orderId=${payload.orderId}&orderInfo=${payload.orderInfo}&partnerCode=${payload.partnerCode}&redirectUrl=${payload.redirectUrl}&requestId=${payload.requestId}&requestType=${payload.requestType}`;
  payload.signature = hmac('sha256', config.secretKey, signData);
  const response = await postJson(config.endpoint, payload);
  if (Number(response.resultCode) !== 0 || !response.payUrl) throw new Error(response.message || 'MoMo không tạo được giao dịch');
  // MoMo IPN always carries requestId; persist it for callback/order correlation.
  return { url: response.payUrl, transactionId: requestId };
}

async function createZaloPayPayment(order, config) {
  const now = Date.now(); const appTime = now; const date = new Date(now); const transDate = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const appTransId = order.providerTransactionId || `${transDate}_${order.orderNumber}`; const appUser = order.user.toString(); const item = '[]';
  const embedData = JSON.stringify({ redirecturl: config.redirectUrl });
  const payload = { app_id: Number(config.appId), app_user: appUser, app_time: appTime, amount: order.total, app_trans_id: appTransId, embed_data: embedData, item, description: `Thanh toan don ${order.orderNumber}`, callback_url: config.callbackUrl, bank_code: '', mac: '' };
  const signData = `${payload.app_id}|${payload.app_trans_id}|${payload.app_user}|${payload.amount}|${payload.app_time}|${payload.embed_data}|${payload.item}`;
  payload.mac = hmac('sha256', config.key1, signData);
  const response = await postJson(config.endpoint, payload);
  if (response.return_code !== 1 || !response.order_url) throw new Error(response.return_message || 'ZaloPay không tạo được giao dịch');
  return { url: response.order_url, transactionId: appTransId };
}

function createVnPayPayment(order, config, ipAddress = '127.0.0.1') {
  const now = new Date();
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  const params = {
    vnp_Amount: String(order.total * 100), vnp_Command: 'pay', vnp_CreateDate: `${local.year}${local.month}${local.day}${local.hour}${local.minute}${local.second}`,
    vnp_CurrCode: 'VND', vnp_IpAddr: ipAddress.replace(/^::ffff:/, '').slice(0, 45), vnp_Locale: 'vn', vnp_OrderInfo: `Thanh toan don ${order.orderNumber}`,
    vnp_OrderType: 'other', vnp_ReturnUrl: config.returnUrl, vnp_TmnCode: config.tmnCode, vnp_TxnRef: order.orderNumber, vnp_Version: '2.1.0'
  };
  const sorted = Object.fromEntries(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
  const signData = querystring.stringify(sorted, undefined, undefined, { encodeURIComponent: value => value });
  const signature = hmac('sha512', config.hashSecret, signData);
  const query = new URLSearchParams({ ...sorted, vnp_SecureHash: signature }).toString();
  return { url: `${config.paymentUrl}?${query}`, transactionId: order.orderNumber };
}

function verifyMomoCallback(payload) {
  const config = providers.momo.config();
  if (!providers.momo.enabled(config)) return false;
  const fields = ['accessKey', 'amount', 'extraData', 'message', 'orderId', 'orderInfo', 'orderType', 'partnerCode', 'payType', 'requestId', 'responseTime', 'resultCode', 'transId'];
  const signData = fields.map(key => `${key}=${payload[key] ?? ''}`).join('&');
  return safeEqual(hmac('sha256', config.secretKey, signData), payload.signature);
}

function verifyZaloPayCallback(payload) {
  const config = providers.zalopay.config();
  if (!providers.zalopay.enabled(config) || typeof payload.data !== 'string') return false;
  return safeEqual(hmac('sha256', config.key2, payload.data), payload.mac);
}

function verifyVnPayCallback(query) {
  const config = providers.vnpay.config();
  if (!providers.vnpay.enabled(config) || !query.vnp_SecureHash) return false;
  const { vnp_SecureHash, vnp_SecureHashType, ...unsigned } = query;
  const sorted = Object.fromEntries(Object.entries(unsigned).sort(([a], [b]) => a.localeCompare(b)));
  return safeEqual(hmac('sha512', config.hashSecret, querystring.stringify(sorted, undefined, undefined, { encodeURIComponent: value => value })), vnp_SecureHash);
}

async function recordProviderResult({ provider, orderNumber, amount, success }) {
  const method = provider;
  const order = await Order.findOne({ orderNumber, paymentMethod: method });
  if (!order) return { ok: false, reason: 'ORDER_NOT_FOUND' };
  if (Number(amount) !== Number(order.total)) return { ok: false, reason: 'AMOUNT_MISMATCH' };
  if (order.paymentStatus === 'paid') return { ok: true, duplicate: true };
  if (order.paymentExpiresAt && order.paymentExpiresAt <= new Date()) return { ok: false, reason: 'ORDER_EXPIRED' };
  if (order.status === 'cancelled' || !['pending', 'failed', 'unpaid'].includes(order.paymentStatus)) return { ok: false, reason: 'ORDER_NOT_PAYABLE' };
  const paymentStatus = success ? 'paid' : 'failed';
  const updated = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: { $in: ['pending', 'failed', 'unpaid'] }, status: { $ne: 'cancelled' }, $or: [{ paymentExpiresAt: null }, { paymentExpiresAt: { $gt: new Date() } }] }, { $set: { paymentStatus, ...(success ? { paymentUrl: '' } : {}) } }, { new: true });
  return updated ? { ok: true, order: updated } : { ok: false, reason: 'ORDER_NOT_PAYABLE' };
}

async function processMomoCallback(payload) {
  if (!verifyMomoCallback(payload)) return { ok: false, reason: 'INVALID_SIGNATURE' };
  const order = await Order.findOne({ orderNumber: payload.orderId, paymentMethod: 'momo' });
  if (!order || ![String(payload.requestId), String(payload.transId)].includes(String(order.providerTransactionId))) return { ok: false, reason: 'ORDER_NOT_FOUND' };
  return recordProviderResult({ provider: 'momo', orderNumber: payload.orderId, amount: payload.amount, success: Number(payload.resultCode) === 0, transactionId: payload.transId });
}

async function processZaloPayCallback(payload) {
  if (!verifyZaloPayCallback(payload)) return { ok: false, reason: 'INVALID_SIGNATURE' };
  let data;
  try { data = JSON.parse(payload.data); } catch { return { ok: false, reason: 'INVALID_DATA' }; }
  const orderNumber = String(data.app_trans_id || '').split('_').slice(1).join('_');
  const order = await Order.findOne({ paymentMethod: 'zalopay', orderNumber, providerTransactionId: data.app_trans_id });
  if (!order || Number(data.app_id) !== Number(providers.zalopay.config().appId)) return { ok: false, reason: 'ORDER_NOT_FOUND' };
  return recordProviderResult({ provider: 'zalopay', orderNumber: order.orderNumber, amount: data.amount, success: true, transactionId: data.zp_trans_id });
}

async function processVnPayCallback(query) {
  if (!verifyVnPayCallback(query)) return { ok: false, reason: 'INVALID_SIGNATURE' };
  return recordProviderResult({ provider: 'vnpay', orderNumber: query.vnp_TxnRef, amount: Number(query.vnp_Amount) / 100, success: query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00', transactionId: query.vnp_TransactionNo });
}

module.exports = { enabledProviders, getPaymentUrl, getPaymentReference, createVnPayPayment, verifyMomoCallback, verifyZaloPayCallback, verifyVnPayCallback, processMomoCallback, processZaloPayCallback, processVnPayCallback };
