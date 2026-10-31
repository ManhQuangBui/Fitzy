const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDiscount, nextStatuses, SHIPPING_FEE, SHIPPING_THRESHOLD } = require('../services/orderService');

test('percent promotions obey maximum discount and cannot exceed subtotal', () => {
  assert.equal(calculateDiscount({ discountType: 'percent', discountValue: 20, maximumDiscount: 50000 }, 400000), 50000);
  assert.equal(calculateDiscount({ discountType: 'percent', discountValue: 100, maximumDiscount: 900000 }, 100000), 100000);
});

test('fixed promotions cannot exceed subtotal', () => {
  assert.equal(calculateDiscount({ discountType: 'fixed', discountValue: 30000 }, 20000), 20000);
});

test('order transition policy prevents customer or admin workflow skips', () => {
  assert.deepEqual(nextStatuses.pending, ['confirmed', 'cancelled']);
  assert.deepEqual(nextStatuses.confirmed, ['preparing', 'cancelled']);
  assert.deepEqual(nextStatuses.preparing, ['shipping', 'cancelled']);
  assert.deepEqual(nextStatuses.shipping, ['completed', 'delivery_failed']);
  assert.deepEqual(nextStatuses.delivery_failed, ['shipping']);
  assert.deepEqual(nextStatuses.completed, []);
  assert.deepEqual(nextStatuses.cancelled, []);
});

test('shipping threshold is explicit and consistent', () => {
  assert.equal(SHIPPING_THRESHOLD, 500000);
  assert.equal(SHIPPING_FEE, 30000);
});
