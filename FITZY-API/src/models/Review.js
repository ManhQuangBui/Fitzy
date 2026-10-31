const mongoose = require('mongoose');
const reviewSchema = new mongoose.Schema({ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true }, user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, rating: { type: Number, min: 1, max: 5, required: true }, comment: { type: String, trim: true, maxlength: 1200, default: '' }, status: { type: String, enum: ['visible', 'hidden'], default: 'visible' } }, { timestamps: true });
reviewSchema.index({ user: 1, product: 1 }, { unique: true });
module.exports = mongoose.model('Review', reviewSchema);
