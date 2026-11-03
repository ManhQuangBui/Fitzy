require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Post = require('./models/Post');
const Promotion = require('./models/Promotion');

async function seed() {
  await connectDatabase();
  console.log('Connected to database. Starting seed...');

  // 1. SEED ADMIN ACCOUNT
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@fitzy.local').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error('Set SEED_ADMIN_PASSWORD to a unique password of at least 12 characters before seeding.');
  }
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await User.findOneAndUpdate(
    { email: adminEmail },
    {
      $set: { role: 'admin', isBlocked: false, phone: '0900000001' },
      $setOnInsert: { name: 'FITZY Admin', passwordHash: adminHash }
    },
    { upsert: true, new: true }
  );

  // 2. SEED SAMPLE CUSTOMERS
  const defaultCustomerPasswordHash = await bcrypt.hash('Customer@Fitzy2026!', 10);
  const customersData = [
    {
      email: 'customer@fitzy.local',
      name: 'Khách hàng FITZY Demo',
      phone: '0901234567',
      passwordHash: defaultCustomerPasswordHash,
      role: 'customer',
      isBlocked: false,
      addresses: [
        {
          label: 'Nhà riêng',
          recipient: 'Khách hàng FITZY Demo',
          phone: '0901234567',
          line1: '12 Nguyễn Huệ',
          ward: 'Bến Nghé',
          district: 'Quận 1',
          city: 'TP. Hồ Chí Minh',
          isDefault: true
        }
      ]
    },
    {
      email: 'nguyenan@fitzy.local',
      name: 'Nguyễn Văn An',
      phone: '0912345678',
      passwordHash: defaultCustomerPasswordHash,
      role: 'customer',
      isBlocked: false,
      addresses: [
        {
          label: 'Văn phòng',
          recipient: 'Nguyễn Văn An',
          phone: '0912345678',
          line1: '88 Kim Mã',
          ward: 'Kim Mã',
          district: 'Ba Đình',
          city: 'Hà Nội',
          isDefault: true
        }
      ]
    },
    {
      email: 'tranthib@fitzy.local',
      name: 'Trần Thị Bình',
      phone: '0987654321',
      passwordHash: defaultCustomerPasswordHash,
      role: 'customer',
      isBlocked: false,
      addresses: [
        {
          label: 'Nhà riêng',
          recipient: 'Trần Thị Bình',
          phone: '0987654321',
          line1: '45 Lê Duẩn',
          ward: 'Hải Châu 1',
          district: 'Hải Châu',
          city: 'Đà Nẵng',
          isDefault: true
        }
      ]
    },
    {
      email: 'lehoangc@fitzy.local',
      name: 'Lê Hoàng Cường (Tài khoản mẫu đã khóa)',
      phone: '0933445566',
      passwordHash: defaultCustomerPasswordHash,
      role: 'customer',
      isBlocked: true,
      addresses: [
        {
          label: 'Nhà riêng',
          recipient: 'Lê Hoàng Cường',
          phone: '0933445566',
          line1: '120 Nguyễn Văn Cừ',
          ward: 'An Khánh',
          district: 'Ninh Kiều',
          city: 'Cần Thơ',
          isDefault: true
        }
      ]
    }
  ];

  const seededCustomers = [];
  for (const item of customersData) {
    const cust = await User.findOneAndUpdate(
      { email: item.email },
      { $set: item },
      { upsert: true, new: true }
    );
    seededCustomers.push(cust);
  }
  console.log(`Seeded ${seededCustomers.length} customers.`);

  // 3. SEED CATEGORIES (5 categories with fashion cover images)
  const categoriesData = [
    {
      name: 'Áo',
      slug: 'ao',
      description: 'Áo thun, sơ mi, polo và dệt kim form dáng chuẩn, chất liệu thoáng mát cao cấp.',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=85',
      status: 'active'
    },
    {
      name: 'Quần',
      slug: 'quan',
      description: 'Quần tây, quần ống suông và denim tinh tế cho phong cách hàng ngày.',
      image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85',
      status: 'active'
    },
    {
      name: 'Váy & Đầm',
      slug: 'vay-dam',
      description: 'Thiết kế đầm liền và chân váy nữ tính, thanh lịch và tôn dáng.',
      image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=900&q=85',
      status: 'active'
    },
    {
      name: 'Áo khoác & Blazer',
      slug: 'ao-khoac-blazer',
      description: 'Blazer thanh lịch, áo khoác dạ và jacket hiện đại cho mọi thời tiết.',
      image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85',
      status: 'active'
    },
    {
      name: 'Phụ kiện',
      slug: 'phu-kien',
      description: 'Túi canvas, mũ, thắt lưng và phụ kiện hoàn thiện diện mạo phong cách.',
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85',
      status: 'active'
    }
  ];

  const categories = await Promise.all(
    categoriesData.map(item =>
      Category.findOneAndUpdate({ slug: item.slug }, { $set: item }, { upsert: true, new: true })
    )
  );
  console.log(`Seeded ${categories.length} categories.`);

  const catMap = Object.fromEntries(categories.map(c => [c.slug, c._id]));

  // 4. SEED PRODUCTS (12 products with multiple variants, colors, sizes, stock, images)
  const productsData = [
    {
      name: 'Áo thun Essential Relaxed',
      slug: 'ao-thun-essential-relaxed',
      description: 'Áo thun cotton 100% định lượng 250gsm dày dặn, thấm hút mồ hôi tốt. Phom dáng relaxed fit trẻ trung, dễ phối đồ.',
      category: catMap['ao'],
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85'
      ],
      price: 329000,
      compareAtPrice: 390000,
      featured: true,
      tags: ['casual', 'cotton', 'minimal', 'ao-thun'],
      salesCount: 14,
      status: 'active',
      variants: [
        { sku: 'ESS-W-S', size: 'S', color: 'Trắng', colorHex: '#f5f5f5', quantity: 18, isActive: true },
        { sku: 'ESS-W-M', size: 'M', color: 'Trắng', colorHex: '#f5f5f5', quantity: 25, isActive: true },
        { sku: 'ESS-B-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 20, isActive: true },
        { sku: 'ESS-B-L', size: 'L', color: 'Đen', colorHex: '#222222', quantity: 15, isActive: true }
      ]
    },
    {
      name: 'Sơ mi Linen Daily Fit',
      slug: 'so-mi-linen-daily-fit',
      description: 'Sơ mi chất liệu linen thoáng khí, phom regular fit thanh lịch phù hợp cho cả đi làm và đi chơi cuối tuần.',
      category: catMap['ao'],
      images: [
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85',
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'
      ],
      price: 549000,
      compareAtPrice: 620000,
      featured: true,
      tags: ['office', 'minimal', 'linen', 'so-mi'],
      salesCount: 9,
      status: 'active',
      variants: [
        { sku: 'LIN-BE-M', size: 'M', color: 'Be', colorHex: '#c9b99b', quantity: 12, isActive: true },
        { sku: 'LIN-BE-L', size: 'L', color: 'Be', colorHex: '#c9b99b', quantity: 8, isActive: true },
        { sku: 'LIN-WH-M', size: 'M', color: 'Trắng', colorHex: '#ffffff', quantity: 15, isActive: true }
      ]
    },
    {
      name: 'Áo Polo dệt kim Vintage',
      slug: 'ao-polo-det-kim-vintage',
      description: 'Áo polo dệt kim len mỏng sợi cotton mềm mát, cổ bẻ phối sọc retro tinh tế cho quý ông hiện đại.',
      category: catMap['ao'],
      images: [
        'https://images.unsplash.com/photo-1625910513413-5bc2174094a4?auto=format&fit=crop&w=900&q=85'
      ],
      price: 429000,
      compareAtPrice: 480000,
      featured: false,
      tags: ['casual', 'vintage', 'polo', 'knit'],
      salesCount: 6,
      status: 'active',
      variants: [
        { sku: 'POLO-BR-S', size: 'S', color: 'Nâu đất', colorHex: '#6d4c41', quantity: 10, isActive: true },
        { sku: 'POLO-BR-M', size: 'M', color: 'Nâu đất', colorHex: '#6d4c41', quantity: 14, isActive: true },
        { sku: 'POLO-NV-L', size: 'L', color: 'Xanh navy', colorHex: '#1a237e', quantity: 9, isActive: true }
      ]
    },
    {
      name: 'Quần ống suông Studio Pleated',
      slug: 'quan-ong-suong-studio-pleated',
      description: 'Quần tây xếp ly nhẹ phía trước, ống suông rộng tôn dáng và che khuyết điểm chân hiệu quả.',
      category: catMap['quan'],
      images: [
        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85',
        'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=900&q=85'
      ],
      price: 690000,
      compareAtPrice: 790000,
      featured: true,
      tags: ['casual', 'office', 'minimal', 'quan-suong'],
      salesCount: 16,
      status: 'active',
      variants: [
        { sku: 'STR-BLK-S', size: 'S', color: 'Đen', colorHex: '#222222', quantity: 10, isActive: true },
        { sku: 'STR-BLK-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 18, isActive: true },
        { sku: 'STR-GRY-M', size: 'M', color: 'Xám khói', colorHex: '#757575', quantity: 12, isActive: true }
      ]
    },
    {
      name: 'Quần tây may đo Minimalist',
      slug: 'quan-tay-may-do-minimalist',
      description: 'Quần âu may đo chỉn chu với cạp cao tôn dáng, đường ly sắc sảo phù hợp trang phục công sở chuyên nghiệp.',
      category: catMap['quan'],
      images: [
        'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85'
      ],
      price: 650000,
      compareAtPrice: 720000,
      featured: false,
      tags: ['office', 'tailored', 'minimal'],
      salesCount: 8,
      status: 'active',
      variants: [
        { sku: 'TAY-BLK-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 15, isActive: true },
        { sku: 'TAY-NVY-L', size: 'L', color: 'Xanh than', colorHex: '#1e293b', quantity: 10, isActive: true }
      ]
    },
    {
      name: 'Quần Denim Straight Classic',
      slug: 'quan-denim-straight-classic',
      description: 'Quần jeans denim 13oz đứng phom cổ điển, wash màu tự nhiên, bền bỉ theo thời gian.',
      category: catMap['quan'],
      images: [
        'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=900&q=85'
      ],
      price: 720000,
      compareAtPrice: 850000,
      featured: false,
      tags: ['denim', 'jeans', 'casual'],
      salesCount: 7,
      status: 'active',
      variants: [
        { sku: 'DNM-BLU-S', size: 'S', color: 'Xanh cổ điển', colorHex: '#3b82f6', quantity: 12, isActive: true },
        { sku: 'DNM-BLU-M', size: 'M', color: 'Xanh cổ điển', colorHex: '#3b82f6', quantity: 16, isActive: true }
      ]
    },
    {
      name: 'Đầm sơ mi thắt eo Elegant',
      slug: 'dam-so-mi-that-eo-elegant',
      description: 'Đầm sơ mi tay lỡ có đai thắt eo tôn dáng, chất liệu lụa satin mờ thanh lịch, nhẹ nhàng.',
      category: catMap['vay-dam'],
      images: [
        'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85',
        'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=900&q=85'
      ],
      price: 790000,
      compareAtPrice: 920000,
      featured: true,
      tags: ['dress', 'elegant', 'office', 'dam-so-mi'],
      salesCount: 11,
      status: 'active',
      variants: [
        { sku: 'DRS-CRM-S', size: 'S', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 9, isActive: true },
        { sku: 'DRS-CRM-M', size: 'M', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 14, isActive: true },
        { sku: 'DRS-GRN-M', size: 'M', color: 'Xanh rêu', colorHex: '#3f6212', quantity: 8, isActive: true }
      ]
    },
    {
      name: 'Chân váy midi xếp ly Grace',
      slug: 'chan-vay-midi-xep-ly-grace',
      description: 'Chân váy dáng midi xòe nhẹ xếp ly tỉ mỉ, cạp thun co giãn thoải mái cho ngày dài làm việc.',
      category: catMap['vay-dam'],
      images: [
        'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=85'
      ],
      price: 520000,
      compareAtPrice: 590000,
      featured: false,
      tags: ['skirt', 'midi', 'feminine'],
      salesCount: 5,
      status: 'active',
      variants: [
        { sku: 'SKT-BLK-S', size: 'S', color: 'Đen', colorHex: '#18181b', quantity: 11, isActive: true },
        { sku: 'SKT-BEI-M', size: 'M', color: 'Be caramel', colorHex: '#d97706', quantity: 15, isActive: true }
      ]
    },
    {
      name: 'Áo Blazer Oversized Modern',
      slug: 'ao-blazer-oversized-modern',
      description: 'Blazer dáng rộng 2 hàng khuy mang phong cách menswear thời thượng, lót lụa mềm mại tạo cảm giác cao cấp.',
      category: catMap['ao-khoac-blazer'],
      images: [
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85'
      ],
      price: 1150000,
      compareAtPrice: 1350000,
      featured: true,
      tags: ['blazer', 'outerwear', 'menswear', 'chic'],
      salesCount: 12,
      status: 'active',
      variants: [
        { sku: 'BLZ-BLK-S', size: 'S', color: 'Đen tuyền', colorHex: '#18181b', quantity: 8, isActive: true },
        { sku: 'BLZ-BLK-M', size: 'M', color: 'Đen tuyền', colorHex: '#18181b', quantity: 12, isActive: true },
        { sku: 'BLZ-GRY-L', size: 'L', color: 'Xám kẻ caro', colorHex: '#64748b', quantity: 6, isActive: true }
      ]
    },
    {
      name: 'Áo khoác dạ ngắn dáng suông',
      slug: 'ao-khoac-da-ngan-dang-suong',
      description: 'Áo khoác chất dạ ép mịn giữ ấm tốt, cúc đồng kim loại cổ điển tạo điểm nhấn sang trọng cho mùa thu đông.',
      category: catMap['ao-khoac-blazer'],
      images: [
        'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=85'
      ],
      price: 1390000,
      compareAtPrice: 1600000,
      featured: true,
      tags: ['jacket', 'winter', 'wool'],
      salesCount: 4,
      status: 'active',
      variants: [
        { sku: 'COAT-BRN-S', size: 'S', color: 'Nâu camel', colorHex: '#b45309', quantity: 7, isActive: true },
        { sku: 'COAT-BRN-M', size: 'M', color: 'Nâu camel', colorHex: '#b45309', quantity: 9, isActive: true }
      ]
    },
    {
      name: 'Túi canvas Everyday Tote',
      slug: 'tui-canvas-everyday-tote',
      description: 'Túi tote vải canvas 12oz dày dặn có khóa kéo miệng và ngăn nhỏ đựng ví/điện thoại, in slogan FITZY tối giản.',
      category: catMap['phu-kien'],
      images: [
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85'
      ],
      price: 249000,
      compareAtPrice: 290000,
      featured: false,
      tags: ['bag', 'canvas', 'tote', 'casual'],
      salesCount: 22,
      status: 'active',
      variants: [
        { sku: 'BAG-CRM-U', size: 'Free Size', color: 'Kem tự nhiên', colorHex: '#fef08a', quantity: 30, isActive: true },
        { sku: 'BAG-BLK-U', size: 'Free Size', color: 'Đen', colorHex: '#18181b', quantity: 25, isActive: true }
      ]
    },
    {
      name: 'Mũ lưỡi trai Cotton Twill Minimal',
      slug: 'mu-luoi-trai-cotton-twill-minimal',
      description: 'Mũ lưỡi trai vải cotton twill mềm mại, quai gài kim loại điều chỉnh kích cỡ linh hoạt.',
      category: catMap['phu-kien'],
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85'
      ],
      price: 199000,
      compareAtPrice: 250000,
      featured: false,
      tags: ['cap', 'hat', 'accessory'],
      salesCount: 15,
      status: 'active',
      variants: [
        { sku: 'CAP-BLK-U', size: 'Free Size', color: 'Đen', colorHex: '#18181b', quantity: 20, isActive: true },
        { sku: 'CAP-KHK-U', size: 'Free Size', color: 'Kaki', colorHex: '#d4d4d8', quantity: 18, isActive: true }
      ]
    }
  ];

  const seededProducts = [];
  for (const product of productsData) {
    const p = await Product.findOneAndUpdate(
      { slug: product.slug },
      { $set: product },
      { upsert: true, new: true }
    );
    seededProducts.push(p);
  }
  console.log(`Seeded ${seededProducts.length} products.`);

  const prodMap = Object.fromEntries(seededProducts.map(p => [p.slug, p]));

  // 5. SEED ORDERS WITH REALISTIC TIMESTAMPS (For Dashboard analytics & order management)
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const ordersData = [
    {
      orderNumber: 'FZ26110101',
      user: seededCustomers[0]._id, // customer@fitzy.local
      items: [
        {
          product: prodMap['ao-thun-essential-relaxed']._id,
          variantId: prodMap['ao-thun-essential-relaxed'].variants[0]._id,
          name: prodMap['ao-thun-essential-relaxed'].name,
          image: prodMap['ao-thun-essential-relaxed'].images[0],
          size: prodMap['ao-thun-essential-relaxed'].variants[0].size,
          color: prodMap['ao-thun-essential-relaxed'].variants[0].color,
          quantity: 2,
          unitPrice: prodMap['ao-thun-essential-relaxed'].price
        },
        {
          product: prodMap['tui-canvas-everyday-tote']._id,
          variantId: prodMap['tui-canvas-everyday-tote'].variants[0]._id,
          name: prodMap['tui-canvas-everyday-tote'].name,
          image: prodMap['tui-canvas-everyday-tote'].images[0],
          size: prodMap['tui-canvas-everyday-tote'].variants[0].size,
          color: prodMap['tui-canvas-everyday-tote'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['tui-canvas-everyday-tote'].price
        }
      ],
      shipping: {
        recipient: 'Khách hàng FITZY Demo',
        phone: '0901234567',
        line1: '12 Nguyễn Huệ',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh'
      },
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      subtotal: 907000,
      discount: 90700,
      shippingFee: 0,
      total: 816300,
      promotionCode: 'FITZY10',
      status: 'completed',
      createdAt: new Date(now - 1 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 3 * dayMs), note: 'Đơn hàng được tạo thành công.' },
        { status: 'confirmed', at: new Date(now - 2.5 * dayMs), note: 'Cửa hàng đã xác nhận đơn.' },
        { status: 'preparing', at: new Date(now - 2 * dayMs), note: 'Đang đóng gói sản phẩm.' },
        { status: 'shipping', at: new Date(now - 1.5 * dayMs), note: 'Đơn hàng đang giao.' },
        { status: 'completed', at: new Date(now - 1 * dayMs), note: 'Giao hàng thành công, đã thu tiền COD.' }
      ]
    },
    {
      orderNumber: 'FZ26110102',
      user: seededCustomers[1]._id, // nguyenan@fitzy.local
      items: [
        {
          product: prodMap['so-mi-linen-daily-fit']._id,
          variantId: prodMap['so-mi-linen-daily-fit'].variants[0]._id,
          name: prodMap['so-mi-linen-daily-fit'].name,
          image: prodMap['so-mi-linen-daily-fit'].images[0],
          size: prodMap['so-mi-linen-daily-fit'].variants[0].size,
          color: prodMap['so-mi-linen-daily-fit'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['so-mi-linen-daily-fit'].price
        },
        {
          product: prodMap['ao-blazer-oversized-modern']._id,
          variantId: prodMap['ao-blazer-oversized-modern'].variants[0]._id,
          name: prodMap['ao-blazer-oversized-modern'].name,
          image: prodMap['ao-blazer-oversized-modern'].images[0],
          size: prodMap['ao-blazer-oversized-modern'].variants[0].size,
          color: prodMap['ao-blazer-oversized-modern'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['ao-blazer-oversized-modern'].price
        }
      ],
      shipping: {
        recipient: 'Nguyễn Văn An',
        phone: '0912345678',
        line1: '88 Kim Mã',
        ward: 'Kim Mã',
        district: 'Ba Đình',
        city: 'Hà Nội'
      },
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      subtotal: 1699000,
      discount: 100000,
      shippingFee: 0,
      total: 1599000,
      promotionCode: 'FITZY10',
      status: 'completed',
      createdAt: new Date(now - 4 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 6 * dayMs), note: 'Chờ khách chuyển khoản.' },
        { status: 'confirmed', at: new Date(now - 5.5 * dayMs), note: 'Đã nhận chuyển khoản ngân hàng.' },
        { status: 'preparing', at: new Date(now - 5 * dayMs), note: 'Đang chuẩn bị sản phẩm.' },
        { status: 'shipping', at: new Date(now - 4.5 * dayMs), note: 'Đã giao cho đơn vị vận chuyển.' },
        { status: 'completed', at: new Date(now - 4 * dayMs), note: 'Khách hàng đã nhận đơn thành công.' }
      ]
    },
    {
      orderNumber: 'FZ26110103',
      user: seededCustomers[2]._id, // tranthib@fitzy.local
      items: [
        {
          product: prodMap['quan-ong-suong-studio-pleated']._id,
          variantId: prodMap['quan-ong-suong-studio-pleated'].variants[0]._id,
          name: prodMap['quan-ong-suong-studio-pleated'].name,
          image: prodMap['quan-ong-suong-studio-pleated'].images[0],
          size: prodMap['quan-ong-suong-studio-pleated'].variants[0].size,
          color: prodMap['quan-ong-suong-studio-pleated'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['quan-ong-suong-studio-pleated'].price
        }
      ],
      shipping: {
        recipient: 'Trần Thị Bình',
        phone: '0987654321',
        line1: '45 Lê Duẩn',
        ward: 'Hải Châu 1',
        district: 'Hải Châu',
        city: 'Đà Nẵng'
      },
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      subtotal: 690000,
      discount: 50000,
      shippingFee: 0,
      total: 640000,
      promotionCode: 'WELCOME50',
      status: 'completed',
      createdAt: new Date(now - 10 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 12 * dayMs), note: 'Đơn hàng mới tạo.' },
        { status: 'confirmed', at: new Date(now - 11.5 * dayMs), note: 'Cửa hàng đã xác nhận.' },
        { status: 'preparing', at: new Date(now - 11 * dayMs), note: 'Đóng gói sản phẩm.' },
        { status: 'shipping', at: new Date(now - 10.5 * dayMs), note: 'Đang vận chuyển.' },
        { status: 'completed', at: new Date(now - 10 * dayMs), note: 'Đã giao hàng và thanh toán COD.' }
      ]
    },
    {
      orderNumber: 'FZ26110104',
      user: seededCustomers[1]._id,
      items: [
        {
          product: prodMap['dam-so-mi-that-eo-elegant']._id,
          variantId: prodMap['dam-so-mi-that-eo-elegant'].variants[0]._id,
          name: prodMap['dam-so-mi-that-eo-elegant'].name,
          image: prodMap['dam-so-mi-that-eo-elegant'].images[0],
          size: prodMap['dam-so-mi-that-eo-elegant'].variants[0].size,
          color: prodMap['dam-so-mi-that-eo-elegant'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['dam-so-mi-that-eo-elegant'].price
        }
      ],
      shipping: {
        recipient: 'Nguyễn Văn An',
        phone: '0912345678',
        line1: '88 Kim Mã',
        ward: 'Kim Mã',
        district: 'Ba Đình',
        city: 'Hà Nội'
      },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      subtotal: 790000,
      discount: 0,
      shippingFee: 0,
      total: 790000,
      status: 'shipping',
      createdAt: new Date(now - 0.5 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 1 * dayMs), note: 'Đơn hàng mới tạo.' },
        { status: 'confirmed', at: new Date(now - 0.8 * dayMs), note: 'Cửa hàng xác nhận.' },
        { status: 'preparing', at: new Date(now - 0.6 * dayMs), note: 'Đang chuẩn bị hàng.' },
        { status: 'shipping', at: new Date(now - 0.5 * dayMs), note: 'Shipper đang giao tới địa chỉ nhận.' }
      ]
    },
    {
      orderNumber: 'FZ26110105',
      user: seededCustomers[0]._id,
      items: [
        {
          product: prodMap['ao-polo-det-kim-vintage']._id,
          variantId: prodMap['ao-polo-det-kim-vintage'].variants[0]._id,
          name: prodMap['ao-polo-det-kim-vintage'].name,
          image: prodMap['ao-polo-det-kim-vintage'].images[0],
          size: prodMap['ao-polo-det-kim-vintage'].variants[0].size,
          color: prodMap['ao-polo-det-kim-vintage'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['ao-polo-det-kim-vintage'].price
        }
      ],
      shipping: {
        recipient: 'Khách hàng FITZY Demo',
        phone: '0901234567',
        line1: '12 Nguyễn Huệ',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh'
      },
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      subtotal: 429000,
      discount: 0,
      shippingFee: 30000,
      total: 459000,
      status: 'preparing',
      createdAt: new Date(now - 0.2 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 0.4 * dayMs), note: 'Chờ thanh toán chuyển khoản.' },
        { status: 'confirmed', at: new Date(now - 0.3 * dayMs), note: 'Admin đã xác nhận nhận chuyển khoản.' },
        { status: 'preparing', at: new Date(now - 0.2 * dayMs), note: 'Kho đang chuẩn bị đơn.' }
      ]
    },
    {
      orderNumber: 'FZ26110106',
      user: seededCustomers[0]._id,
      items: [
        {
          product: prodMap['mu-luoi-trai-cotton-twill-minimal']._id,
          variantId: prodMap['mu-luoi-trai-cotton-twill-minimal'].variants[0]._id,
          name: prodMap['mu-luoi-trai-cotton-twill-minimal'].name,
          image: prodMap['mu-luoi-trai-cotton-twill-minimal'].images[0],
          size: prodMap['mu-luoi-trai-cotton-twill-minimal'].variants[0].size,
          color: prodMap['mu-luoi-trai-cotton-twill-minimal'].variants[0].color,
          quantity: 1,
          unitPrice: prodMap['mu-luoi-trai-cotton-twill-minimal'].price
        }
      ],
      shipping: {
        recipient: 'Khách hàng FITZY Demo',
        phone: '0901234567',
        line1: '12 Nguyễn Huệ',
        ward: 'Bến Nghé',
        district: 'Quận 1',
        city: 'TP. Hồ Chí Minh'
      },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      subtotal: 199000,
      discount: 0,
      shippingFee: 30000,
      total: 229000,
      status: 'cancelled',
      cancelledAt: new Date(now - 2 * dayMs),
      createdAt: new Date(now - 2.5 * dayMs),
      statusHistory: [
        { status: 'pending', at: new Date(now - 2.5 * dayMs), note: 'Đơn hàng đã được tạo.' },
        { status: 'cancelled', at: new Date(now - 2 * dayMs), note: 'Khách hàng đổi ý, đã hủy đơn và hoàn tồn kho.' }
      ]
    }
  ];

  const seededOrders = [];
  for (const orderData of ordersData) {
    const o = await Order.findOneAndUpdate(
      { orderNumber: orderData.orderNumber },
      { $set: orderData },
      { upsert: true, new: true }
    );
    seededOrders.push(o);
  }
  console.log(`Seeded ${seededOrders.length} sample orders.`);

  // 6. SEED REVIEWS (Linked to completed orders)
  const reviewsData = [
    {
      product: prodMap['ao-thun-essential-relaxed']._id,
      user: seededCustomers[0]._id,
      order: seededOrders[0]._id,
      rating: 5,
      comment: 'Chất cotton dày dặn vừa phải, mặc rất mát và form rộng rãi đúng gu. Mình giặt máy thử vẫn giữ form rất tốt.',
      status: 'visible'
    },
    {
      product: prodMap['tui-canvas-everyday-tote']._id,
      user: seededCustomers[0]._id,
      order: seededOrders[0]._id,
      rating: 5,
      comment: 'Túi to đựng vừa cả laptop 14 inch và vài quyển sổ. Vải canvas dày, đường may sắc nét.',
      status: 'visible'
    },
    {
      product: prodMap['so-mi-linen-daily-fit']._id,
      user: seededCustomers[1]._id,
      order: seededOrders[1]._id,
      rating: 4,
      comment: 'Chất linen thoáng mát, màu be tự nhiên rất nhã nhặn. Mặc đi làm công sở lịch sự thoải mái.',
      status: 'visible'
    },
    {
      product: prodMap['quan-ong-suong-studio-pleated']._id,
      user: seededCustomers[2]._id,
      order: seededOrders[2]._id,
      rating: 5,
      comment: 'Ống suông rủ mềm mại, hack chân dài cực đỉnh! Bạn nào thích phong cách tối giản thanh lịch thì nên mua ngay nhé.',
      status: 'visible'
    },
    {
      product: prodMap['ao-blazer-oversized-modern']._id,
      user: seededCustomers[1]._id,
      order: seededOrders[1]._id,
      rating: 5,
      comment: 'Form áo đứng, vai đệm vừa vặn không bị thô. Màu sắc đẹp hơn trong ảnh. Đánh giá 10/10.',
      status: 'hidden' // Để Admin test chức năng duyệt / hiển thị đánh giá
    }
  ];

  for (const rev of reviewsData) {
    await Review.findOneAndUpdate(
      { user: rev.user, product: rev.product },
      { $set: rev },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${reviewsData.length} product reviews.`);

  // 7. SEED POSTS (4 lookbook & styling articles with cover photos)
  const postsData = [
    {
      title: 'Phối đồ tối giản mỗi ngày: Nghệ thuật của sự tinh tế',
      slug: 'phoi-do-toi-gian-moi-ngay',
      excerpt: 'Một vài nguyên tắc vàng để xây dựng tủ đồ linh hoạt và không bao giờ lỗi mốt.',
      content: 'Phong cách tối giản (Minimalism) không đơn thuần là mặc ít màu sắc, mà là việc lựa chọn những món đồ vừa vặn, chất liệu cao cấp và có tính ứng dụng cao.\n\nHãy bắt đầu từ những chiếc áo thun cotton phom relaxed, sơ mi linen thoáng khí và một chiếc quần tây ống suông xếp ly. Bạn sẽ dễ dàng kết hợp chúng trong mọi hoàn cảnh, từ công sở đến những buổi hẹn hò cuối tuần.',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
      status: 'published',
      publishedAt: new Date(now - 14 * dayMs)
    },
    {
      title: 'Xu hướng Capsule Wardrobe: Tối ưu tủ đồ chỉ với 10 món cơ bản',
      slug: 'xu-huong-capsule-wardrobe',
      excerpt: 'Bí quyết giải phóng không gian tủ áo và tiết kiệm thời gian chọn đồ mỗi sáng.',
      content: 'Capsule Wardrobe là khái niệm xây dựng tủ quần áo tinh gọn gồm những món đồ dễ dàng mix & match với nhau.\n\nChỉ với 1 chiếc blazer đen, 2 áo thun cơ bản, 1 sơ mi trắng, 1 quần âu, 1 quần jeans và chân váy midi, bạn có thể tạo ra hơn 20 outfit hoàn toàn khác biệt cho cả tuần làm việc và thư giãn.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
      status: 'published',
      publishedAt: new Date(now - 7 * dayMs)
    },
    {
      title: 'Bí quyết chọn size quần ống suông tôn dáng cho từng dáng người',
      slug: 'bi-quyet-chon-size-quan-ong-suong',
      excerpt: 'Làm thế nào để diện quần suông hack chiều cao mà không bị nuốt dáng?',
      content: 'Quần ống suông (Wide-leg pants) là món đồ quyền lực giúp đôi chân trông dài hơn đáng kể. Khi chọn quần, hãy ưu tiên các mẫu cạp cao qua rốn và chiều dài chạm mu bàn chân.\n\nKết hợp cùng giày mũi nhọn hoặc sneaker đế bánh mì sẽ tạo cảm giác tỷ lệ cơ thể cân đối và thanh thoát hơn rất nhiều.',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
      status: 'published',
      publishedAt: new Date(now - 3 * dayMs)
    },
    {
      title: 'Hướng dẫn chăm sóc và giặt ủi chất liệu Linen bền đẹp như mới',
      slug: 'huong-dan-cham-soc-chat-lieu-linen',
      excerpt: 'Mẹo giữ độ mềm tự nhiên và nếp nhăn duyên dáng đặc trưng của sợi lanh tự nhiên.',
      content: 'Linen là loại vải tự nhiên cao cấp với độ thoáng khí vượt trội, nhưng đòi hỏi sự chăm sóc đúng cách.\n\nNên giặt bằng nước lạnh với chế độ nhẹ nhàng, phơi trong bóng râm thoáng gió và ủi khi vải còn ẩm nhẹ để giữ phom dáng sơ mi luôn mềm mại, sang trọng.',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85',
      status: 'published',
      publishedAt: new Date(now - 1 * dayMs)
    }
  ];

  for (const post of postsData) {
    await Post.findOneAndUpdate(
      { slug: post.slug },
      { $set: post },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${postsData.length} articles.`);

  // 8. SEED PROMOTIONS (Diverse promotion types & codes)
  const promotionsData = [
    {
      code: 'FITZY10',
      discountType: 'percent',
      discountValue: 10,
      minimumOrder: 300000,
      maximumDiscount: 100000,
      startsAt: new Date(now - 30 * dayMs),
      endsAt: new Date(now + 365 * dayMs),
      usageLimit: 500,
      usedCount: 2,
      active: true
    },
    {
      code: 'WELCOME50',
      discountType: 'fixed',
      discountValue: 50000,
      minimumOrder: 250000,
      maximumDiscount: 50000,
      startsAt: new Date(now - 30 * dayMs),
      endsAt: new Date(now + 180 * dayMs),
      usageLimit: 200,
      usedCount: 1,
      active: true
    },
    {
      code: 'FREESHIP',
      discountType: 'fixed',
      discountValue: 30000,
      minimumOrder: 200000,
      maximumDiscount: 30000,
      startsAt: new Date(now - 10 * dayMs),
      endsAt: new Date(now + 90 * dayMs),
      usageLimit: 1000,
      usedCount: 0,
      active: true
    },
    {
      code: 'VIP20',
      discountType: 'percent',
      discountValue: 20,
      minimumOrder: 600000,
      maximumDiscount: 200000,
      startsAt: new Date(now - 10 * dayMs),
      endsAt: new Date(now + 60 * dayMs),
      usageLimit: 100,
      usedCount: 0,
      active: true
    },
    {
      code: 'EXPIRED30',
      discountType: 'percent',
      discountValue: 30,
      minimumOrder: 500000,
      maximumDiscount: 150000,
      startsAt: new Date(now - 60 * dayMs),
      endsAt: new Date(now - 5 * dayMs), // Đã hết hạn để test logic kiểm tra mã hết hạn
      usageLimit: 50,
      usedCount: 50,
      active: true
    }
  ];

  for (const promo of promotionsData) {
    await Promotion.findOneAndUpdate(
      { code: promo.code },
      { $set: promo },
      { upsert: true, new: true }
    );
  }
  console.log(`Seeded ${promotionsData.length} promotions.`);

  console.log('----------------------------------------------------');
  console.log('FITZY DEMO SEED COMPLETED SUCCESSFULLY!');
  console.log(`Admin email: ${adminEmail}`);
  console.log('Customer demo email: customer@fitzy.local');
  console.log('Customer password: Customer@Fitzy2026!');
  console.log('----------------------------------------------------');
}

seed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
