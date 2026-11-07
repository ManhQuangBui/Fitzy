const mongoose = require('mongoose');
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true, unique: true }, slug: { type: String, required: true, unique: true }, description: { type: String, default: '' }, image: { type: String, default: '' }, status: { type: String, enum: ['active', 'hidden'], default: 'active' } }, { timestamps: true });
// Products in a hidden category must not be shown, favorited, recommended or ordered by customers.
schema.statics.activeIds = function activeIds() { return this.distinct('_id', { status: 'active' }); };
module.exports = mongoose.model('Category', schema);
