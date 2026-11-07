const test = require('node:test');
const assert = require('node:assert/strict');
const { isVnPayPaymentUrl, isPaymentReturnUrl, isWebPaymentUrl } = require('../../../FITZY-Mobile/src/services/paymentNavigation');

test('embedded checkout accepts VNPay HTTPS links and rejects lookalike hosts and active content', () => {
  assert.equal(isVnPayPaymentUrl('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=13000000'), true);
  assert.equal(isVnPayPaymentUrl('https://pay.vnpay.vn/paymentv2/vpcpay.html'), true);
  for (const url of [undefined, 'javascript:alert(1)', 'http://sandbox.vnpayment.vn/paymentv2/vpcpay.html', 'https://sandbox.vnpayment.vn.evil.example/paymentv2/vpcpay.html', 'https://user:password@sandbox.vnpayment.vn/paymentv2/vpcpay.html', 'https://sandbox.vnpayment.vn/other']) assert.equal(isVnPayPaymentUrl(url), false);
});

test('only the FITZY result callback finishes checkout; bank app links stay outside web navigation', () => {
  assert.equal(isPaymentReturnUrl('fitzy://payment-result?status=success&orderId=untrusted'), true);
  for (const url of ['fitzy://other', 'fitzy://payment-result/other', 'https://payment-result', 'intent://bank', null]) assert.equal(isPaymentReturnUrl(url), false);
  assert.equal(isWebPaymentUrl('https://sandbox.vnpayment.vn/paymentv2/Transaction/PaymentMethod.html'), true);
  for (const url of ['intent://bank', 'vnpay://pay', 'javascript:alert(1)', 'file:///data/local/tmp', 'http://bank.example']) assert.equal(isWebPaymentUrl(url), false);
});
