const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError, asyncHandler } = require('../utils/errors');

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError('Please sign in to continue', 401, 'AUTH_REQUIRED');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch { throw new AppError('Your session is invalid or has expired', 401, 'AUTH_EXPIRED'); }
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user || user.isBlocked) throw new AppError('This account cannot continue', 403, 'ACCOUNT_BLOCKED');
  req.user = user;
  next();
});

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return next(new AppError('Administrator access required', 403, 'ADMIN_REQUIRED'));
  next();
}

module.exports = { requireAuth, requireAdmin };
