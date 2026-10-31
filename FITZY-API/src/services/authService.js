const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('../utils/errors');
const { getFirebaseAdminAuth } = require('../config/firebaseAdmin');

function createToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function register({ name, email, password }) {
  const normalizedEmail = email.toLowerCase().trim();
  if (await User.exists({ email: normalizedEmail })) throw new AppError('Email is already registered', 409, 'EMAIL_IN_USE');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'customer' });
  return { user: user.toJSON(), token: createToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  const valid = Boolean(user?.passwordHash) && await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
  if (user.isBlocked) throw new AppError('This account has been blocked', 403, 'ACCOUNT_BLOCKED');
  return { user: user.toJSON(), token: createToken(user) };
}

async function exchangeFirebaseToken(idToken, displayName) {
  if (!idToken) throw new AppError('A Firebase ID token is required.', 400, 'FIREBASE_TOKEN_REQUIRED');
  const firebaseAuth = getFirebaseAdminAuth();
  let claims;
  try { claims = await firebaseAuth.verifyIdToken(idToken, true); }
  catch (error) {
    const invalidTokenCodes = new Set(['auth/argument-error', 'auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/invalid-argument']);
    if (invalidTokenCodes.has(error.code)) throw new AppError('Firebase session is invalid or expired. Please sign in again.', 401, 'FIREBASE_TOKEN_INVALID');
    if (error.code === 'auth/user-disabled') throw new AppError('This Firebase account has been disabled.', 403, 'ACCOUNT_BLOCKED');
    throw new AppError('Firebase token verification is temporarily unavailable.', 503, 'FIREBASE_VERIFICATION_UNAVAILABLE');
  }

  const user = await syncFirebaseUser(claims, displayName, firebaseAuth);
  return { user: user.toJSON(), token: createToken(user) };
}

async function syncFirebaseUser(claims, displayName, firebaseAuth = null) {
  const firebaseUid = claims.uid;
  const email = String(claims.email || '').trim().toLowerCase();
  if (!firebaseUid || !email) throw new AppError('A verified Firebase email account is required.', 401, 'FIREBASE_EMAIL_REQUIRED');

  let user = await User.findOne({ firebaseUid });
  if (!user) {
    user = await User.findOne({ email }).select('+passwordHash +firebaseUid');
    if (user) {
      if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        if (!firebaseAuth) throw new AppError('This email is linked to a different Firebase account.', 409, 'FIREBASE_ACCOUNT_CONFLICT');
        let linkedFirebaseUser;
        try { linkedFirebaseUser = await firebaseAuth.getUser(user.firebaseUid); }
        catch (error) {
          if (error.code !== 'auth/user-not-found') {
            throw new AppError('The previous Firebase account could not be checked. Please try again later.', 503, 'FIREBASE_VERIFICATION_UNAVAILABLE');
          }
        }
        if (linkedFirebaseUser) throw new AppError('This email is linked to a different Firebase account.', 409, 'FIREBASE_ACCOUNT_CONFLICT');
        if (!claims.email_verified) throw new AppError('Verify this email before restoring its FITZY account link.', 409, 'EMAIL_VERIFICATION_REQUIRED');
      }
      if (!claims.email_verified) throw new AppError('Verify this email before linking it to an existing FITZY account.', 409, 'EMAIL_VERIFICATION_REQUIRED');
      user.firebaseUid = firebaseUid;
      if (!user.name && displayName) user.name = String(displayName).trim().slice(0, 80);
      try { await user.save(); }
      catch (error) {
        if (error.code !== 11000) throw error;
        user = await User.findOne({ firebaseUid });
        if (!user) throw new AppError('This Firebase account could not be linked to the FITZY profile.', 409, 'FIREBASE_ACCOUNT_CONFLICT');
      }
    } else {
      const safeName = String(displayName || claims.name || email.split('@')[0]).trim().slice(0, 80) || email.split('@')[0];
      try { user = await User.create({ firebaseUid, name: safeName, email, role: 'customer' }); }
      catch (error) {
        if (error.code !== 11000) throw error;
        user = await User.findOne({ firebaseUid });
        if (!user) throw new AppError('This email is already attached to a FITZY profile.', 409, 'FIREBASE_ACCOUNT_CONFLICT');
      }
    }
  }

  if (user.isBlocked) throw new AppError('This account has been blocked.', 403, 'ACCOUNT_BLOCKED');
  return user;
}

module.exports = { register, login, exchangeFirebaseToken, syncFirebaseUser };
