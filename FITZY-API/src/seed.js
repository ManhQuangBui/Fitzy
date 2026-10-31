require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDatabase = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Post = require('./models/Post');
const Promotion = require('./models/Promotion');

async function seed() {
  await connectDatabase();
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@fitzy.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 12) throw new Error('Set SEED_ADMIN_PASSWORD to a unique password of at least 12 characters before seeding.');
  await User.updateOne({ email }, {
    $set: { role: 'admin', isBlocked: false },
    $setOnInsert: { name: 'FITZY Admin', passwordHash: await bcrypt.hash(password, 12) }
  }, { upsert: true });
  const categories = await Promise.all([
    { name: 'Áo', slug: 'ao', description: 'Áo thiết kế demo FITZY', status: 'active' },
    { name: 'Quần', slug: 'quan', description: 'Quần thiết kế demo FITZY', status: 'active' },
    { name: 'Phụ kiện', slug: 'phu-kien', description: 'Phụ kiện demo FITZY', status: 'active' }
  ].map(item => Category.findOneAndUpdate({ slug: item.slug }, { $set: item }, { upsert: true, new: true })));
  const catalog = [
    { name: 'Áo thun Essential', slug: 'ao-thun-essential', description: 'Áo thun cotton form relaxed, dễ phối trong bộ sưu tập dữ liệu demo.', category: categories[0]._id, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85'], price: 329000, compareAtPrice: 390000, featured: true, tags: ['casual', 'cotton', 'minimal'], variants: [{ sku: 'ESS-W-S', size: 'S', color: 'Trắng', colorHex: '#eeeae0', quantity: 8 }, { sku: 'ESS-W-M', size: 'M', color: 'Trắng', colorHex: '#eeeae0', quantity: 12 }, { sku: 'ESS-B-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 6 }] },
    { name: 'Sơ mi Linen Daily', slug: 'so-mi-linen-daily', description: 'Sơ mi linen phong cách tối giản, dữ liệu sản phẩm demo.', category: categories[0]._id, images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85'], price: 549000, featured: true, tags: ['office', 'minimal', 'linen'], variants: [{ sku: 'LIN-BE-M', size: 'M', color: 'Be', colorHex: '#c9b99b', quantity: 7 }, { sku: 'LIN-BE-L', size: 'L', color: 'Be', colorHex: '#c9b99b', quantity: 5 }] },
    { name: 'Quần ống suông Studio', slug: 'quan-ong-suong-studio', description: 'Quần ống suông tông trung tính, dữ liệu sản phẩm demo.', category: categories[1]._id, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85'], price: 690000, featured: false, tags: ['casual', 'office', 'minimal'], variants: [{ sku: 'STR-BLK-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 5 }, { sku: 'STR-BLK-L', size: 'L', color: 'Đen', colorHex: '#222222', quantity: 4 }] },
    { name: 'Túi canvas Everyday', slug: 'tui-canvas-everyday', description: 'Túi canvas dùng hằng ngày, dữ liệu sản phẩm demo.', category: categories[2]._id, images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85'], price: 249000, featured: true, tags: ['casual', 'everyday'], variants: [{ sku: 'BAG-CRM-U', size: 'U', color: 'Kem', colorHex: '#e9ddc8', quantity: 15 }] }
  ];
  for (const product of catalog) await Product.findOneAndUpdate({ slug: product.slug }, { $setOnInsert: product }, { upsert: true, new: true });
  await Post.findOneAndUpdate({ slug: 'phoi-do-toi-gian-moi-ngay' }, { $setOnInsert: { title: 'Phối đồ tối giản mỗi ngày', slug: 'phoi-do-toi-gian-moi-ngay', excerpt: 'Một vài nguyên tắc để tạo tủ đồ linh hoạt.', content: 'Bài viết minh họa được tạo từ seed FITZY. Hãy ưu tiên phom dáng phù hợp, phối bảng màu trung tính và chọn trang phục theo hoàn cảnh sử dụng.', image: '', status: 'published', publishedAt: new Date() } }, { upsert: true });
  await Promotion.findOneAndUpdate({ code: 'FITZY10' }, { $setOnInsert: { code: 'FITZY10', discountType: 'percent', discountValue: 10, minimumOrder: 300000, maximumDiscount: 100000, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 365 * 86400000), usageLimit: 100, active: true } }, { upsert: true });
  console.log(`Demo data ready. Admin email: ${email}.`);
}

seed().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
