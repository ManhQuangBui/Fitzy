const mongoose = require('mongoose');
const variantSchema = new mongoose.Schema({
  sku: { type: String, trim: true }, size: { type: String, required: true, trim: true }, color: { type: String, required: true, trim: true }, colorHex: { type: String, default: '#222222' },
  quantity: { type: Number, required: true, min: 0, default: 0 }, images: { type: [String], default: [] }, isActive: { type: Boolean, default: true }
}, { timestamps: true });
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 }, slug: { type: String, required: true, unique: true }, description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true }, images: { type: [String], default: [] }, price: { type: Number, required: true, min: 0 }, compareAtPrice: { type: Number, min: 0 },
  variants: { type: [variantSchema], validate: v => v.length > 0 }, status: { type: String, enum: ['active', 'hidden'], default: 'active', index: true }, featured: { type: Boolean, default: false },
  tags: { type: [String], default: [] }, salesCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
module.exports = mongoose.model('Product', productSchema);
