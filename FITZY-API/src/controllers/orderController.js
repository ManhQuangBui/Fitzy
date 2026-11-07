const crypto = require('node:crypto');
const querystring = require('node:querystring');
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
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const payment = await paymentGatewayService.getPaymentUrl(order.paymentMethod, order, req.ip, baseUrl);
    order.providerTransactionId = payment.transactionId;
    order.paymentUrl = payment.url;
    await order.save();
    res.status(201).json({ success: true, data: { order, paymentUrl: payment.url } });
  } catch (error) {

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
  const result = await paymentGatewayService.processVnPayCallback(req.query);
  res.status(200).json({ RspCode: result.ok ? '00' : result.reason === 'ORDER_NOT_FOUND' ? '01' : '97', Message: result.ok ? 'Confirm Success' : 'Invalid signature or order' });
});
const vnPayReturn = asyncHandler(async (req, res) => {
  const result = await paymentGatewayService.processVnPayCallback(req.query);
  const returnUrl = process.env.FITZY_PAYMENT_RETURN_URL || 'fitzy://payment-result';
  const orderNumber = encodeURIComponent(req.query.vnp_TxnRef || '');
  const status = result.ok && req.query.vnp_ResponseCode === '00' ? 'success' : 'failed';
  const appRedirectUrl = `${returnUrl}?gateway=vnpay&order=${orderNumber}&status=${status}`;

  if (returnUrl.startsWith('http://') || returnUrl.startsWith('https://')) {
    return res.redirect(302, appRedirectUrl);
  }

  const isSuccess = status === 'success';
  const amountNumber = Number(req.query.vnp_Amount) / 100;
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountNumber || 0);

  res.removeHeader('Content-Security-Policy');
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kết Quả Thanh Toán · FITZY Store</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #1e293b; padding: 20px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .card { width: 100%; max-width: 480px; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08); padding: 32px 24px; text-align: center; border: 1px solid #e2e8f0; }
    .icon-box { width: 64px; height: 64px; border-radius: 32px; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 16px; background: ${isSuccess ? '#ecfdf5' : '#fef2f2'}; color: ${isSuccess ? '#059669' : '#dc2626'}; }
    h2 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
    .info-list { background: #f8fafc; border-radius: 14px; padding: 16px; margin-bottom: 24px; font-size: 13px; text-align: left; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-row span:first-child { color: #64748b; }
    .info-row span:last-child { font-weight: 700; color: #0f172a; }
    .btn { display: block; width: 100%; padding: 14px 20px; border-radius: 12px; font-size: 15px; font-weight: 700; text-decoration: none; text-align: center; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #005baa; color: #ffffff; }
    .btn-primary:hover { background: #004d91; }
    .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; margin-bottom: 0; }
    .btn-secondary:hover { background: #e2e8f0; }
    .notice { font-size: 11px; color: #94a3b8; margin-top: 16px; }
  </style>
  <script>
    setTimeout(function() {
      try { window.location.href = "${appRedirectUrl}"; } catch (e) {}
    }, 400);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon-box">${isSuccess ? '✓' : '✕'}</div>
    <h2>${isSuccess ? 'Thanh toán thành công qua VNPay' : 'Thanh toán chưa hoàn tất'}</h2>
    <p class="desc">${isSuccess ? 'Đơn hàng của bạn đã được thanh toán và ghi nhận trên hệ thống.' : 'Giao dịch bị hủy hoặc không thành công. Bạn có thể thử lại từ ứng dụng.'}</p>
    <div class="info-list">
      <div class="info-row"><span>Mã đơn hàng:</span> <span>${req.query.vnp_TxnRef || '—'}</span></div>
      <div class="info-row"><span>Số tiền:</span> <span>${formattedAmount}</span></div>
      <div class="info-row"><span>Cổng thanh toán:</span> <span>VNPay Sandbox (${req.query.vnp_BankCode || 'NCB'})</span></div>
      <div class="info-row"><span>Mã giao dịch:</span> <span>${req.query.vnp_TransactionNo || '—'}</span></div>
      <div class="info-row"><span>Trạng thái:</span> <span style="color:${isSuccess ? '#059669' : '#dc2626'};">${isSuccess ? 'ĐÃ THANH TOÁN' : 'THẤT BẠI'}</span></div>
    </div>
    const adminWebUrl = process.env.ADMIN_URL || 'http://localhost:5173';
    <a href="${appRedirectUrl}" class="btn btn-primary">Mở ứng dụng FITZY</a>
    <a href="${adminWebUrl}" class="btn btn-secondary">Xem quản trị đơn hàng (Web Admin)</a>
    <div class="notice">Hệ thống đang tự động điều hướng về ứng dụng FITZY…</div>
  </div>
</body>
</html>`);
});
const vnPaySimulate = asyncHandler(async (req, res) => {
  const isValid = paymentGatewayService.verifyVnPayCallback(req.query);
  const { vnp_TxnRef, vnp_Amount, vnp_OrderInfo, vnp_ReturnUrl, vnp_TmnCode } = req.query;
  const amountNumber = Number(vnp_Amount) / 100;
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountNumber || 0);

  if (!isValid) {
    return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lỗi thanh toán VNPay</title><style>body{font-family:sans-serif;background:#f5f5f5;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#fff;padding:32px;border-radius:16px;max-width:480px;box-shadow:0 4px 20px rgba(0,0,0,0.08);text-align:center}.error-badge{color:#e53e3e;font-size:48px;margin-bottom:12px}h2{color:#1a202c;margin:0 0 12px}p{color:#718096;margin:0 0 24px}</style></head><body><div class="card"><div class="error-badge">⚠️</div><h2>Chữ ký không hợp lệ</h2><p>Mã lỗi 97: Checksum không khớp hoặc tham số thanh toán đã bị thay đổi.</p></div></body></html>`);
  }

  res.removeHeader('Content-Security-Policy');
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cổng Thanh Toán VNPAY · Giả lập Sandbox</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #f0f2f5; color: #1e293b; padding: 20px; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
    .container { width: 100%; max-width: 520px; background: #ffffff; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #005baa 0%, #0077d7 100%); padding: 24px 24px 20px; color: #ffffff; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; gap: 8px; font-weight: 900; font-size: 20px; letter-spacing: 0.5px; }
    .sandbox-tag { background: rgba(255,255,255,0.25); font-size: 11px; padding: 3px 8px; border-radius: 99px; text-transform: uppercase; font-weight: 700; }
    .header-sub { font-size: 13px; opacity: 0.9; margin-top: 6px; }
    .order-box { background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; }
    .order-box .label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .order-box .amount { font-size: 22px; font-weight: 800; color: #005baa; }
    .content { padding: 24px; }
    .order-info { margin-bottom: 20px; padding: 14px; background: #f1f5f9; border-radius: 12px; font-size: 13px; line-height: 1.6; }
    .order-info div { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .order-info div:last-child { margin-bottom: 0; }
    .order-info span:first-child { color: #64748b; }
    .order-info span:last-child { font-weight: 600; color: #0f172a; }
    .method-title { font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .card-preview { border: 1.5px solid #005baa; border-radius: 14px; padding: 16px; background: #f0f7ff; margin-bottom: 20px; position: relative; }
    .card-title { font-size: 13px; font-weight: 700; color: #005baa; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .card-number { font-size: 18px; font-weight: 800; letter-spacing: 2px; color: #1e293b; margin-bottom: 10px; }
    .card-meta { display: flex; justify-content: space-between; font-size: 12px; color: #475569; }
    .card-meta b { color: #0f172a; }
    .otp-field { margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .otp-badge { background: #005baa; color: #fff; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 13px; letter-spacing: 1px; }
    .btn-group { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
    .btn { width: 100%; border: none; padding: 14px 20px; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: center; text-decoration: none; display: block; }
    .btn-primary { background: #005baa; color: #ffffff; box-shadow: 0 4px 12px rgba(0, 91, 170, 0.25); }
    .btn-primary:hover { background: #004d91; transform: translateY(-1px); }
    .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .btn-secondary:hover { background: #e2e8f0; color: #1e293b; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">
        <span>VNPAY</span>
        <span class="sandbox-tag">Sandbox Demo</span>
      </div>
      <div class="header-sub">Cổng thanh toán điện tử mô phỏng cho FITZY Store</div>
    </div>
    <div class="order-box">
      <div>
        <div class="label">Đơn hàng</div>
        <div style="font-weight:700;font-size:14px;color:#334155;">${vnp_TxnRef}</div>
      </div>
      <div style="text-align:right;">
        <div class="label">Số tiền cần thanh toán</div>
        <div class="amount">${formattedAmount}</div>
      </div>
    </div>
    <div class="content">
      <div class="order-info">
        <div><span>Đơn vị chấp nhận:</span> <span>FITZY Store (${vnp_TmnCode})</span></div>
        <div><span>Nội dung giao dịch:</span> <span>${vnp_OrderInfo || `Thanh toan don ${vnp_TxnRef}`}</span></div>
        <div><span>Môi trường:</span> <span style="color:#005baa;">Thử nghiệm (Sandbox NCB)</span></div>
      </div>
      <div class="method-title">
        <span>💳</span> Thẻ ATM nội địa thử nghiệm (NCB)
      </div>
      <div class="card-preview">
        <div class="card-title">
          <span>NGÂN HÀNG QUỐC DÂN (NCB)</span>
          <span style="font-size:11px;background:#e0edff;color:#005baa;padding:2px 6px;border-radius:4px;">ATM Card</span>
        </div>
        <div class="card-number">9704 1985 2619 1432 198</div>
        <div class="card-meta">
          <div>CHỦ THẺ: <b>NGUYEN VAN A</b></div>
          <div>NGÀY PHÁT HÀNH: <b>07/15</b></div>
        </div>
        <div class="otp-field">
          <span>Mã xác thực OTP thử nghiệm:</span>
          <span class="otp-badge">123456</span>
        </div>
      </div>
      <form method="POST" action="/api/payments/vnpay/simulate" class="btn-group">
        <input type="hidden" name="vnp_TxnRef" value="${vnp_TxnRef}">
        <input type="hidden" name="vnp_Amount" value="${vnp_Amount}">
        <input type="hidden" name="vnp_OrderInfo" value="${vnp_OrderInfo}">
        <input type="hidden" name="vnp_ReturnUrl" value="${vnp_ReturnUrl}">
        <input type="hidden" name="vnp_TmnCode" value="${vnp_TmnCode}">
        <input type="hidden" name="bankCode" value="NCB">
        <button type="submit" name="action" value="success" class="btn btn-primary">
          ✓ Xác nhận thanh toán thành công
        </button>
        <button type="submit" name="action" value="cancel" class="btn btn-secondary">
          ✕ Hủy bỏ giao dịch
        </button>
      </form>
      <div class="footer">
        Dữ liệu mô phỏng theo chuẩn kết nối VNPAY 2.1.0 · Bản quyền FITZY Store
      </div>
    </div>
  </div>
</body>
</html>`);
});
const vnPaySimulateSubmit = asyncHandler(async (req, res) => {
  const isSuccess = req.body.action === 'success';
  const now = new Date();
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).reduce((out, part) => ({ ...out, [part.type]: part.value }), {});
  const payDate = `${local.year}${local.month}${local.day}${local.hour}${local.minute}${local.second}`;
  const returnParams = {
    vnp_Amount: req.body.vnp_Amount,
    vnp_BankCode: req.body.bankCode || 'NCB',
    vnp_BankTranNo: `VNP${Date.now()}`,
    vnp_CardType: 'ATM',
    vnp_OrderInfo: req.body.vnp_OrderInfo || `Thanh toan don ${req.body.vnp_TxnRef}`,
    vnp_PayDate: payDate,
    vnp_ResponseCode: isSuccess ? '00' : '24',
    vnp_TmnCode: req.body.vnp_TmnCode || process.env.VNPAY_TMN_CODE || 'FITZYDEMO',
    vnp_TransactionNo: `${Date.now()}`,
    vnp_TransactionStatus: isSuccess ? '00' : '02',
    vnp_TxnRef: req.body.vnp_TxnRef
  };
  const sorted = Object.fromEntries(Object.entries(returnParams).sort(([a], [b]) => a.localeCompare(b)));
  const signData = querystring.stringify(sorted, undefined, undefined, { encodeURIComponent: value => value });
  const hashSecret = process.env.VNPAY_HASH_SECRET || 'fitzy_vnpay_hash_secret_sandbox_key_2026';
  const signature = crypto.createHmac('sha512', hashSecret).update(signData, 'utf8').digest('hex');
  const query = new URLSearchParams({ ...sorted, vnp_SecureHash: signature }).toString();
  const returnUrl = req.body.vnp_ReturnUrl || process.env.VNPAY_RETURN_URL || `${req.protocol}://${req.get('host')}/api/payments/return/vnpay`;
  res.redirect(302, `${returnUrl}?${query}`);
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

module.exports = { create, momoIpn, zaloPayIpn, vnPayIpn, vnPayReturn, vnPaySimulate, vnPaySimulateSubmit, mine, detail, cancel, markPaid, markRefunded, createReview };
