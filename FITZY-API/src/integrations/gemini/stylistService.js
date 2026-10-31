const Product = require('../../models/Product');

const model = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const clean = value => String(value || '').trim().slice(0, 300);

async function deriveKeywords(input) {
  if (!process.env.GEMINI_API_KEY) return { keywords: [input.occasion, input.style, input.colors].filter(Boolean), advice: 'Gợi ý theo phong cách FITZY dựa trên danh mục sản phẩm hiện có.' };
  const prompt = `You are a fashion stylist. Return JSON only with keys advice (Vietnamese, max 60 words) and keywords (array of 3 short English or Vietnamese clothing/style/color terms). Do not name products, IDs, prices or sizes. Customer context: occasion=${clean(input.occasion)}, style=${clean(input.style)}, favorite colors=${clean(input.colors)}, size=${clean(input.size)}, budget=${Number(input.budget) || 0}, notes=${clean(input.notes)}.`;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
      method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.5 } })
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
    const result = JSON.parse(text || '{}');
    return { advice: clean(result.advice) || 'Mình đã chọn một vài thiết kế hợp với yêu cầu của bạn.', keywords: Array.isArray(result.keywords) ? result.keywords.map(clean).filter(Boolean).slice(0, 5) : [] };
  } finally { clearTimeout(timeout); }
}

async function advise(input) {
  let result;
  try { result = await deriveKeywords(input); }
  catch { result = { advice: 'FITZY Stylist đang dùng gợi ý theo danh mục có sẵn. Những lựa chọn dưới đây được lấy trực tiếp từ cửa hàng.', keywords: [input.occasion, input.style, input.colors].filter(Boolean) }; }
  const size = clean(input.size);
  const budget = Number(input.budget) > 0 ? Number(input.budget) : Number.MAX_SAFE_INTEGER;
  const filter = { status: 'active', price: { $lte: budget }, variants: { $elemMatch: { isActive: true, quantity: { $gt: 0 }, ...(size ? { size: new RegExp(`^${escapeRegExp(size)}$`, 'i') } : {}) } } };
  let products = await Product.find(filter).populate('category', 'name slug').sort({ featured: -1, salesCount: -1 }).limit(20);
  const tokens = result.keywords.map(value => value.toLowerCase()).filter(Boolean);
  if (tokens.length && products.length) {
    const scored = products.map(product => ({ product, score: tokens.reduce((sum, token) => sum + Number(`${product.name} ${product.description} ${product.tags.join(' ')}`.toLowerCase().includes(token)), 0) }));
    const matched = scored.filter(entry => entry.score > 0).sort((a, b) => b.score - a.score);
    if (matched.length) products = matched.map(entry => entry.product);
  }
  return { advice: result.advice, products: products.slice(0, 8), usedFallback: !process.env.GEMINI_API_KEY };
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { advise, deriveKeywords, model };
