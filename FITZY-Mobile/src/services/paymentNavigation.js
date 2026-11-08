// Shared with Node's protocol tests; this module has no native dependencies.
function parseUrl(value) {
  if (typeof value !== 'string') return null;
  try { return new URL(value); } catch { return null; }
}

function isWebPaymentUrl(value) {
  const url = parseUrl(value);
  return !!url && url.protocol === 'https:' && !url.username && !url.password;
}

function isVnPayPaymentUrl(value) {
  const url = parseUrl(value);
  return isWebPaymentUrl(value) && ['sandbox.vnpayment.vn', 'pay.vnpay.vn'].includes(url.hostname) && url.pathname === '/paymentv2/vpcpay.html';
}

function isPaymentReturnUrl(value) {
  const url = parseUrl(value);
  return !!url && url.protocol === 'fitzy:' && url.hostname === 'payment-result' && (!url.pathname || url.pathname === '/');
}

module.exports = { isVnPayPaymentUrl, isPaymentReturnUrl, isWebPaymentUrl };
