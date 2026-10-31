import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { Button, Page, StateMessage } from '../../components/ui';
import { formatVnd, theme } from '../../constants/theme';

const resource = {
  customers: { title: 'Khách hàng', path: '/users', searchable: true },
  categories: { title: 'Danh mục', path: '/admin/categories', editable: true, searchable: true },
  products: { title: 'Sản phẩm', path: '/admin/products', editable: true, searchable: true },
  orders: { title: 'Đơn hàng', path: '/orders/admin/list' },
  reviews: { title: 'Đánh giá', path: '/reviews/admin/list' },
  posts: { title: 'Bài viết', path: '/admin/posts', editable: true, searchable: true },
  promotions: { title: 'Khuyến mãi', path: '/admin/promotions', editable: true, searchable: true }
};
const orderNext = { pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'cancelled'], preparing: ['shipping', 'cancelled'], shipping: ['completed', 'delivery_failed'], delivery_failed: ['shipping'], completed: [], cancelled: [] };
const statusLabel = { active: 'Đang hoạt động', hidden: 'Đã ẩn', draft: 'Bản nháp', published: 'Đã xuất bản', pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', preparing: 'Đang chuẩn bị hàng', shipping: 'Đang giao hàng', completed: 'Đã giao hàng', delivery_failed: 'Giao hàng thất bại', cancelled: 'Đã hủy', visible: 'Đang hiển thị', blocked: 'Đã khóa' };
const pageLimit = 10;
const singularLabel = { categories: 'danh mục', products: 'sản phẩm', posts: 'bài viết', promotions: 'khuyến mãi' };

function dateText(value) { return value ? new Date(value).toLocaleDateString('vi-VN') : '—'; }
function ChoiceChips({ value, options, onChange }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
    {options.map(([key, label]) => <Pressable key={String(key)} onPress={() => onChange(key)} style={{ borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: value === key ? theme.colors.ink : theme.colors.line, backgroundColor: value === key ? theme.colors.ink : theme.colors.white }}>
      <Text style={{ color: value === key ? theme.colors.white : theme.colors.ink, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>)}
  </ScrollView>;
}

function Input({ label, value, onChangeText, placeholder, multiline, keyboardType = 'default' }) {
  return <View style={{ gap: 6 }}>
    <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    <TextInput value={String(value ?? '')} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor="#aaa69f" keyboardType={keyboardType} multiline={multiline} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={{ minHeight: multiline ? 86 : 46, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.white, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.ink, textAlignVertical: multiline ? 'top' : 'center' }} />
  </View>;
}

function Editor({ kind, item, categories, onClose, onSave }) {
  const [draft, setDraft] = useState(() => {
    if (kind === 'products') return { name: item?.name || '', description: item?.description || '', category: item?.category?._id || item?.category || '', price: String(item?.price ?? ''), compareAtPrice: String(item?.compareAtPrice ?? ''), images: (item?.images || []).join('\n'), variants: item?.variants?.length ? item.variants.map(variant => ({ ...variant })) : [{ size: 'M', color: 'Đen', colorHex: '#222222', quantity: '1', sku: '' }], status: item?.status || 'active', featured: Boolean(item?.featured), tags: (item?.tags || []).join(', '), inventoryReason: '' };
    if (kind === 'categories') return { name: item?.name || '', description: item?.description || '', image: item?.image || '', status: item?.status || 'active' };
    if (kind === 'posts') return { title: item?.title || '', excerpt: item?.excerpt || '', content: item?.content || '', image: item?.image || '', status: item?.status || 'draft' };
    return { code: item?.code || '', discountType: item?.discountType || 'percent', discountValue: String(item?.discountValue ?? ''), minimumOrder: String(item?.minimumOrder ?? 0), maximumDiscount: String(item?.maximumDiscount ?? ''), startsAt: item?.startsAt ? new Date(item.startsAt).toISOString().slice(0, 16) : '', endsAt: item?.endsAt ? new Date(item.endsAt).toISOString().slice(0, 16) : '', usageLimit: String(item?.usageLimit ?? ''), active: item?.active ?? true };
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [uploading, setUploading] = useState(false);
  const change = (key, value) => setDraft(current => ({ ...current, [key]: value }));
  const uploadImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('Cần cấp quyền thư viện ảnh để tải ảnh sản phẩm.');
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible });
      if (picked.canceled) return;
      const asset = picked.assets[0]; const body = new FormData();
      const mimeType = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw new Error('Ảnh cần có định dạng JPG, PNG hoặc WebP.');
      body.append('image', { uri: asset.uri, name: asset.fileName || `fitzy-${Date.now()}.${mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'}`, type: mimeType });
      setUploading(true); setError('');
      const response = await api.post('/admin/uploads', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      change('images', [draft.images, response.data.data.url].filter(Boolean).join('\n'));
    } catch (uploadError) { setError(uploadError.message); }
    finally { setUploading(false); }
  };
  const save = async () => {
    setBusy(true); setError('');
    try {
      let body;
      if (kind === 'products') {
        body = { name: draft.name.trim(), description: draft.description, category: draft.category, price: Number(draft.price), compareAtPrice: draft.compareAtPrice === '' ? undefined : Number(draft.compareAtPrice), images: draft.images.split('\n').map(value => value.trim()).filter(Boolean), variants: draft.variants.map(variant => ({ ...variant, quantity: Number(variant.quantity), isActive: variant.isActive !== false })).filter(variant => variant.size && variant.color), status: draft.status, featured: draft.featured, tags: draft.tags.split(',').map(value => value.trim()).filter(Boolean), inventoryReason: draft.inventoryReason };
        if (!body.name || !body.category || draft.price === '' || !Number.isFinite(body.price) || body.price < 0 || body.variants.length === 0) throw new Error('Nhập tên, danh mục, giá hợp lệ và ít nhất một biến thể.');
        if (body.variants.some(variant => !Number.isInteger(variant.quantity) || variant.quantity < 0)) throw new Error('Tồn kho của từng biến thể phải là số nguyên không âm.');
        if (body.compareAtPrice !== undefined && (!Number.isFinite(body.compareAtPrice) || body.compareAtPrice < 0)) throw new Error('Giá niêm yết phải là số không âm.');
      } else if (kind === 'categories') {
        body = { name: draft.name.trim(), description: draft.description, image: draft.image, status: draft.status };
        if (!body.name) throw new Error('Tên danh mục là bắt buộc.');
      } else if (kind === 'posts') {
        body = { title: draft.title.trim(), excerpt: draft.excerpt, content: draft.content, image: draft.image, status: draft.status };
        if (!body.title || !body.content) throw new Error('Tiêu đề và nội dung bài viết là bắt buộc.');
      } else {
        if (!draft.code.trim() || draft.discountValue === '' || !draft.startsAt || !draft.endsAt) throw new Error('Mã, giá trị giảm và khoảng thời gian là bắt buộc.');
        const startDate = new Date(draft.startsAt); const endDate = new Date(draft.endsAt);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu.');
        const discountValue = Number(draft.discountValue);
        if (!Number.isFinite(discountValue) || discountValue <= 0 || (draft.discountType === 'percent' && discountValue > 100)) throw new Error('Mức giảm phải lớn hơn 0; phần trăm tối đa là 100%.');
        body = { code: draft.code.trim().toUpperCase(), discountType: draft.discountType, discountValue, minimumOrder: Number(draft.minimumOrder || 0), maximumDiscount: draft.maximumDiscount === '' ? undefined : Number(draft.maximumDiscount), startsAt: startDate.toISOString(), endsAt: endDate.toISOString(), usageLimit: draft.usageLimit === '' ? undefined : Number(draft.usageLimit), active: Boolean(draft.active) };
      }
      await onSave(body);
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  };
  const setVariant = (index, key, value) => setDraft(current => ({ ...current, variants: current.variants.map((variant, i) => i === index ? { ...variant, [key]: value } : variant) }));

  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
      <View style={{ maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.paper, padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.ink, fontSize: 20, fontWeight: '800' }}>{item ? 'Chỉnh sửa' : 'Thêm'} {singularLabel[kind]}</Text>
          <Pressable onPress={onClose}><Text style={{ color: theme.colors.muted, fontSize: 25 }}>×</Text></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 13, paddingBottom: 16 }}>
          {kind === 'products' ? <>
            <Input label="Tên sản phẩm" value={draft.name} onChangeText={value => change('name', value)} />
            <Input label="Mô tả" value={draft.description} onChangeText={value => change('description', value)} multiline />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Danh mục</Text>
            <ChoiceChips value={draft.category} options={categories.map(category => [category._id, category.name])} onChange={value => change('category', value)} />
            <Input label="Giá bán (VND)" value={draft.price} onChangeText={value => change('price', value)} keyboardType="numeric" />
            <Input label="Giá niêm yết (VND)" value={draft.compareAtPrice} onChangeText={value => change('compareAtPrice', value)} keyboardType="numeric" />
            <Input label="Ảnh sản phẩm · mỗi URL một dòng" value={draft.images} onChangeText={value => change('images', value)} multiline />
            <Button title={uploading ? 'Đang tải ảnh…' : 'Chọn ảnh để tải lên'} variant="light" loading={uploading} onPress={uploadImage} />
            <Input label="Lý do điều chỉnh tồn kho" value={draft.inventoryReason} onChangeText={value => change('inventoryReason', value)} placeholder="Ví dụ: Nhập hàng bổ sung" />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '700' }}>Biến thể · size, màu, tồn kho</Text>
            {draft.variants.map((variant, index) => <View key={variant._id || `variant-${index}`} style={{ gap: 9, padding: 12, borderRadius: 14, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }}>
              <Input label="Size" value={variant.size} onChangeText={value => setVariant(index, 'size', value)} placeholder="M" />
              <Input label="Màu sắc" value={variant.color} onChangeText={value => setVariant(index, 'color', value)} placeholder="Đen" />
              <Input label="Mã màu" value={variant.colorHex} onChangeText={value => setVariant(index, 'colorHex', value)} placeholder="#222222" />
              <Input label="Tồn kho" value={variant.quantity} onChangeText={value => setVariant(index, 'quantity', value)} keyboardType="numeric" />
              <Input label="SKU" value={variant.sku} onChangeText={value => setVariant(index, 'sku', value)} />
              {draft.variants.length > 1 ? <Button title="Xóa biến thể" variant="light" onPress={() => setDraft(current => ({ ...current, variants: current.variants.filter((_, i) => i !== index) }))} /> : null}
            </View>)}
            <Button title="＋ Thêm size / màu" variant="light" onPress={() => setDraft(current => ({ ...current, variants: [...current.variants, { size: '', color: '', colorHex: '#222222', quantity: '0', sku: '' }] }))} />
            <Input label="Tags · phân tách bằng dấu phẩy" value={draft.tags} onChangeText={value => change('tags', value)} />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Trạng thái bán</Text>
            <ChoiceChips value={draft.status} options={ [['active', 'Đang bán'], ['hidden', 'Đã ẩn']] } onChange={value => change('status', value)} />
            <ChoiceChips value={draft.featured} options={ [[false, 'Bình thường'], [true, 'Nổi bật']] } onChange={value => change('featured', value)} />
          </> : null}
          {kind === 'categories' ? <>
            <Input label="Tên danh mục" value={draft.name} onChangeText={value => change('name', value)} />
            <Input label="Mô tả" value={draft.description} onChangeText={value => change('description', value)} multiline />
            <Input label="URL ảnh danh mục" value={draft.image} onChangeText={value => change('image', value)} />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Trạng thái</Text>
            <ChoiceChips value={draft.status} options={ [['active', 'Đang hoạt động'], ['hidden', 'Vô hiệu hóa']] } onChange={value => change('status', value)} />
          </> : null}
          {kind === 'posts' ? <>
            <Input label="Tiêu đề" value={draft.title} onChangeText={value => change('title', value)} />
            <Input label="Tóm tắt" value={draft.excerpt} onChangeText={value => change('excerpt', value)} multiline />
            <Input label="Nội dung" value={draft.content} onChangeText={value => change('content', value)} multiline />
            <Input label="URL ảnh" value={draft.image} onChangeText={value => change('image', value)} />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Trạng thái bài viết</Text>
            <ChoiceChips value={draft.status} options={ [['draft', 'Bản nháp'], ['published', 'Xuất bản']] } onChange={value => change('status', value)} />
          </> : null}
          {kind === 'promotions' ? <>
            <Input label="Mã khuyến mãi" value={draft.code} onChangeText={value => change('code', value.toUpperCase())} />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>Kiểu giảm</Text>
            <ChoiceChips value={draft.discountType} options={ [['percent', 'Phần trăm'], ['fixed', 'Số tiền cố định']] } onChange={value => change('discountType', value)} />
            <Input label={draft.discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm (VND)'} value={draft.discountValue} onChangeText={value => change('discountValue', value)} keyboardType="numeric" />
            <Input label="Đơn hàng tối thiểu (VND)" value={draft.minimumOrder} onChangeText={value => change('minimumOrder', value)} keyboardType="numeric" />
            {draft.discountType === 'percent' ? <Input label="Giảm tối đa (VND)" value={draft.maximumDiscount} onChangeText={value => change('maximumDiscount', value)} keyboardType="numeric" /> : null}
            <Input label="Bắt đầu · YYYY-MM-DDTHH:mm" value={draft.startsAt} onChangeText={value => change('startsAt', value)} placeholder="2026-10-15T09:00" />
            <Input label="Kết thúc · YYYY-MM-DDTHH:mm" value={draft.endsAt} onChangeText={value => change('endsAt', value)} placeholder="2026-11-15T23:59" />
            <Input label="Giới hạn lượt dùng" value={draft.usageLimit} onChangeText={value => change('usageLimit', value)} keyboardType="numeric" />
            <ChoiceChips value={draft.active} options={ [[true, 'Đang bật'], [false, 'Tạm dừng']] } onChange={value => change('active', value)} />
          </> : null}
          {error ? <Text selectable style={{ color: theme.colors.danger, lineHeight: 20 }}>{error}</Text> : null}
          <Button title={busy ? 'Đang lưu…' : 'Lưu thay đổi'} loading={busy} disabled={uploading} onPress={save} />
          <Button title="Hủy" variant="light" onPress={onClose} />
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function DetailModal({ kind, record, onClose, onStatus }) {
  const [data, setData] = useState({ value: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    api.get(kind === 'orders' ? `/orders/${record._id}` : `/users/${record._id}`)
      .then(response => { if (active) setData({ value: kind === 'orders' ? response.data.data.order : response.data.data, loading: false, error: '' }); })
      .catch(error => { if (active) setData({ value: null, loading: false, error: error.message }); });
    return () => { active = false; };
  }, [kind, record._id]);
  const value = data.value;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}><View style={{ maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: theme.colors.paper, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: theme.colors.ink, fontSize: 20, fontWeight: '800' }}>{kind === 'orders' ? 'Chi tiết đơn hàng' : 'Hồ sơ khách hàng'}</Text><Pressable onPress={onClose}><Text style={{ color: theme.colors.muted, fontSize: 25 }}>×</Text></Pressable></View>
      {data.loading ? <StateMessage title="Đang tải chi tiết" loading /> : data.error ? <StateMessage title="Không tải được dữ liệu" message={data.error} action="Đóng" onAction={onClose} /> : <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 22 }}>
        {kind === 'customers' ? <>
          <Info label="Tên" value={value.user.name} /><Info label="Email" value={value.user.email} /><Info label="Điện thoại" value={value.user.phone || '—'} /><Info label="Ngày tham gia" value={dateText(value.user.createdAt)} /><Info label="Số đơn" value={value.orderCount} /><Info label="Chi tiêu · không tính đơn hủy" value={formatVnd(value.spent)} />
          <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Địa chỉ đã lưu</Text>
          {(value.user.addresses || []).length ? value.user.addresses.map(address => <Text key={address._id} style={{ color: theme.colors.muted, lineHeight: 20 }}>{address.recipient} · {address.phone} · {[address.line1, address.ward, address.district, address.city].filter(Boolean).join(', ')}</Text>) : <Text style={{ color: theme.colors.muted }}>Chưa lưu địa chỉ.</Text>}
        </> : <>
          <Info label="Mã đơn" value={value.orderNumber} /><Info label="Khách hàng" value={`${value.user?.name || ''} · ${value.user?.email || ''}`} /><Info label="Ngày đặt" value={dateText(value.createdAt)} /><Info label="Thanh toán" value={`${value.paymentMethod?.toUpperCase()} · ${value.paymentStatus}`} /><Info label="Trạng thái" value={statusLabel[value.status] || value.status} />
          <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Giao hàng</Text><Text style={{ color: theme.colors.muted, lineHeight: 20 }}>{value.shipping?.recipient} · {value.shipping?.phone}{'\n'}{[value.shipping?.line1, value.shipping?.ward, value.shipping?.district, value.shipping?.city].filter(Boolean).join(', ')}</Text>
          <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Sản phẩm</Text>
          {(value.items || []).map((item, index) => <Text key={`${item.product}-${index}`} style={{ color: theme.colors.muted, lineHeight: 20 }}>{item.name} · {item.size} / {item.color} · SL {item.quantity} · {formatVnd(item.unitPrice)}</Text>)}
          <Info label="Tạm tính" value={formatVnd(value.subtotal)} /><Info label="Giảm giá" value={`− ${formatVnd(value.discount)}`} /><Info label="Phí giao hàng" value={formatVnd(value.shippingFee)} /><Info label="Tổng cộng" value={formatVnd(value.total)} />
          {(orderNext[value.status] || []).length ? <><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Cập nhật trạng thái</Text>{orderNext[value.status].map(status => <Button key={status} title={statusLabel[status]} variant="light" onPress={() => status === 'cancelled' ? Alert.alert('Hủy đơn hàng?', 'Đơn đã hủy không thể khôi phục.', [{ text: 'Quay lại', style: 'cancel' }, { text: 'Hủy đơn', style: 'destructive', onPress: () => onStatus(value._id, status) }]) : onStatus(value._id, status)} />)}</> : null}
        </>}
      </ScrollView>}
    </View></View>
  </Modal>;
}

function Info({ label, value }) { return <View style={{ gap: 3 }}><Text style={{ color: theme.colors.muted, fontSize: 11 }}>{label}</Text><Text selectable style={{ color: theme.colors.ink, fontWeight: '600' }}>{String(value ?? '—')}</Text></View>; }

export default function AdminManagementScreen({ route }) {
  const kind = route.params?.kind || 'products'; const config = resource[kind] || resource.products;
  const [page, setPage] = useState(1); const [queryDraft, setQueryDraft] = useState(''); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); const [rating, setRating] = useState(''); const [product, setProduct] = useState(''); const [fromDraft, setFromDraft] = useState(''); const [toDraft, setToDraft] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [list, setList] = useState({ items: [], pagination: null, loading: true, error: '' }); const [attempt, setAttempt] = useState(0); const [categories, setCategories] = useState([]); const [products, setProducts] = useState([]); const [editor, setEditor] = useState(undefined); const [detail, setDetail] = useState(null); const [notice, setNotice] = useState('');
  const params = useMemo(() => ({ page, limit: pageLimit, ...(query ? { q: query } : {}), ...(status && ['products', 'categories', 'posts'].includes(kind) ? { status } : {}), ...(kind === 'products' && status ? { status } : {}), ...(kind === 'orders' && status ? { status } : {}), ...(kind === 'products' && product ? { category: product } : {}), ...(kind === 'reviews' && rating ? { rating } : {}), ...(kind === 'reviews' && product ? { product } : {}), ...(kind === 'orders' && from ? { from } : {}), ...(kind === 'orders' && to ? { to } : {}) }), [page, query, status, kind, product, rating, from, to]);

  useEffect(() => { setPage(1); setQueryDraft(''); setQuery(''); setStatus(''); setRating(''); setProduct(''); setFromDraft(''); setToDraft(''); setFrom(''); setTo(''); setEditor(undefined); setDetail(null); setNotice(''); }, [kind]);

  useEffect(() => {
    let active = true; setList(current => ({ ...current, loading: true, error: '' }));
    api.get(config.path, { params }).then(response => { if (active) setList({ items: response.data.data.items, pagination: response.data.data.pagination, loading: false, error: '' }); })
      .catch(error => { if (active) setList(current => ({ ...current, loading: false, error: error.message })); });
    return () => { active = false; };
  }, [config.path, params, attempt]);

  useEffect(() => {
    let active = true;
    if (['products', 'reviews'].includes(kind)) api.get('/admin/categories', { params: { limit: 100, status: 'active' } }).then(response => { if (active) setCategories(response.data.data.items); }).catch(() => {});
    if (['products', 'reviews'].includes(kind)) api.get('/admin/products', { params: { limit: 100 } }).then(response => { if (active) setProducts(response.data.data.items); }).catch(() => {});
    return () => { active = false; };
  }, [kind]);

  const reload = () => setAttempt(value => value + 1);
  const applyQuery = () => { setPage(1); setQuery(queryDraft.trim()); };
  const save = async body => {
    if (editor?._id) await api.patch(`${config.path}/${editor._id}`, body);
    else await api.post(config.path, body);
    setEditor(undefined); setNotice('Đã lưu thay đổi.'); reload();
  };
  const updateOrder = async (id, nextStatus) => {
    try { await api.patch(`/orders/${id}/status`, { status: nextStatus }); setDetail(null); setNotice('Đã cập nhật trạng thái đơn.'); reload(); }
    catch (error) { setNotice(error.message); }
  };
  const toggleCustomer = row => Alert.alert(row.isBlocked ? 'Mở khóa khách hàng?' : 'Khóa khách hàng?', row.isBlocked ? 'Cho phép khách hàng đăng nhập và đặt hàng lại?' : 'Khách hàng sẽ không thể đăng nhập hoặc đặt hàng.', [
    { text: 'Hủy', style: 'cancel' },
    { text: row.isBlocked ? 'Mở khóa' : 'Khóa', style: row.isBlocked ? 'default' : 'destructive', onPress: async () => { try { await api.patch(`/users/${row._id}/block`, { isBlocked: !row.isBlocked }); setNotice('Đã cập nhật trạng thái khách hàng.'); reload(); } catch (error) { setNotice(error.message); } } }
  ]);
  const toggleReview = async row => { try { await api.patch(`/reviews/${row._id}/moderate`, { status: row.status === 'visible' ? 'hidden' : 'visible' }); setNotice(row.status === 'visible' ? 'Đã ẩn đánh giá.' : 'Đã hiển thị đánh giá.'); reload(); } catch (error) { setNotice(error.message); } };
  const remove = row => Alert.alert('Xác nhận thao tác', kind === 'products' ? 'Sản phẩm sẽ được ẩn khỏi cửa hàng.' : kind === 'categories' ? 'Danh mục có sản phẩm liên quan cần chuyển sang trạng thái vô hiệu hóa.' : 'Xóa mục này?', [
    { text: 'Hủy', style: 'cancel' },
    { text: kind === 'products' ? 'Ẩn sản phẩm' : 'Xóa', style: 'destructive', onPress: async () => { try { await api.delete(`${config.path}/${row._id}`); setNotice(kind === 'products' ? 'Đã ẩn sản phẩm.' : kind === 'promotions' && row.usedCount ? 'Mã đã dùng; đã vô hiệu hóa.' : 'Đã xóa.'); reload(); } catch (error) { setNotice(error.message); } } }
  ]);

  const rows = list.items.map(row => {
    const productCategory = row.category?.name || categories.find(item => item._id === row.category)?.name;
    const title = kind === 'orders' ? row.orderNumber : kind === 'reviews' ? (row.product?.name || 'Đánh giá') : kind === 'promotions' ? row.code : kind === 'posts' ? row.title : row.name;
    const subtitle = kind === 'orders' ? `${row.user?.name || 'Khách'} · ${dateText(row.createdAt)} · ${formatVnd(row.total)}`
      : kind === 'products' ? `${productCategory || 'Chưa có danh mục'} · ${formatVnd(row.price)} · Tồn ${row.variants?.reduce((sum, variant) => sum + Number(variant.quantity || 0), 0) || 0}`
      : kind === 'customers' ? `${row.email} · ${row.phone || 'Chưa có số điện thoại'}`
      : kind === 'reviews' ? `${row.user?.name || 'Khách'} · ${'★'.repeat(row.rating)} · ${dateText(row.createdAt)}`
      : kind === 'categories' ? `${row.slug} · ${row.description || 'Không có mô tả'}`
      : kind === 'posts' ? `${statusLabel[row.status] || row.status} · ${dateText(row.publishedAt)}`
      : `${row.discountType === 'percent' ? `${row.discountValue}%` : formatVnd(row.discountValue)} · ${row.usedCount || 0}${row.usageLimit ? `/${row.usageLimit}` : ''} lượt · đến ${dateText(row.endsAt)}`;
    const badge = kind === 'customers' ? (row.isBlocked ? 'blocked' : 'active') : kind === 'promotions' ? (row.active ? 'active' : 'hidden') : row.status;
    return { row, title: title || 'Không có tiêu đề', subtitle, badge };
  });

  return <Page contentStyle={{ padding: 17, gap: 14 }}>
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>QUẢN LÝ FITZY</Text>
      <Text style={{ color: theme.colors.ink, fontSize: 24, fontWeight: '800' }}>{config.title}</Text>
    </View>
    {config.searchable ? <View style={{ flexDirection: 'row', gap: 8 }}>
      <TextInput value={queryDraft} onChangeText={setQueryDraft} onSubmitEditing={applyQuery} returnKeyType="search" placeholder={`Tìm ${config.title.toLowerCase()}…`} style={{ flex: 1, minHeight: 46, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.line, backgroundColor: theme.colors.white, color: theme.colors.ink }} />
      <Button title="Tìm" onPress={applyQuery} style={{ minHeight: 46, paddingHorizontal: 15 }} />
    </View> : null}
    {kind === 'products' ? <>
      <ChoiceChips value={status} options={ [['', 'Tất cả'], ['active', 'Đang bán'], ['hidden', 'Đã ẩn']] } onChange={value => { setPage(1); setStatus(value); }} />
      {categories.length ? <ChoiceChips value={product} options={ [['', 'Mọi danh mục'], ...categories.map(item => [item._id, item.name])] } onChange={value => { setPage(1); setProduct(value); }} /> : null}
    </> : null}
    {kind === 'categories' ? <ChoiceChips value={status} options={ [['', 'Tất cả'], ['active', 'Đang hoạt động'], ['hidden', 'Đã ẩn']] } onChange={value => { setPage(1); setStatus(value); }} /> : null}
    {kind === 'posts' ? <ChoiceChips value={status} options={ [['', 'Tất cả'], ['draft', 'Bản nháp'], ['published', 'Đã xuất bản']] } onChange={value => { setPage(1); setStatus(value); }} /> : null}
    {kind === 'orders' ? <>
      <ChoiceChips value={status} options={ [['', 'Tất cả'], ...Object.keys(orderNext).map(value => [value, statusLabel[value]])] } onChange={value => { setPage(1); setStatus(value); }} />
      <View style={{ flexDirection: 'row', gap: 8 }}><TextInput value={fromDraft} onChangeText={setFromDraft} placeholder="Từ ngày YYYY-MM-DD" style={{ flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }} /><TextInput value={toDraft} onChangeText={setToDraft} placeholder="Đến ngày YYYY-MM-DD" style={{ flex: 1, minHeight: 42, paddingHorizontal: 10, borderRadius: 10, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }} /></View>
      <Button title="Lọc theo ngày" variant="light" onPress={() => {
        const validDate = value => {
          if (!value) return true;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const parsed = new Date(`${value}T00:00:00Z`);
          return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
        };
        if (!validDate(fromDraft.trim()) || !validDate(toDraft.trim())) { setNotice('Ngày lọc cần đúng định dạng YYYY-MM-DD.'); return; }
        if (fromDraft && toDraft && fromDraft > toDraft) { setNotice('Ngày bắt đầu cần trước hoặc bằng ngày kết thúc.'); return; }
        setNotice(''); setPage(1); setFrom(fromDraft.trim()); setTo(toDraft.trim());
      }} style={{ minHeight: 42 }} />
    </> : null}
    {kind === 'reviews' ? <>
      <ChoiceChips value={rating} options={ [['', 'Mọi đánh giá'], ...[5, 4, 3, 2, 1].map(value => [String(value), `${value} ★`])] } onChange={value => { setPage(1); setRating(value); }} />
      {products.length ? <ChoiceChips value={product} options={ [['', 'Mọi sản phẩm'], ...products.map(item => [item._id, item.name])] } onChange={value => { setPage(1); setProduct(value); }} /> : null}
    </> : null}
    {config.editable ? <Button title={`＋ Thêm ${config.title.toLowerCase()}`} onPress={() => setEditor(null)} /> : null}
    {notice ? <Pressable onPress={() => setNotice('')} style={{ padding: 12, borderRadius: 12, backgroundColor: '#f4efe5' }}><Text selectable style={{ color: theme.colors.ink }}>{notice} · chạm để đóng</Text></Pressable> : null}
    {list.error ? <StateMessage title="Không tải được danh sách" message={list.error} action="Thử lại" onAction={reload} /> : null}
    {list.loading && !list.items.length ? <StateMessage title="Đang tải" loading /> : null}
    {!list.loading && !list.error && !rows.length ? <StateMessage title="Chưa có dữ liệu" message="Thử thay đổi bộ lọc hoặc tạo mục mới." /> : null}
    {rows.map(({ row, title: rowTitle, subtitle, badge }) => <View key={row._id} style={{ padding: 14, gap: 10, borderRadius: 16, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, gap: 5 }}><Text selectable style={{ color: theme.colors.ink, fontWeight: '800', fontSize: 15 }}>{rowTitle}</Text><Text selectable style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>{subtitle}</Text></View>
        {badge ? <Text style={{ alignSelf: 'flex-start', color: badge === 'hidden' || badge === 'blocked' || badge === 'cancelled' ? theme.colors.danger : theme.colors.success, fontSize: 10, fontWeight: '700' }}>{statusLabel[badge] || badge}</Text> : null}
      </View>
      {kind === 'reviews' ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Bình luận: {row.comment || 'Không có bình luận'}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
        {kind === 'orders' || kind === 'customers' ? <Button title="Chi tiết" variant="light" onPress={() => setDetail(row)} style={{ minHeight: 40, flexGrow: 1 }} /> : null}
        {kind === 'customers' ? <Button title={row.isBlocked ? 'Mở khóa' : 'Khóa tài khoản'} variant="light" onPress={() => toggleCustomer(row)} style={{ minHeight: 40, flexGrow: 1 }} /> : null}
        {kind === 'reviews' ? <Button title={row.status === 'visible' ? 'Ẩn đánh giá' : 'Hiện đánh giá'} variant="light" onPress={() => toggleReview(row)} style={{ minHeight: 40, flexGrow: 1 }} /> : null}
        {config.editable ? <Button title="Sửa" variant="light" onPress={() => setEditor(row)} style={{ minHeight: 40, flexGrow: 1 }} /> : null}
        {config.editable ? <Button title={kind === 'products' ? 'Ẩn' : 'Xóa'} variant="light" onPress={() => remove(row)} style={{ minHeight: 40, flexGrow: 1 }} /> : null}
      </View>
    </View>)}
    {list.pagination?.pages > 1 ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Button title="Trước" variant="light" disabled={page <= 1} onPress={() => setPage(value => value - 1)} style={{ minHeight: 42 }} />
      <Text style={{ color: theme.colors.muted }}>Trang {list.pagination.page} / {list.pagination.pages} · {list.pagination.total} mục</Text>
      <Button title="Sau" variant="light" disabled={page >= list.pagination.pages} onPress={() => setPage(value => value + 1)} style={{ minHeight: 42 }} />
    </View> : null}
    {editor !== undefined ? <Editor kind={kind} item={editor || null} categories={categories} onClose={() => setEditor(undefined)} onSave={save} /> : null}
    {detail ? <DetailModal kind={kind} record={detail} onClose={() => setDetail(null)} onStatus={updateOrder} /> : null}
  </Page>;
}
