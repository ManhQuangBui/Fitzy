const mongoose = require('mongoose');
const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Nhà riêng' }, recipient: { type: String, trim: true }, phone: { type: String, trim: true },
  line1: { type: String, trim: true }, ward: { type: String, trim: true }, district: { type: String, trim: true }, city: { type: String, trim: true }, isDefault: { type: Boolean, default: false }
}, { _id: true });
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  firebaseUid: { type: String, unique: true, sparse: true, select: false }, passwordHash: { type: String, select: false }, phone: { type: String, trim: true, default: '' }, addresses: { type: [addressSchema], default: [] },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }, isBlocked: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { transform: (doc, ret) => { delete ret.passwordHash; delete ret.firebaseUid; delete ret.__v; return ret; } } });
module.exports = mongoose.model('User', userSchema);
