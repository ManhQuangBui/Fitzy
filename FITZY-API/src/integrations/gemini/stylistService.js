const Product = require('../../models/Product');
const Category = require('../../models/Category');

const model = () => process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const clean = value => String(value || '').trim().slice(0, 300);

function formatVnd(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(val) || 0);
}

function generateContextualAdvice({ gender, season, occasion, style, colors, products, budget, isBudgetOverflow }) {
  const top = products?.[0];
  const bottom = products?.[1];
  const topName = top?.name || 'Áo';
  const bottomName = bottom?.name || 'Quần';
  const totalPrice = (top?.price || 0) + (bottom?.price || 0);

  const isFemale = /nữ|women/i.test(gender);
  const isWork = /thanh lịch|công sở|đi làm/i.test(`${style} ${occasion}`);
  const isParty = /tiệc|hẹn hò|sang trọng/i.test(`${style} ${occasion}`);
  const isTopBlazer = /blazer|măng tô|khoác/i.test(topName);
  const isTopShirt = /sơ mi|oxford|linen/i.test(topName);
  const isTopPolo = /polo/i.test(topName);

  let shoeTip = '';
  if (isFemale) {
    if (isWork) {
      shoeTip = 'Hoàn thiện set đồ với giày cao gót mũi nhọn 3-5cm hoặc giày búp bê da mũi vuông thanh lịch, kết hợp túi xách công sở phom đứng đựng vừa tài liệu.';
    } else if (isParty) {
      shoeTip = 'Phối cùng sandal quai mảnh ánh kim, khuyên tai đính đá nhỏ và clutch cầm tay sang trọng để tạo điểm nhấn quý phái.';
    } else {
      shoeTip = 'Kết hợp cùng sneaker trắng phom gọn hoặc mule da đế bệt, mang kèm túi canvas tiện lợi cho ngày dài năng động.';
    }
  } else {
    if (isWork) {
      if (isTopBlazer) {
        shoeTip = 'Đi cùng giày tây Derby hoặc Oxford da bóng chỉn chu, kết hợp đồng hồ dây da kim loại tạo thần thái đĩnh đạc, chuyên nghiệp.';
      } else if (isTopShirt) {
        shoeTip = 'Gợi ý sơ vin gọn gàng, phối cùng giày da tối giản hoặc sneaker da trắng trơn, chọn thắt lưng tiệp màu giày để tổng thể hài hòa.';
      } else if (isTopPolo) {
        shoeTip = 'Kết hợp cùng giày slip-on da hoặc sneaker trắng thanh lịch, giữ vẻ ngoài smart-casual trẻ trung mà vẫn lịch thiệp.';
      } else {
        shoeTip = 'Phối cùng giày tây Derby da mịn hoặc sneaker da tối giản phom gọn, kết hợp thắt lưng da để tạo vẻ ngoài chỉn chu nơi công sở.';
      }
    } else if (isParty) {
      shoeTip = 'Lựa chọn giày da Derby bóng hoặc Chelsea boot phom ôm, phối thêm đồng hồ kim loại tạo vẻ ngoài cuốn hút và nam tính.';
    } else {
      shoeTip = 'Đi cùng sneaker đế êm năng động, phối thêm túi đeo chéo hoặc mũ lưỡi trai tối giản cho buổi dạo phố thoải mái.';
    }
  }

  let weatherTip = '';
  if (/đông|lạnh|winter|se lạnh/i.test(season)) {
    weatherTip = 'Vào những ngày se lạnh, bạn có thể khoác thêm blazer dạ hoặc cardigan dệt kim mỏng để giữ ấm vừa vặn.';
  } else if (/hè|nắng|summer/i.test(season)) {
    weatherTip = 'Chất liệu thoáng mát giúp bạn luôn tự tin, dễ chịu suốt cả ngày dài dưới thời tiết nhiệt đới.';
  } else {
    weatherTip = 'Tông màu và phom dáng hài hòa, thích hợp cho thời tiết giao mùa mát mẻ.';
  }

  let budgetNote = '';
  if (isBudgetOverflow && budget && totalPrice > budget) {
    budgetNote = `(Lưu ý: Kho chưa có set đồ dưới ${formatVnd(budget)}, đây là set tiết kiệm nhất hiện có: ${formatVnd(totalPrice)}). `;
  }

  return `${budgetNote}Set đồ kết hợp ăn ý giữa ${topName} và ${bottomName} theo phong cách ${style || 'tối giản'}. ${weatherTip} ${shoeTip}`;
}

async function deriveKeywords(input, outfit, isBudgetOverflow) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      keywords: [input.occasion, input.style, input.colors, input.gender, input.season].filter(Boolean),
      advice: generateContextualAdvice({
        gender: input.gender,
        season: input.season,
        occasion: input.occasion,
        style: input.style,
        colors: input.colors,
        budget: Number(input.budget),
        isBudgetOverflow,
        products: outfit
      })
    };
  }

  const prompt = `You are an expert fashion stylist for the clothing brand FITZY.
Return JSON ONLY with keys:
- "advice": string (in Vietnamese, 40-70 words: specific, sophisticated, practical styling tips on footwear, accessories like watch/belt/bag, and how to wear this exact outfit. Avoid clichés like "xắn nhẹ 1 nấc tay áo sơ mi" or "giày loafer da nâu").
- "keywords": array of 3 short clothing/color terms.
Customer context:
- Gender: ${clean(input.gender) || 'Unisex'}
- Season/Weather: ${clean(input.season) || 'Bốn mùa'}
- Occasion: ${clean(input.occasion) || 'Đi làm'}
- Style: ${clean(input.style) || 'Tối giản'}
- Color tone: ${clean(input.colors)}
- Size: ${clean(input.size) || 'M'}
- Chosen outfit items: ${outfit.map(p => p.name).join(' + ')}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.6 } })
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
    const result = JSON.parse(text || '{}');
    return {
      advice: clean(result.advice) || generateContextualAdvice({ ...input, products: outfit, isBudgetOverflow }),
      keywords: Array.isArray(result.keywords) ? result.keywords.map(clean).filter(Boolean).slice(0, 5) : []
    };
  } catch {
    return {
      keywords: [input.occasion, input.style, input.colors, input.gender, input.season].filter(Boolean),
      advice: generateContextualAdvice({ ...input, products: outfit, isBudgetOverflow })
    };
  } finally {
    clearTimeout(timeout);
  }
}

function slugifyText(str) {
  return String(str || '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

async function advise(input) {
  const requestedSize = clean(input.size) || 'M';
  const rawBudget = Number(input.budget);
  const budget = rawBudget > 0 ? rawBudget : Number.MAX_SAFE_INTEGER;
  const minBudget = Number(input.minBudget) || 0;
  const gender = clean(input.gender);
  const season = clean(input.season);
  const occasion = clean(input.occasion);

  // Lọc sản phẩm active có biến thể size, còn hàng và thuộc danh mục đang hoạt động
  const activeCategoryIds = await Category.activeIds();
  const filter = {
    status: 'active',
    category: { $in: activeCategoryIds },
    variants: {
      $elemMatch: {
        isActive: true,
        quantity: { $gt: 0 },
        ...(requestedSize && requestedSize !== 'Free' ? { size: new RegExp(`^${escapeRegExp(requestedSize)}$`, 'i') } : {})
      }
    }
  };

  let products = await Product.find(filter)
    .populate('category', 'name slug')
    .sort({ featured: -1, salesCount: -1 })
    .lean();

  // Điểm số tương thích giới tính, mùa, phong cách
  const targetGender = /nữ|women/i.test(gender) ? 'nu' : /nam|men/i.test(gender) ? 'nam' : null;
  const targetSeason = /đông|lạnh|winter/i.test(season) ? 'thu-dong' : /hè|summer/i.test(season) ? 'xuan-he' : null;
  const isWorkOccasion = /công sở|đi làm|work/i.test(occasion);

  const normalizedStyle = slugifyText(input.style);
  const normalizedOccasion = slugifyText(occasion);
  const normalizedColors = slugifyText(input.colors);

  const scoreProduct = (p) => {
    let score = 0;
    const tags = (p.tags || []).map(t => t.toLowerCase());

    // 1. Giới tính
    if (targetGender) {
      if (tags.includes(targetGender)) score += 6;
      else if (tags.includes('unisex')) score += 3;
      else if (targetGender === 'nam' && tags.includes('nu')) score -= 12;
      else if (targetGender === 'nu' && tags.includes('nam')) score -= 12;
    }

    // 2. Mùa
    if (targetSeason) {
      if (tags.includes(targetSeason)) score += 4;
      else if (tags.includes('bon-mua')) score += 2;
    }

    // 3. Hoàn cảnh (Occasion)
    if (isWorkOccasion) {
      if (tags.includes('di-lam')) score += 6;
      if (tags.includes('dao-pho') && !tags.includes('di-lam')) score -= 6;
      if (/short/i.test(p.slug || p.name)) score -= 14;
    } else if (tags.some(t => normalizedOccasion.includes(t))) {
      score += 4;
    }

    // 4. Phong cách
    if (tags.some(t => normalizedStyle.includes(t))) score += 3;

    // 5. Màu sắc
    if (tags.some(t => normalizedColors.includes(t))) score += 2;

    return score;
  };

  // Phân loại áo và quần theo category slug hoặc tên
  let tops = products.filter(p => p.category?.slug === 'ao' || /áo|shirt|top|polo|blazer|tweed/i.test(p.name));
  let bottoms = products.filter(p => p.category?.slug === 'quan' || /quần|pant|trouser|skirt|váy|short/i.test(p.name));

  tops.sort((a, b) => scoreProduct(b) - scoreProduct(a));
  bottoms.sort((a, b) => scoreProduct(b) - scoreProduct(a));

  const formatItem = (product, roleLabel) => {
    const matchedVariant = product.variants?.find(v =>
      v.isActive && v.quantity > 0 && (!requestedSize || requestedSize === 'Free' || v.size.toLowerCase() === requestedSize.toLowerCase())
    ) || product.variants?.[0] || null;

    return {
      ...product,
      roleLabel,
      matchedVariant
    };
  };

  let outfit = [];
  let isBudgetOverflow = false;

  if (tops.length && bottoms.length) {
    // 1. Tạo tất cả các cặp kết hợp Top + Bottom khả dĩ
    const allPairs = [];
    for (const top of tops) {
      for (const bottom of bottoms) {
        const total = top.price + bottom.price;
        let pairScore = scoreProduct(top) + scoreProduct(bottom);

        // Thưởng điểm nếu tổng giá rơi đúng vào dải ngân sách mong muốn của khách
        if (minBudget > 0 && total >= minBudget && total <= budget) {
          pairScore += 8;
        }

        allPairs.push({
          top,
          bottom,
          total,
          score: pairScore
        });
      }
    }

    // 2. Ưu tiên lọc các cặp có tổng giá <= ngân sách
    const validBudgetPairs = allPairs.filter(pair => pair.total <= budget);

    let selectedPair = null;
    if (validBudgetPairs.length > 0) {
      // Chọn cặp có điểm phù hợp cao nhất trong các cặp thỏa mãn ngân sách
      validBudgetPairs.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (minBudget > 0) {
          return Math.abs(b.total - minBudget) - Math.abs(a.total - minBudget);
        }
        return a.total - b.total;
      });
      selectedPair = validBudgetPairs[0];
    } else {
      // Nếu không có cặp nào <= budget: Chọn cặp có tổng giá thấp nhất trong kho
      allPairs.sort((a, b) => a.total - b.total || b.score - a.score);
      selectedPair = allPairs[0];
      isBudgetOverflow = true;
    }

    const bottomRole = /váy|skirt/i.test(selectedPair.bottom.name) ? 'Chân váy' : 'Quần';
    outfit = [
      formatItem(selectedPair.top, 'Áo chính'),
      formatItem(selectedPair.bottom, bottomRole)
    ];
  } else if (products.length >= 2) {
    outfit = [
      formatItem(products[0], 'Áo chính'),
      formatItem(products[1], 'Quần')
    ];
  } else {
    outfit = products.slice(0, 4).map((p, idx) => formatItem(p, idx === 0 ? 'Áo chính' : 'Phối kèm'));
  }

  const adviceResult = await deriveKeywords(input, outfit, isBudgetOverflow);
  const totalPrice = outfit.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalCompareAtPrice = outfit.reduce((sum, p) => sum + (p.compareAtPrice || p.price || 0), 0);

  return {
    advice: adviceResult.advice,
    matchScore: 98,
    totalPrice,
    totalCompareAtPrice,
    products: outfit,
    usedFallback: !process.env.GEMINI_API_KEY
  };
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { advise, deriveKeywords, model };
