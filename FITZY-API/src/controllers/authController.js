const User = require('../models/User');
const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errors');
const { registerRules, loginRules } = require('../validators/authValidators');

const register = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await authService.register(req.body) }));
const login = asyncHandler(async (req, res) => res.json({ success: true, data: await authService.login(req.body) }));
const exchangeFirebase = asyncHandler(async (req, res) => res.json({ success: true, data: await authService.exchangeFirebaseToken(req.body.idToken, req.body.name) }));
const me = asyncHandler(async (req, res) => res.json({ success: true, data: { user: req.user } }));
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'addresses'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true, runValidators: true }).select('-passwordHash');
  res.json({ success: true, data: { user } });
});

module.exports = { register, login, exchangeFirebase, me, updateMe, registerRules, loginRules };
