const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) { const error = new AppError('Please check the submitted information', 400, 'VALIDATION_ERROR'); error.errors = result.array(); return next(error); }
  next();
}

module.exports = validate;
