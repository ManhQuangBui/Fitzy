import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import useResource from '../hooks/useResource';
import { date, money, title } from '../utils/format';
import DataTable, { Status } from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const productColumns = [
  { key: 'image', label: 'Ảnh', render: row => row.images?.[0] ? <img className="product-thumb" src={row.images[0]} alt={row.name} /> : <span className="product-thumb product-thumb-empty">Ảnh</span> },
  { key: 'name', label: 'Sản phẩm' },
  { key: 'sku', label: 'SKU', render: row => row.variants?.map(variant => variant.sku).filter(Boolean).join(', ') || '—' },
  { key: 'category', label: 'Danh mục' },
  { key: 'price', label: 'Giá bán / niêm yết', render: row => <span className="product-prices"><b>{money(row.price)}</b>{row.compareAtPrice > row.price ? <del>{money(row.compareAtPrice)}</del> : null}</span> },
  { key: 'inventory', label: 'Tồn kho', render: row => { const quantity = row.variants?.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0) || 0; return <span className={`inventory-label ${quantity === 0 ? 'out' : quantity <= 5 ? 'low' : ''}`}>{quantity} {quantity === 0 ? '· Hết hàng' : quantity <= 5 ? '· Sắp hết' : ''}</span>; } },
  { key: 'status', label: 'Trạng thái', type: 'status' }
];

const resourceConfig = {
  products: { singular: 'sản phẩm', path: '/admin/products', columns: productColumns, fields: [
    { key: 'name', label: 'Tên sản phẩm', required: true }, { key: 'description', label: 'Mô tả', multiline: true }, { key: 'category', label: 'Danh mục', kind: 'category', required: true },
    { key: 'price', label: 'Giá bán (VND)', type: 'number', required: true }, { key: 'compareAtPrice', label: 'Giá niêm yết (VND)', type: 'number' },
    { key: 'images', label: 'Hình ảnh', kind: 'imageList' }, { key: 'variants', label: 'Biến thể', kind: 'variantList' }, { key: 'inventoryReason', label: 'Lý do điều chỉnh tồn kho', multiline: true },
    { key: 'status', label: 'Trạng thái', kind: 'select', options: [['active', 'Đang bán'], ['hidden', 'Đã ẩn']] }, { key: 'featured', label: 'Sản phẩm nổi bật', kind: 'checkbox' }
  ] },
  categories: { singular: 'danh mục', path: '/admin/categories', columns: [{ key: 'name', label: 'Tên danh mục' }, { key: 'slug', label: 'Đường dẫn' }, { key: 'description', label: 'Mô tả' }, { key: 'status', label: 'Trạng thái', type: 'status' }, { key: 'createdAt', label: 'Ngày tạo', type: 'date' }], fields: [{ key: 'name', label: 'Tên danh mục', required: true }, { key: 'description', label: 'Mô tả', multiline: true }, { key: 'image', label: 'Ảnh URL' }, { key: 'status', label: 'Trạng thái', kind: 'select', options: [['active', 'Đang hoạt động'], ['hidden', 'Đã ẩn']] }] },
  posts: { singular: 'bài viết', path: '/admin/posts', columns: [{ key: 'title', label: 'Tiêu đề' }, { key: 'excerpt', label: 'Tóm tắt' }, { key: 'status', label: 'Trạng thái', type: 'status' }, { key: 'publishedAt', label: 'Ngày đăng', type: 'date' }], fields: [{ key: 'title', label: 'Tiêu đề', required: true }, { key: 'excerpt', label: 'Tóm tắt', multiline: true }, { key: 'content', label: 'Nội dung', multiline: true, required: true }, { key: 'image', label: 'Ảnh URL' }, { key: 'status', label: 'Trạng thái', kind: 'select', options: [['draft', 'Bản nháp'], ['published', 'Xuất bản']] }] },
  promotions: { singular: 'mã ưu đãi', path: '/admin/promotions', columns: [{ key: 'code', label: 'Mã' }, { key: 'discountType', label: 'Loại giảm' }, { key: 'discountValue', label: 'Giá trị', render: row => row.discountType === 'percent' ? `${row.discountValue}%` : money(row.discountValue) }, { key: 'usedCount', label: 'Đã dùng' }, { key: 'endsAt', label: 'Hết hạn', type: 'date' }, { key: 'active', label: 'Trạng thái' }], fields: [{ key: 'code', label: 'Mã khuyến mãi', required: true }, { key: 'discountType', label: 'Kiểu giảm', kind: 'select', options: [['percent', 'Phần trăm'], ['fixed', 'Số tiền cố định']] }, { key: 'discountValue', label: 'Giá trị giảm', type: 'number', required: true }, { key: 'minimumOrder', label: 'Đơn tối thiểu', type: 'number' }, { key: 'maximumDiscount', label: 'Giảm tối đa', type: 'number' }, { key: 'startsAt', label: 'Bắt đầu', type: 'datetime-local', required: true }, { key: 'endsAt', label: 'Kết thúc', type: 'datetime-local', required: true }, { key: 'usageLimit', label: 'Lượt sử dụng tối đa', type: 'number' }, { key: 'active', label: 'Đang kích hoạt', kind: 'checkbox' }] }
};

const defaultVariant = () => ({ size: 'M', color: 'Đen', colorHex: '#222222', quantity: '0', sku: '', isActive: true });
function dateForInput(value) { if (!value) return ''; const dateValue = new Date(value); return new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
function initialDraft(config, row) {
  const result = {};
  config.fields.forEach(field => {
    const value = row?.[field.key];
    if (field.kind === 'variantList') result[field.key] = value?.length ? value.map(variant => ({ ...variant, quantity: String(variant.quantity) })) : [defaultVariant()];
    else if (field.kind === 'imageList') result[field.key] = Array.isArray(value) ? [...value] : [];
    else if (field.type === 'datetime-local') result[field.key] = dateForInput(value);
    else result[field.key] = value ?? (field.kind === 'checkbox' ? field.key === 'active' : field.key === 'status' ? 'active' : '');
  });
  return result;
}
function mapDraft(config, draft) {
  const result = {};
  config.fields.forEach(field => {
    if (field.kind === 'variantList') result[field.key] = draft[field.key].map(variant => ({ ...variant, size: variant.size.trim(), color: variant.color.trim(), sku: variant.sku?.trim() || '', quantity: Number(variant.quantity) }));
    else if (field.kind === 'imageList') result[field.key] = draft[field.key].filter(Boolean);
    else if (field.kind === 'category') result[field.key] = draft[field.key]?._id || draft[field.key];
    else if (field.type === 'number') result[field.key] = draft[field.key] === '' ? undefined : Number(draft[field.key]);
    else if (field.type === 'datetime-local') result[field.key] = draft[field.key] ? new Date(draft[field.key]).toISOString() : undefined;
    else result[field.key] = draft[field.key];
  });
  return result;
}

function ImageListEditor({ images, onChange, onError, onUploading }) {
  const [uploading, setUploading] = useState(false);
  const upload = async event => {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { onError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.'); return; }
      if (file.size > 4 * 1024 * 1024) { onError('Mỗi ảnh phải có dung lượng tối đa 4 MB.'); return; }
    }
    setUploading(true); onUploading(true); onError('');
    try {
      const urls = [];
      for (const file of files) { const data = new FormData(); data.append('image', file); const response = await api.post('/admin/uploads', data); urls.push(response.data.data.url); }
      onChange([...images, ...urls]);
    } catch (error) { onError(error.message); }
    finally { setUploading(false); onUploading(false); }
  };
  const move = (index, offset) => { const target = index + offset; if (target < 0 || target >= images.length) return; const next = [...images]; [next[index], next[target]] = [next[target], next[index]]; onChange(next); };
  return <div className="product-images-editor">
    <div className="image-grid">{images.map((url, index) => <div className="image-preview" key={`${url}-${index}`}><img src={url} alt={`Ảnh sản phẩm ${index + 1}`} /><span>{index === 0 ? 'Ảnh đại diện' : `Ảnh ${index + 1}`}</span><div><button type="button" disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === images.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" onClick={() => onChange(images.filter((_, i) => i !== index))}>Xóa</button></div></div>)}</div>
    <label className="upload-control">{uploading ? 'Đang tải ảnh…' : 'Thêm hình ảnh'}<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploading} onChange={upload} /><small>JPG, PNG hoặc WebP · tối đa 4 MB/ảnh. Ảnh đầu tiên là ảnh đại diện. Xóa URL khỏi sản phẩm không xóa file lưu trữ.</small></label>
  </div>;
}

function VariantEditor({ variants, onChange }) {
  const update = (index, key, value) => onChange(variants.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  return <div className="variant-editor"><div className="variant-heading"><b>Biến thể & tồn kho</b><button type="button" className="button secondary small-button" onClick={() => onChange([...variants, { size: '', color: '', colorHex: '#222222', quantity: '0', sku: '', isActive: true }])}>＋ Thêm biến thể</button></div>
    {variants.map((variant, index) => <div className="variant-row" key={variant._id || `new-${index}`}><label className="field"><span>SKU</span><input className="input" value={variant.sku || ''} onChange={event => update(index, 'sku', event.target.value)} /></label><label className="field"><span>Kích thước</span><input className="input" value={variant.size || ''} onChange={event => update(index, 'size', event.target.value)} required /></label><label className="field"><span>Màu sắc</span><input className="input" value={variant.color || ''} onChange={event => update(index, 'color', event.target.value)} required /></label><label className="field"><span>Tồn kho</span><input className="input" type="number" min="0" step="1" value={variant.quantity} onChange={event => update(index, 'quantity', event.target.value)} required /></label><label className="variant-active"><input type="checkbox" checked={variant.isActive !== false} onChange={event => update(index, 'isActive', event.target.checked)} /> Đang bán</label><button type="button" className="table-action danger-text" disabled={variants.length <= 1} onClick={() => onChange(variants.filter((_, i) => i !== index))}>Xóa</button></div>)}
    <small className="inventory-total">Tổng tồn kho: {variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0), 0)}</small>
  </div>;
}

function FormModal({ section, config, row, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initialDraft(config, row)); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState(''); const [categories, setCategories] = useState([]);
  useEffect(() => { if (section === 'products') api.get('/admin/categories', { params: { limit: 100, status: 'active' } }).then(response => setCategories(response.data.data.items || [])).catch(err => setError(err.message)); }, [section]);
  const save = async event => {
    event.preventDefault(); setError('');
    try {
      const body = mapDraft(config, draft);
      for (const field of config.fields) if (field.required && (body[field.key] === undefined || body[field.key] === '' || body[field.key] === null)) throw new Error(`${field.label} là bắt buộc.`);
      if (section === 'products') {
        if (body.variants.length < 1 || body.variants.some(variant => !variant.size || !variant.color || !Number.isInteger(variant.quantity) || variant.quantity < 0)) throw new Error('Mỗi biến thể cần size, màu và tồn kho là số nguyên không âm.');
        if (body.price < 0 || (body.compareAtPrice !== undefined && body.compareAtPrice < body.price)) throw new Error('Giá niêm yết phải lớn hơn hoặc bằng giá bán.');
        const oldQuantities = new Map((row?.variants || []).map(variant => [String(variant._id), variant.quantity]));
        const stockChanged = row && (body.variants.some(variant => !variant._id || oldQuantities.get(String(variant._id)) !== variant.quantity) || [...oldQuantities.keys()].some(id => !body.variants.some(variant => String(variant._id) === id)));
        if (stockChanged && !body.inventoryReason.trim()) throw new Error('Hãy nhập lý do điều chỉnh tồn kho.');
      }
      setBusy(true); await onSave(body);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <Modal title={`${row ? 'Chỉnh sửa' : 'Thêm'} ${config.singular}`} onClose={onClose}><form className="admin-form" onSubmit={save}><div className="form-grid">{config.fields.map(field => <div key={field.key} className={`field ${field.multiline || field.kind === 'variantList' || field.kind === 'imageList' ? 'wide' : ''}`}><span>{field.label}{field.required ? ' *' : ''}</span>{field.kind === 'imageList' ? <ImageListEditor images={draft.images} onChange={images => setDraft(current => ({ ...current, images }))} onError={setError} onUploading={setUploading} /> : field.kind === 'variantList' ? <VariantEditor variants={draft.variants} onChange={variants => setDraft(current => ({ ...current, variants }))} /> : field.kind === 'select' ? <select className="input" value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })}>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : field.kind === 'category' ? <select className="input" value={draft[field.key]?._id || draft[field.key] || ''} onChange={event => setDraft({ ...draft, category: event.target.value })} required><option value="">Chọn danh mục</option>{categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select> : field.kind === 'checkbox' ? <span className="checkbox-field"><input type="checkbox" checked={Boolean(draft[field.key])} onChange={event => setDraft({ ...draft, [field.key]: event.target.checked })} /> Bật</span> : field.multiline ? <textarea className="input textarea" required={field.required} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} rows={4} /> : <input className="input" required={field.required} type={field.type || 'text'} value={draft[field.key]} onChange={event => setDraft({ ...draft, [field.key]: event.target.value })} min={field.type === 'number' ? '0' : undefined} />}</div>)}</div>{error ? <div className="inline-error">{error}</div> : null}<div className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Hủy</button><button type="submit" className="button primary" disabled={busy || uploading}>{uploading ? 'Đang tải ảnh…' : busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></form></Modal>;
}

function ActivityModal({ product, onClose }) {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  useEffect(() => { let active = true; api.get(`/admin/products/${product._id}/activity`).then(response => { if (active) setState({ loading: false, error: '', items: response.data.data.items || [] }); }).catch(error => { if (active) setState({ loading: false, error: error.message, items: [] }); }); return () => { active = false; }; }, [product._id]);
  const labels = { created: 'Tạo sản phẩm', updated: 'Cập nhật thông tin', price_changed: 'Thay đổi giá', inventory_changed: 'Điều chỉnh tồn kho', visibility_changed: 'Thay đổi trạng thái' };
  return <Modal title={`Nhật ký · ${product.name}`} onClose={onClose}><div className="activity-list">{state.loading ? <p>Đang tải nhật ký…</p> : state.error ? <div className="inline-error">{state.error}</div> : state.items.length ? state.items.map(item => <article className="activity-item" key={item._id}><div><b>{labels[item.action] || item.action}</b><span>{item.actor?.name || item.actor?.email || 'Admin'} · {new Date(item.createdAt).toLocaleString('vi-VN')}</span></div>{item.changes?.map((change, index) => <p key={`${change.field}-${index}`}>{change.field === 'inventory' ? `SKU ${change.sku || '—'}: ${change.before ?? 0} → ${change.after ?? 0}` : `${change.field}: ${JSON.stringify(change.before ?? '—')} → ${JSON.stringify(change.after ?? '—')}`}</p>)}{item.reason ? <small>Lý do: {item.reason}</small> : null}</article>) : <p>Chưa có thao tác được ghi nhận.</p>}</div></Modal>;
}

export default function CollectionPage({ section }) {
  const config = resourceConfig[section]; const [page, setPage] = useState(1); const [query, setQuery] = useState(''); const [search, setSearch] = useState(''); const [category, setCategory] = useState(''); const [status, setStatus] = useState(''); const [categories, setCategories] = useState([]); const [modalRow, setModalRow] = useState(undefined); const [deleteRow, setDeleteRow] = useState(null); const [activityRow, setActivityRow] = useState(null); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const params = useMemo(() => ({ page, limit: 12, q: search || undefined, ...(section === 'products' ? { category: category || undefined, status: status || undefined } : {}) }), [page, search, section, category, status]);
  const { items, pagination, loading, error, refresh } = useResource(config.path, params);
  useEffect(() => { if (section === 'products') api.get('/admin/categories', { params: { limit: 100 } }).then(response => setCategories(response.data.data.items || [])).catch(() => {}); }, [section]);
  const save = async body => { if (modalRow) await api.patch(`${config.path}/${modalRow._id}`, body); else await api.post(config.path, body); setModalRow(undefined); setNotice('Đã lưu thay đổi.'); refresh(); };
  const remove = async () => { setBusy(true); try { await api.delete(`${config.path}/${deleteRow._id}`); setDeleteRow(null); setNotice(section === 'products' ? 'Đã ẩn sản phẩm.' : 'Đã xóa bản ghi.'); refresh(); } catch (err) { setNotice(err.message); } finally { setBusy(false); } };
  const handleSearch = event => { event.preventDefault(); setPage(1); setSearch(query.trim()); };
  return <div className="page-stack"><div className="page-heading"><div><span className="eyebrow">QUẢN LÝ CỬA HÀNG</span><h1>{title(section)}</h1><p>Quản lý và cập nhật dữ liệu {config.singular} FITZY.</p></div><button className="button primary" onClick={() => setModalRow(null)}><span>＋</span> Thêm {config.singular}</button></div>
    {notice ? <div className="notice-bar">{notice}<button onClick={() => setNotice('')}>×</button></div> : null}
    <section className="panel data-panel"><div className="table-toolbar"><form className="search-form" onSubmit={handleSearch}><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Tìm ${config.singular}…`} /><button type="submit" className="button secondary">Tìm</button></form>{section === 'products' ? <div className="product-filters"><select aria-label="Lọc theo danh mục" className="select-control" value={category} onChange={event => { setPage(1); setCategory(event.target.value); }}><option value="">Tất cả danh mục</option>{categories.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select><select aria-label="Lọc theo trạng thái" className="select-control" value={status} onChange={event => { setPage(1); setStatus(event.target.value); }}><option value="">Mọi trạng thái</option><option value="active">Đang bán</option><option value="hidden">Đã ẩn</option></select></div> : null}<div className="toolbar-meta">{pagination ? `${pagination.total} bản ghi` : 'FITZY'}</div></div>
      <DataTable columns={config.columns} rows={items} loading={loading} error={error} onRetry={refresh} empty={`Chưa có ${config.singular}`} renderActions={row => <>{section === 'products' ? <button className="table-action" onClick={() => setActivityRow(row)}>Nhật ký</button> : null}<button className="table-action" onClick={() => setModalRow(row)}>Sửa</button><button className="table-action danger-text" onClick={() => setDeleteRow(row)}>Xóa / ẩn</button></>} />
      {pagination?.pages > 1 ? <div className="pagination"><span>Trang {pagination.page} / {pagination.pages}</span><div><button className="button secondary small-button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Trước</button><button className="button secondary small-button" disabled={page >= pagination.pages} onClick={() => setPage(value => value + 1)}>Sau</button></div></div> : null}
    </section>
    {modalRow !== undefined ? <FormModal section={section} config={config} row={modalRow || null} onClose={() => setModalRow(undefined)} onSave={save} /> : null}{deleteRow ? <ConfirmDialog title={section === 'products' ? 'Ẩn sản phẩm?' : 'Xóa bản ghi?'} message={section === 'products' ? `“${deleteRow.name}” sẽ bị ẩn khỏi cửa hàng.` : `Bạn sắp xóa “${deleteRow.name || deleteRow.title || deleteRow.code}”. Một số tài nguyên đã sử dụng có thể bị từ chối xóa.`} onCancel={() => setDeleteRow(null)} onConfirm={remove} busy={busy} /> : null}{activityRow ? <ActivityModal product={activityRow} onClose={() => setActivityRow(null)} /> : null}
  </div>;
}
