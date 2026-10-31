const { body } = require('express-validator');
const orderRules = [
  body('items').isArray({ min: 1, max: 30 }),
  body('items.*.productId').isMongoId(),
  body('items.*.variantId').isMongoId(),
  body('items.*.quantity').isInt({ min: 1, max: 20 }),
  body('shipping.recipient').isString().trim().isLength({ min: 1, max: 100 }),
  body('shipping.phone').isString().trim().matches(/^\+?[0-9\s()-]{8,20}$/),
  body('shipping.line1').isString().trim().isLength({ min: 1, max: 200 }),
  body('shipping.ward').optional().isString().trim().isLength({ max: 100 }),
  body('shipping.district').isString().trim().isLength({ min: 1, max: 100 }),
  body('shipping.city').isString().trim().isLength({ min: 1, max: 100 }),
  body('paymentMethod').optional().isIn(['cod', 'bank_transfer', 'momo', 'zalopay', 'vnpay']),
  body('promotionCode').optional({ values: 'falsy' }).isString().trim().isLength({ max: 40 })
];
module.exports = { orderRules };
