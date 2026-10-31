const { body } = require('express-validator');
module.exports = {
  registerRules: [body('name').trim().isLength({ min: 2, max: 80 }), body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 8, max: 100 })],
  loginRules: [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()]
};
