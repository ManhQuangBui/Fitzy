const mongoose = require('mongoose');

const changeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  sku: { type: String, default: '' },
  before: mongoose.Schema.Types.Mixed,
  after: mongoose.Schema.Types.Mixed
}, { _id: false });

const productActivitySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['created', 'updated', 'price_changed', 'inventory_changed', 'visibility_changed'], required: true },
  changes: { type: [changeSchema], default: [] },
  reason: { type: String, trim: true, maxlength: 500, default: '' }
}, { timestamps: true });

productActivitySchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('ProductActivity', productActivitySchema);
