const { body } = require('express-validator');
module.exports = [
  body('occasion').optional().isString().isLength({ max: 80 }),
  body('style').optional().isString().isLength({ max: 80 }),
  body('colors').optional().isString().isLength({ max: 100 }),
  body('size').optional().isString().isLength({ max: 10 }),
  body('budget').optional().isNumeric({ no_symbols: true }).isFloat({ min: 0, max: 100000000 }),
  body('notes').optional().isString().isLength({ max: 300 })
];
