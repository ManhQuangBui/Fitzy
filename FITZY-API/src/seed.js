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
    { name: 'Áo', slug: 'ao', description: 'Áo thiết kế FITZY', status: 'active' },
    { name: 'Quần', slug: 'quan', description: 'Quần & Chân váy thiết kế FITZY', status: 'active' },
    { name: 'Phụ kiện', slug: 'phu-kien', description: 'Phụ kiện thời trang FITZY', status: 'active' }
  ].map(item => Category.findOneAndUpdate({ slug: item.slug }, { $set: item }, { upsert: true, new: true })));

  const ao = categories[0]._id;
  const quan = categories[1]._id;
  const pk = categories[2]._id;

  const catalog = [
    // --- TOP NAM ---
    { name: 'Áo thun Graphic Cotton Basic', slug: 'ao-thun-graphic-cotton-basic', description: 'Áo thun cotton mềm mịn in họa tiết tối giản, phom regular thoáng mát.', category: ao, images: ['https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85'], price: 189000, compareAtPrice: 250000, featured: true, tags: ['nam', 'unisex', 'xuan-he', 'bon-mua', 'toi-gian', 'nang-dong', 'dao-pho', 'trung-tinh', 'don-sac', 'trang'], variants: [{ sku: 'AGR-W-S', size: 'S', color: 'Trắng', colorHex: '#ffffff', quantity: 15 }, { sku: 'AGR-W-M', size: 'M', color: 'Trắng', colorHex: '#ffffff', quantity: 20 }, { sku: 'AGR-W-L', size: 'L', color: 'Trắng', colorHex: '#ffffff', quantity: 18 }, { sku: 'AGR-W-XL', size: 'XL', color: 'Trắng', colorHex: '#ffffff', quantity: 10 }] },
    { name: 'Áo thun Essential Relaxed', slug: 'ao-thun-essential', description: 'Áo thun cotton 100% định lượng cao, thiết kế tối giản kinh điển của FITZY.', category: ao, images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85'], price: 329000, compareAtPrice: 390000, featured: true, tags: ['nam', 'unisex', 'xuan-he', 'bon-mua', 'toi-gian', 'nang-dong', 'dao-pho', 'trung-tinh', 'don-sac'], variants: [{ sku: 'ESS-W-S', size: 'S', color: 'Trắng', colorHex: '#eeeae0', quantity: 12 }, { sku: 'ESS-W-M', size: 'M', color: 'Trắng', colorHex: '#eeeae0', quantity: 18 }, { sku: 'ESS-W-L', size: 'L', color: 'Trắng', colorHex: '#eeeae0', quantity: 14 }, { sku: 'ESS-B-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 12 }] },
    { name: 'Áo Polo Pique Cổ Điển', slug: 'ao-polo-pique-co-dien', description: 'Áo polo mắt chim thoáng khí, cổ dệt gân đứng dáng lịch lãm.', category: ao, images: ['https://images.unsplash.com/photo-1625910513413-7e3e7f45c8ad?auto=format&fit=crop&w=900&q=85'], price: 380000, compareAtPrice: 450000, featured: false, tags: ['nam', 'xuan-he', 'bon-mua', 'thanh-lich', 'di-lam', 'dao-pho', 'tone-lanh', 'navy'], variants: [{ sku: 'POL-NV-S', size: 'S', color: 'Xanh navy', colorHex: '#1e3a8a', quantity: 10 }, { sku: 'POL-NV-M', size: 'M', color: 'Xanh navy', colorHex: '#1e3a8a', quantity: 15 }, { sku: 'POL-NV-L', size: 'L', color: 'Xanh navy', colorHex: '#1e3a8a', quantity: 12 }] },
    { name: 'Áo Polo Dệt Kim Smart Fit', slug: 'ao-polo-det-kim-smart', description: 'Polo dệt kim sợi viscose cao cấp mát mịn, phong cách công sở hiện đại.', category: ao, images: ['https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85'], price: 480000, compareAtPrice: 550000, featured: true, tags: ['nam', 'bon-mua', 'thanh-lich', 'di-lam', 'tiec', 'tone-dat', 'nau-dat'], variants: [{ sku: 'POL-BR-S', size: 'S', color: 'Nâu đất', colorHex: '#78350f', quantity: 8 }, { sku: 'POL-BR-M', size: 'M', color: 'Nâu đất', colorHex: '#78350f', quantity: 14 }, { sku: 'POL-BR-L', size: 'L', color: 'Nâu đất', colorHex: '#78350f', quantity: 10 }] },
    { name: 'Sơ mi Linen Daily', slug: 'so-mi-linen-daily', description: 'Sơ mi vải đũi linen tự nhiên, phom thoải mái chuẩn quý ông thanh lịch.', category: ao, images: ['https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&q=85'], price: 549000, compareAtPrice: 659000, featured: true, tags: ['nam', 'unisex', 'xuan-he', 'toi-gian', 'thanh-lich', 'di-lam', 'du-lich', 'trung-tinh', 'be'], variants: [{ sku: 'LIN-BE-S', size: 'S', color: 'Be', colorHex: '#c9b99b', quantity: 10 }, { sku: 'LIN-BE-M', size: 'M', color: 'Be', colorHex: '#c9b99b', quantity: 16 }, { sku: 'LIN-BE-L', size: 'L', color: 'Be', colorHex: '#c9b99b', quantity: 12 }] },
    { name: 'Sơ mi Oxford Dài Tay Công Sở', slug: 'so-mi-oxford-dai-tay-cong-so', description: 'Sơ mi vải oxford dệt đan rổ bền bỉ, đứng phom chống nhăn tuyệt đối.', category: ao, images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85'], price: 520000, compareAtPrice: 620000, featured: false, tags: ['nam', 'bon-mua', 'thanh-lich', 'di-lam', 'tiec', 'tone-lanh', 'xanh-nhat'], variants: [{ sku: 'OXF-BLU-S', size: 'S', color: 'Xanh nhạt', colorHex: '#bae6fd', quantity: 8 }, { sku: 'OXF-BLU-M', size: 'M', color: 'Xanh nhạt', colorHex: '#bae6fd', quantity: 12 }, { sku: 'OXF-BLU-L', size: 'L', color: 'Xanh nhạt', colorHex: '#bae6fd', quantity: 10 }] },
    { name: 'Áo Hoodie Nỉ Bông Chân Cua', slug: 'ao-hoodie-ni-bong-chan-cua', description: 'Hoodie nỉ dày 380gsm giữ ấm vượt trội, phom rộng phong cách đường phố.', category: ao, images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=900&q=85'], price: 490000, compareAtPrice: 590000, featured: false, tags: ['nam', 'unisex', 'thu-dong', 'se-lanh', 'nang-dong', 'streetwear', 'dao-pho', 'don-sac', 'den'], variants: [{ sku: 'HD-BLK-S', size: 'S', color: 'Đen', colorHex: '#181818', quantity: 8 }, { sku: 'HD-BLK-M', size: 'M', color: 'Đen', colorHex: '#181818', quantity: 14 }, { sku: 'HD-BLK-L', size: 'L', color: 'Đen', colorHex: '#181818', quantity: 10 }] },
    { name: 'Áo Len Cổ Tròn Dệt Kim Merino', slug: 'ao-len-co-tron-det-kim-merino', description: 'Áo len sợi merino mềm êm không xù lông, giữ ấm nhẹ nhàng mùa se lạnh.', category: ao, images: ['https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?auto=format&fit=crop&w=900&q=85'], price: 550000, compareAtPrice: 650000, featured: true, tags: ['nam', 'unisex', 'thu-dong', 'se-lanh', 'toi-gian', 'thanh-lich', 'tone-dat', 'nau-nhat'], variants: [{ sku: 'LEN-M-S', size: 'S', color: 'Nâu be', colorHex: '#d8c2a5', quantity: 6 }, { sku: 'LEN-M-M', size: 'M', color: 'Nâu be', colorHex: '#d8c2a5', quantity: 12 }, { sku: 'LEN-M-L', size: 'L', color: 'Nâu be', colorHex: '#d8c2a5', quantity: 8 }] },
    { name: 'Áo Blazer Classic Minimal Nam', slug: 'ao-blazer-classic-minimal', description: 'Blazer nam 2 lớp may đo chuẩn phom Ý, nâng tầm phong cách quý ông hiện đại.', category: ao, images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=85'], price: 890000, compareAtPrice: 1050000, featured: true, tags: ['nam', 'thu-dong', 'se-lanh', 'bon-mua', 'thanh-lich', 'di-lam', 'tiec', 'sang-trong', 'don-sac', 'tone-lanh'], variants: [{ sku: 'BLZ-M-S', size: 'S', color: 'Đen', colorHex: '#181818', quantity: 6 }, { sku: 'BLZ-M-M', size: 'M', color: 'Đen', colorHex: '#181818', quantity: 10 }, { sku: 'BLZ-M-L', size: 'L', color: 'Đen', colorHex: '#181818', quantity: 8 }] },
    { name: 'Áo Măng Tô Dạ Dáng Dài Nam', slug: 'ao-mang-to-da-dang-dai-nam', description: 'Áo măng tô dạ cừu 3 lớp giữ nhiệt đại hàn, kiểu dáng trench coat chuẩn Hàn Quốc.', category: ao, images: ['https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=900&q=85'], price: 1350000, compareAtPrice: 1600000, featured: true, tags: ['nam', 'thu-dong', 'co-dien', 'thanh-lich', 'du-lich', 'sang-trong', 'tone-dat', 'camel'], variants: [{ sku: 'MTO-S', size: 'S', color: 'Vàng lạc đà', colorHex: '#b45309', quantity: 4 }, { sku: 'MTO-M', size: 'M', color: 'Vàng lạc đà', colorHex: '#b45309', quantity: 8 }, { sku: 'MTO-L', size: 'L', color: 'Vàng lạc đà', colorHex: '#b45309', quantity: 6 }] },

    // --- QUẦN NAM ---
    { name: 'Quần Short Kaki Dạo Phố', slug: 'quan-short-kaki-dao-pho', description: 'Quần soóc kaki co giãn trên gối, năng động mát mẻ cho mùa hè.', category: quan, images: ['https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=85'], price: 320000, compareAtPrice: 380000, featured: true, tags: ['nam', 'unisex', 'xuan-he', 'nang-dong', 'dao-pho', 'du-lich', 'trung-tinh', 'kaki'], variants: [{ sku: 'SHO-S', size: 'S', color: 'Be', colorHex: '#d8c2a5', quantity: 8 }, { sku: 'SHO-M', size: 'M', color: 'Be', colorHex: '#d8c2a5', quantity: 14 }, { sku: 'SHO-L', size: 'L', color: 'Be', colorHex: '#d8c2a5', quantity: 10 }] },
    { name: 'Quần Chino Slimfit Kaki Co Giãn', slug: 'quan-chino-slimfit-kaki', description: 'Quần kaki ống ôm nhẹ co giãn 4 chiều, phong cách casual công sở trẻ trung.', category: quan, images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85'], price: 490000, compareAtPrice: 580000, featured: false, tags: ['nam', 'bon-mua', 'thanh-lich', 'di-lam', 'dao-pho', 'tone-dat', 'be-dam'], variants: [{ sku: 'CHI-S', size: 'S', color: 'Kaki be', colorHex: '#c9b99b', quantity: 8 }, { sku: 'CHI-M', size: 'M', color: 'Kaki be', colorHex: '#c9b99b', quantity: 12 }, { sku: 'CHI-L', size: 'L', color: 'Kaki be', colorHex: '#c9b99b', quantity: 10 }] },
    { name: 'Quần Jeans Ống Đứng Vintage Indigo', slug: 'quan-jeans-ong-dung-vintage', description: 'Quần denim wash màu chàm cổ điển, chất vải 13.5oz đứng dáng cá tính.', category: quan, images: ['https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85'], price: 580000, compareAtPrice: 660000, featured: true, tags: ['nam', 'unisex', 'bon-mua', 'co-dien', 'nang-dong', 'streetwear', 'dao-pho', 'denim'], variants: [{ sku: 'JNS-S', size: 'S', color: 'Xanh denim', colorHex: '#1d4ed8', quantity: 8 }, { sku: 'JNS-M', size: 'M', color: 'Xanh denim', colorHex: '#1d4ed8', quantity: 15 }, { sku: 'JNS-L', size: 'L', color: 'Xanh denim', colorHex: '#1d4ed8', quantity: 10 }] },
    { name: 'Quần âu Slimfit May Đo', slug: 'quan-au-slimfit-may-do', description: 'Quần âu phom ôm vừa vặn, lưng thun ẩn thông minh không gò bó.', category: quan, images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=85'], price: 590000, compareAtPrice: 680000, featured: false, tags: ['nam', 'bon-mua', 'thanh-lich', 'di-lam', 'tiec', 'sang-trong', 'tone-lanh', 'xam-than'], variants: [{ sku: 'AU-M-S', size: 'S', color: 'Xám khói', colorHex: '#64748b', quantity: 8 }, { sku: 'AU-M-M', size: 'M', color: 'Xám khói', colorHex: '#64748b', quantity: 14 }, { sku: 'AU-M-L', size: 'L', color: 'Xám khói', colorHex: '#64748b', quantity: 10 }] },
    { name: 'Quần ống suông Studio', slug: 'quan-ong-suong-studio', description: 'Quần tây ống suông cạp cao phong cách minimalism đỉnh cao của FITZY.', category: quan, images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85'], price: 690000, compareAtPrice: 790000, featured: true, tags: ['nam', 'nu', 'unisex', 'bon-mua', 'toi-gian', 'thanh-lich', 'di-lam', 'dao-pho', 'don-sac', 'trung-tinh', 'den'], variants: [{ sku: 'STR-S', size: 'S', color: 'Đen', colorHex: '#222222', quantity: 10 }, { sku: 'STR-M', size: 'M', color: 'Đen', colorHex: '#222222', quantity: 18 }, { sku: 'STR-L', size: 'L', color: 'Đen', colorHex: '#222222', quantity: 12 }] },

    // --- TOP NỮ ---
    { name: 'Áo Baby Tee Croptop Retro', slug: 'ao-baby-tee-croptop-retro', description: 'Áo thun ôm croptop phong cách Y2K tôn vòng eo thon.', category: ao, images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=85'], price: 279000, compareAtPrice: 320000, featured: false, tags: ['nu', 'xuan-he', 'nang-dong', 'dao-pho', 'du-lich', 'pastel', 'xanh-baby'], variants: [{ sku: 'TEE-S', size: 'S', color: 'Xanh pastel', colorHex: '#bae6fd', quantity: 10 }, { sku: 'TEE-M', size: 'M', color: 'Xanh pastel', colorHex: '#bae6fd', quantity: 15 }, { sku: 'TEE-L', size: 'L', color: 'Xanh pastel', colorHex: '#bae6fd', quantity: 8 }] },
    { name: 'Áo sơ mi Voan Lụa Thơ Mộng', slug: 'ao-so-mi-voan-lua-tho-mong', description: 'Sơ mi nữ voan tơ tằm óng nhẹ, tay bồng nhẹ nhàng dịu ngọt.', category: ao, images: ['https://images.unsplash.com/photo-1564257631407-4deb129f042b?auto=format&fit=crop&w=900&q=85'], price: 490000, compareAtPrice: 580000, featured: true, tags: ['nu', 'xuan-he', 'thanh-lich', 'toi-gian', 'di-lam', 'tiec', 'pastel', 'hong-phan'], variants: [{ sku: 'VOA-S', size: 'S', color: 'Hồng pastel', colorHex: '#fbcfe8', quantity: 8 }, { sku: 'VOA-M', size: 'M', color: 'Hồng pastel', colorHex: '#fbcfe8', quantity: 14 }, { sku: 'VOA-L', size: 'L', color: 'Hồng pastel', colorHex: '#fbcfe8', quantity: 8 }] },
    { name: 'Áo Sơ Mi Lụa Satin Cổ Nơ Dự Tiệc', slug: 'ao-so-mi-lua-satin-co-no', description: 'Sơ mi satin ánh nhung sang trọng, dải nơ cổ thanh tao cho buổi tiệc tối.', category: ao, images: ['https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=900&q=85'], price: 590000, compareAtPrice: 700000, featured: true, tags: ['nu', 'bon-mua', 'sang-trong', 'thanh-lich', 'tiec', 'vibrant', 'do-do'], variants: [{ sku: 'SAT-S', size: 'S', color: 'Đỏ mận', colorHex: '#991b1b', quantity: 6 }, { sku: 'SAT-M', size: 'M', color: 'Đỏ mận', colorHex: '#991b1b', quantity: 10 }, { sku: 'SAT-L', size: 'L', color: 'Đỏ mận', colorHex: '#991b1b', quantity: 6 }] },
    { name: 'Áo Len Cổ Lọ Dệt Kim Ấm Áp', slug: 'ao-len-co-lo-det-kim', description: 'Áo len sợi dệt kim giữ ấm tuyệt đối, màu nâu tây ấm cúng mùa đông.', category: ao, images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85'], price: 590000, compareAtPrice: 690000, featured: true, tags: ['nu', 'unisex', 'thu-dong', 'se-lanh', 'toi-gian', 'co-dien', 'di-lam', 'du-lich', 'tone-dat'], variants: [{ sku: 'LCL-S', size: 'S', color: 'Nâu nhạt', colorHex: '#b45309', quantity: 8 }, { sku: 'LCL-M', size: 'M', color: 'Nâu nhạt', colorHex: '#b45309', quantity: 12 }, { sku: 'LCL-L', size: 'L', color: 'Nâu nhạt', colorHex: '#b45309', quantity: 8 }] },
    { name: 'Áo Tweed Cúc Đồng Quý Phái', slug: 'ao-tweed-cuc-dong-quy-phai', description: 'Áo khoác dạ tweed tiểu thư, cúc kim loại vintage đậm chất Paris.', category: ao, images: ['https://images.unsplash.com/photo-1548624149-f9b1859aa9d0?auto=format&fit=crop&w=900&q=85'], price: 850000, compareAtPrice: 990000, featured: true, tags: ['nu', 'thu-dong', 'se-lanh', 'co-dien', 'thanh-lich', 'tiec', 'di-lam', 'sang-trong', 'trung-tinh', 'kem'], variants: [{ sku: 'TWD-S', size: 'S', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 8 }, { sku: 'TWD-M', size: 'M', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 12 }, { sku: 'TWD-L', size: 'L', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 6 }] },
    { name: 'Áo Blazer Nữ Phom Suông Hàn Quốc', slug: 'ao-blazer-nu-phom-suong', description: 'Blazer dáng rộng tôn nét phóng khoáng, chất vải tuyết mưa đứng nếp.', category: ao, images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85'], price: 790000, compareAtPrice: 920000, featured: true, tags: ['nu', 'bon-mua', 'se-lanh', 'thanh-lich', 'di-lam', 'dao-pho', 'tone-lanh', 'xam-ghi'], variants: [{ sku: 'BLZ-F-S', size: 'S', color: 'Xám ghi', colorHex: '#64748b', quantity: 8 }, { sku: 'BLZ-F-M', size: 'M', color: 'Xám ghi', colorHex: '#64748b', quantity: 14 }, { sku: 'BLZ-F-L', size: 'L', color: 'Xám ghi', colorHex: '#64748b', quantity: 8 }] },

    // --- QUẦN & CHÂN VÁY NỮ ---
    { name: 'Quần Short Linen Cạp Thun Nữ', slug: 'quan-short-linen-cap-thun-nu', description: 'Quần đùi linen lưng thun dễ chịu, tôn đôi chân thon dài.', category: quan, images: ['https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=900&q=85'], price: 299000, compareAtPrice: 360000, featured: true, tags: ['nu', 'xuan-he', 'nang-dong', 'dao-pho', 'du-lich', 'trung-tinh', 'pastel', 'kem'], variants: [{ sku: 'SHW-S', size: 'S', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 10 }, { sku: 'SHW-M', size: 'M', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 15 }, { sku: 'SHW-L', size: 'L', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 8 }] },
    { name: 'Chân Váy Tennis Xếp Ly Nữ', slug: 'chan-vay-tennis-xep-ly-nu', description: 'Chân váy ngắn xếp ly phom chữ A trẻ trung, có quần trong an toàn.', category: quan, images: ['https://images.unsplash.com/photo-1578932750294-f5075e85f44a?auto=format&fit=crop&w=900&q=85'], price: 320000, compareAtPrice: 390000, featured: true, tags: ['nu', 'xuan-he', 'nang-dong', 'streetwear', 'dao-pho', 'don-sac', 'trung-tinh', 'den'], variants: [{ sku: 'TEN-S', size: 'S', color: 'Đen', colorHex: '#181818', quantity: 10 }, { sku: 'TEN-M', size: 'M', color: 'Đen', colorHex: '#181818', quantity: 14 }, { sku: 'TEN-L', size: 'L', color: 'Đen', colorHex: '#181818', quantity: 8 }] },
    { name: 'Chân Váy Midi Xếp Ly Chữ A', slug: 'chan-vay-midi-xep-ly-chu-a', description: 'Chân váy qua gối xòe nhẹ, tôn nét duyên dáng giấu khuyết điểm hông.', category: quan, images: ['https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=85'], price: 490000, compareAtPrice: 560000, featured: true, tags: ['nu', 'bon-mua', 'thanh-lich', 'co-dien', 'di-lam', 'tiec', 'tone-dat', 'be'], variants: [{ sku: 'VAY-S', size: 'S', color: 'Be đất', colorHex: '#d8c2a5', quantity: 10 }, { sku: 'VAY-M', size: 'M', color: 'Be đất', colorHex: '#d8c2a5', quantity: 16 }, { sku: 'VAY-L', size: 'L', color: 'Be đất', colorHex: '#d8c2a5', quantity: 10 }] },
    { name: 'Quần Âu Nữ Cạp Cao Hack Dáng', slug: 'quan-au-nu-cap-cao-hack-dang', description: 'Quần tây nữ cạp cao kéo dài chân hiệu quả, chất vải tuyết mưa đứng dáng.', category: quan, images: ['https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?auto=format&fit=crop&w=900&q=85'], price: 520000, compareAtPrice: 600000, featured: true, tags: ['nu', 'bon-mua', 'thanh-lich', 'toi-gian', 'di-lam', 'tiec', 'trung-tinh', 'kem'], variants: [{ sku: 'AUF-S', size: 'S', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 8 }, { sku: 'AUF-M', size: 'M', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 14 }, { sku: 'AUF-L', size: 'L', color: 'Trắng kem', colorHex: '#fef3c7', quantity: 8 }] },
    { name: 'Chân Váy Lụa Suông Dài Satin', slug: 'chan-vay-lua-suong-dai-satin', description: 'Chân váy lụa satin rủ dài sang chảnh, thích hợp phối áo len hoặc sơ mi tiệc.', category: quan, images: ['https://images.unsplash.com/photo-1582142306909-195724d33ffc?auto=format&fit=crop&w=900&q=85'], price: 550000, compareAtPrice: 650000, featured: true, tags: ['nu', 'thu-dong', 'bon-mua', 'sang-trong', 'thanh-lich', 'tiec', 'pastel', 'kem-vang'], variants: [{ sku: 'SATV-S', size: 'S', color: 'Vàng kem', colorHex: '#fef3c7', quantity: 6 }, { sku: 'SATV-M', size: 'M', color: 'Vàng kem', colorHex: '#fef3c7', quantity: 10 }, { sku: 'SATV-L', size: 'L', color: 'Vàng kem', colorHex: '#fef3c7', quantity: 6 }] },

    // --- PHỤ KIỆN ---
    { name: 'Túi canvas Everyday', slug: 'tui-canvas-everyday', description: 'Túi tote canvas dày dặn tối giản dùng hàng ngày đựng cả thế giới.', category: pk, images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85'], price: 249000, compareAtPrice: 290000, featured: true, tags: ['unisex', 'nam', 'nu', 'casual', 'everyday', 'trung-tinh'], variants: [{ sku: 'BAG-U', size: 'Free', color: 'Kem', colorHex: '#e9ddc8', quantity: 25 }] },
    { name: 'Túi Da Baguette Kẹp Nách', slug: 'tui-da-baguette-kep-nach', description: 'Túi xách da PU cao cấp kẹp nách thời thượng chuẩn phong cách IT-Girl.', category: pk, images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85'], price: 420000, compareAtPrice: 490000, featured: true, tags: ['nu', 'thanh-lich', 'co-dien', 'tiec', 'di-lam', 'don-sac', 'den'], variants: [{ sku: 'BAG-B-U', size: 'Free', color: 'Đen', colorHex: '#181818', quantity: 18 }] }
  ];

  for (const product of catalog) await Product.findOneAndUpdate({ slug: product.slug }, { $set: product }, { upsert: true, new: true });

  const tuiCanvas = await Product.findOne({ slug: 'tui-canvas-everyday' });
  const quanStudio = await Product.findOne({ slug: 'quan-ong-suong-studio' });

  const postsData = [
    {
      title: 'Phối đồ tối giản mỗi ngày: Xây dựng tủ đồ con nhộng đa ứng dụng',
      slug: 'phoi-do-toi-gian-moi-ngay-tu-do-con-nhong',
      badge: 'Xu hướng 2025',
      category: 'Phối đồ hàng ngày',
      readTime: '5 phút đọc',
      isEditorialPick: true,
      author: { name: 'FITZY Styling Team', avatar: '', role: 'Styling Team' },
      excerpt: 'Chỉ với 8 món đồ cốt lõi từ chất liệu linen và cotton cao cấp, bạn có thể biến hóa linh hoạt hơn 20 bản phối thanh lịch cho cả tuần làm việc và dạo phố.',
      content: 'Triết lý Capsule Wardrobe (Tủ đồ con nhộng) không phải là giới hạn sự sáng tạo của bạn, mà là giải phóng tâm trí khỏi sự bối rối mỗi buổi sáng.\n\n1. Quy tắc chọn màu sắc nền tảng:\nƯu tiên 3 gam màu trung tính cơ bản: Trắng kem, Be nhạt và Đen tuyền. Đây là 3 sắc độ dễ dàng tương hỗ và tôn vinh cấu trúc của từng thớ vải.\n\n2. Sự phối hợp ăn ý giữa Phom dáng và Chất liệu:\nKhi bạn diện một chiếc Quần ống suông Studio có độ rủ mềm, hãy cân bằng lại với một chiếc áo sơ mi linen phom cứng cáp hoặc áo dệt kim ôm vừa vặn.\n\n3. Phụ kiện điểm nhấn:\nMột chiếc túi tote canvas viền da hoặc thắt lưng da mảnh là chìa khóa tạo nên chiều sâu thị giác mà không làm mất đi vẻ tinh giản vốn có.',
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
      status: 'published',
      publishedAt: new Date()
    },
    {
      title: 'Bí quyết chọn túi Canvas kết hợp da: Nét cổ điển cho trang phục hiện đại',
      slug: 'bi-quyet-chon-tui-canvas-ket-hop-da',
      badge: 'Phụ kiện',
      category: 'Xu hướng mới',
      readTime: '4 phút đọc',
      isEditorialPick: false,
      author: { name: 'Minh An', avatar: '', role: 'Fashion Editor' },
      excerpt: 'Sự hòa quyện giữa chất liệu vải mộc thô mộc và đường may viền da sang trọng mang đến phong thái tự tin, phóng khoáng cho mọi quý cô thành thị.',
      content: 'Vải canvas dày dặn dệt chéo kết hợp cùng các chi tiết quai da bò thuộc tạo nên cảm giác hoài niệm cổ điển (vintage aesthetic) nhưng vẫn vô cùng hiện đại khi kết hợp với âu phục công sở hoặc trang phục dạo phố cuối tuần.',
      image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=85',
      status: 'published',
      publishedAt: new Date(Date.now() - 2 * 86400000)
    },
    {
      title: 'Quần ống suông Studio: Cách tôn dáng đỉnh cao cho quý cô tối giản',
      slug: 'quan-ong-suong-studio-cach-ton-dang-dinh-cao',
      badge: 'Phong cách làm việc',
      category: 'Phối đồ hàng ngày',
      readTime: '3 phút đọc',
      isEditorialPick: false,
      tags: ['#SmartCasual', '#FitzyMinimal'],
      author: { name: 'Hoàng My', avatar: '', role: 'Senior Stylist' },
      excerpt: 'Khám phá 5 công thức phối quần ống suông be sáng cùng sơ mi lụa hoặc áo len dệt kim mỏng để tạo tỉ lệ cơ thể cân đối và đôi chân thon dài.',
      content: 'Với cạp cao ngang rốn và đường xếp ly tinh tế, Quần ống suông Studio khéo léo che đi khuyết điểm đùi và tôn lên vòng eo thon. Khi sơ vin cùng sơ mi lụa hoặc áo thun Supima, bạn đã có ngay một diện mạo chuẩn mực công sở thanh tao.',
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85',
      spotlightImages: [
        tuiCanvas?.images?.[0] || 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=600&q=85',
        quanStudio?.images?.[0] || 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=85'
      ],
      relatedProducts: [tuiCanvas?._id, quanStudio?._id].filter(Boolean),
      status: 'published',
      publishedAt: new Date(Date.now() - 4 * 86400000)
    },
    {
      title: 'Bảng màu trung tính ấm (Warm Neutral): Xu hướng màu sắc định hình năm nay',
      slug: 'bang-mau-trung-tinh-am-warm-neutral',
      badge: 'Màu sắc',
      category: 'Màu sắc & Chất liệu',
      readTime: '6 phút đọc',
      isEditorialPick: false,
      author: { name: 'Thảo Linh', avatar: '', role: 'Color Specialist' },
      excerpt: 'Từ sắc cát sa mạc (Sand), nâu caramel đến be yến mạch - cách phối layer đơn sắc nhưng không hề nhàm chán cho tiết trời giao mùa.',
      content: 'Màu trung tính ấm mang đến cảm giác gần gũi, dịu mắt và giàu năng lượng thư thái. Bí quyết để không bị "chìm" là tạo sự tương phản về bề mặt chất liệu: áo len thô phối cùng chân váy lụa trơn nhẵn.',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85',
      status: 'published',
      publishedAt: new Date(Date.now() - 6 * 86400000)
    },
    {
      title: 'Tại sao sợi Linen tự nhiên là linh hồn của phong cách thời trang bền vững?',
      slug: 'tai-sao-soi-linen-tu-nhien-la-linh-hon-thoi-trang-ben-vung',
      badge: 'Chất liệu',
      category: 'Chăm sóc vải',
      readTime: '3 phút đọc',
      isEditorialPick: false,
      author: { name: 'FITZY Eco', avatar: '', role: 'Fabric Specialist' },
      excerpt: 'Được dệt từ thân cây lanh tự nhiên, vải linen không chỉ mang lại sự thoáng khí tuyệt đối cho ngày hè mà còn càng mềm mại, quyến rũ hơn sau mỗi lần giặt.',
      content: 'Vết nhăn tự nhiên của vải Linen không phải là khuyết điểm, mà là tuyên ngôn của sự thảnh thơi, tự do và lối sống hòa hợp cùng tự nhiên.',
      image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=85',
      status: 'published',
      publishedAt: new Date(Date.now() - 10 * 86400000)
    }
  ];

  for (const post of postsData) {
    await Post.findOneAndUpdate({ slug: post.slug }, { $set: post }, { upsert: true, new: true });
  }
  await Promotion.findOneAndUpdate({ code: 'FITZY10' }, { $setOnInsert: { code: 'FITZY10', discountType: 'percent', discountValue: 10, minimumOrder: 300000, maximumDiscount: 100000, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 365 * 86400000), usageLimit: 100, active: true } }, { upsert: true });
  console.log(`Demo data ready. Seeded ${catalog.length} products. Admin email: ${email}.`);
}

seed().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
