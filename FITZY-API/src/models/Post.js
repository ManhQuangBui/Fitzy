const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    image: { type: String, default: '' },
    badge: { type: String, default: '' },
    category: { type: String, default: 'Phối đồ hàng ngày', index: true },
    readTime: { type: String, default: '4 phút đọc' },
    author: {
        name: { type: String, default: 'FITZY Styling Team' },
        avatar: { type: String, default: '' },
        role: { type: String, default: 'Styling Team' }
    },
    tags: [{ type: String }],
    isEditorialPick: { type: Boolean, default: false, index: true },
    spotlightImages: [{ type: String }],
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    viewsCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: Date
}, { timestamps: true });
postSchema.index({ title: 'text', excerpt: 'text', content: 'text' });
module.exports = mongoose.model('Post', postSchema);
