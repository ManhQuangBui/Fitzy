import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { cancelOrder } from '../../store/slices/orderSlice';
import { addItems } from '../../store/slices/cartSlice';
import { Button, Page, StateMessage } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';

const steps = [
  { key: 'pending', label: 'Chờ xác nhận', description: 'Cửa hàng đang tiếp nhận đơn hàng.' },
  { key: 'confirmed', label: 'Đã xác nhận', description: 'Đơn hàng đã được cửa hàng xác nhận.' },
  { key: 'preparing', label: 'Đang chuẩn bị hàng', description: 'Cửa hàng đang chuẩn bị sản phẩm.' },
  { key: 'shipping', label: 'Đang giao hàng', description: 'Đơn hàng đang trên đường đến bạn.' },
  { key: 'completed', label: 'Đã giao hàng', description: 'Đơn hàng đã được giao thành công.' },
];
const paymentLabel = { cod: 'Thanh toán khi nhận hàng (COD)', bank_transfer: 'Chuyển khoản ngân hàng', momo: 'MoMo', zalopay: 'ZaloPay', vnpay: 'VNPay' };
const paymentStatusLabel = { unpaid: 'Chưa thanh toán', pending: 'Đang chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán thất bại', refunded: 'Đã hoàn tiền', expired: 'Hết hạn thanh toán' };
const formatDateTime = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function InfoRow({ label, value, strong = false }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: theme.colors.muted, flex: 1 }}>{label}</Text><Text style={{ color: theme.colors.ink, fontWeight: strong ? '800' : '600', textAlign: 'right', flexShrink: 1 }}>{value}</Text></View>;
}

export default function OrderDetailScreen({ route, navigation }) {
  const dispatch = useDispatch();
  const userId = useSelector(state => state.auth.user?._id);
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [buyAgainBusy, setBuyAgainBusy] = useState(false);
  const [bankAccount, setBankAccount] = useState(null);
  const [bankAccountError, setBankAccountError] = useState(false);
  const requestVersion = useRef(0);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!userId) { setOrder(null); setError(''); setLoading(false); return; }
    if (!orderId) { setOrder(null); setError('Không tìm thấy mã đơn hàng.'); setLoading(false); return; }
    setOrder(null);
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/orders/${orderId}`);
      const result = response?.data?.data?.order;
      if (!result || typeof result !== 'object') throw new Error('Dữ liệu chi tiết đơn hàng từ máy chủ không hợp lệ.');
      if (version === requestVersion.current) setOrder({ ...result, items: Array.isArray(result.items) ? result.items.filter(item => item && typeof item === 'object') : [], statusHistory: Array.isArray(result.statusHistory) ? result.statusHistory.filter(event => event && typeof event === 'object') : [] });
    } catch (loadError) { if (version === requestVersion.current) { setOrder(null); setError(loadError.message); } }
    finally { if (version === requestVersion.current) setLoading(false); }
  }, [orderId, userId]);
  useFocusEffect(useCallback(() => {
    load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    return () => subscription.remove();
  }, [load]));
  useEffect(() => {
    let active = true;
    api.get('/payments/methods', { skipAuth: true }).then(response => {
      if (active) setBankAccount(response.data.data.methods.find(method => method.id === 'bank_transfer')?.bankAccount || null);
    }).catch(() => { if (active) setBankAccountError(true); });
    return () => { active = false; };
  }, []);

  async function handleCancel() {
    setCancelBusy(true);
    const result = await dispatch(cancelOrder(order._id));
    setCancelBusy(false);
    if (cancelOrder.fulfilled.match(result)) setOrder(result.payload);
    else Alert.alert('Không thể hủy đơn', result.error?.message || 'Vui lòng thử lại.');
  }

  async function checkPaymentStatus() {
    if (checkingPayment) return;
    setCheckingPayment(true);
    try {
      const response = await api.get(`/orders/${order._id}`);
      const updated = response?.data?.data?.order;
      if (!updated) throw new Error('Không đọc được trạng thái đơn hàng.');
      setOrder(updated);
      const statusText = paymentStatusLabel[updated.paymentStatus] || updated.paymentStatus;
      Alert.alert(updated.paymentStatus === 'paid' ? 'Thanh toán thành công' : 'Trạng thái thanh toán', `Đơn ${updated.orderNumber}: ${statusText}.`);
    } catch (checkError) {
      Alert.alert('Chưa kiểm tra được', checkError.message || 'Kiểm tra kết nối Internet rồi thử lại.');
    } finally { setCheckingPayment(false); }
  }

  async function handleBuyAgain() {
    setBuyAgainBusy(true);
    const available = [];
    const unavailable = [];
    const failed = [];
    for (const item of order.items) {
      try {
        const response = await api.get(`/products/${item.product}`);
        const product = response?.data?.data?.product;
        if (!product || !Array.isArray(product.variants)) { failed.push(item.name || 'Sản phẩm'); continue; }
        const variant = product.variants.find(candidate => candidate._id === item.variantId && candidate.isActive && candidate.quantity > 0);
        if (!variant) { unavailable.push(item.name); continue; }
        available.push({ productId: product._id, variantId: variant._id, name: product.name, price: product.price, size: variant.size, color: variant.color, image: variant.images?.[0] || product.images?.[0] || item.image, key: `${product._id}:${variant._id}`, quantity: Math.min(item.quantity, variant.quantity, 20) });
      } catch { failed.push(item.name || 'Sản phẩm'); }
    }
    if (available.length) {
      dispatch(addItems(available));
      navigation.navigate('Store', { screen: 'Cart' });
    }
    setBuyAgainBusy(false);
    if (!available.length && failed.length) Alert.alert('Không thể tải sản phẩm', 'Đang có lỗi kết nối. Vui lòng thử lại sau.');
    else if (!available.length) Alert.alert('Sản phẩm không còn hàng', 'Không có sản phẩm nào trong đơn này còn khả dụng để mua lại.');
    else if (unavailable.length || failed.length) Alert.alert('Đã thêm một phần sản phẩm', `Không thể thêm: ${[...unavailable, ...failed].join(', ')}`);
  }

  if (loading) return <Page><StateMessage title="Đang tải chi tiết đơn hàng" loading /></Page>;
  if (!userId) return <Page><StateMessage title="Đăng nhập để xem đơn hàng" message="Đơn hàng chỉ hiển thị với tài khoản đã đặt." action="Đăng nhập" onAction={() => navigation.navigate('Auth')} /></Page>;
  if (error && !order) return <Page><StateMessage title="Không thể tải đơn hàng" message={error} action="Thử lại" onAction={() => { setLoading(true); load(); }} /></Page>;

  const isCancelled = order.status === 'cancelled';
  const isDeliveryFailed = order.status === 'delivery_failed';
  const currentStep = steps.findIndex(step => step.key === (isDeliveryFailed ? 'shipping' : order.status));
  const canCancel = ['pending', 'confirmed', 'preparing'].includes(order.status) && order.paymentStatus !== 'paid';
  const isOnlinePayment = ['momo', 'zalopay', 'vnpay'].includes(order.paymentMethod);
  const canContinuePayment = !['cancelled', 'completed', 'delivery_failed'].includes(order.status) && order.paymentStatus === 'pending' && isOnlinePayment && order.paymentUrl && (!order.paymentExpiresAt || new Date(order.paymentExpiresAt) > new Date());
  const history = order.statusHistory || [];
  const lastStatusEvent = status => [...history].reverse().find(event => event.status === status);
  return <Page>
    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 17, gap: 8 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 11, letterSpacing: 1 }}>MÃ ĐƠN HÀNG</Text>
      <Text selectable style={{ color: theme.colors.ink, fontSize: 21, fontWeight: '800' }}>{order.orderNumber}</Text>
      <Text style={{ color: theme.colors.muted }}>Đặt lúc {formatDateTime(order.createdAt)}</Text>
    </View>

    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 17, gap: 15 }}>
      <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: '800' }}>Trạng thái đơn hàng</Text>
      {isCancelled ? <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><View style={{ height: 28, width: 28, borderRadius: 14, backgroundColor: '#fae9e7', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.colors.danger, fontWeight: '800' }}>×</Text></View><View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Đơn hàng đã hủy</Text><Text style={{ color: theme.colors.muted, lineHeight: 19 }}>{lastStatusEvent('cancelled')?.at ? `Hủy lúc ${formatDateTime(lastStatusEvent('cancelled').at)}` : 'Đơn hàng này đã được hủy.'}</Text>{lastStatusEvent('cancelled')?.note ? <Text style={{ color: theme.colors.muted, lineHeight: 19 }}>{lastStatusEvent('cancelled').note}</Text> : null}</View></View> : steps.map((step, index) => {
        const reached = index <= currentStep;
        const active = index === currentStep;
        const event = lastStatusEvent(step.key);
        return <View key={step.key} style={{ flexDirection: 'row', gap: 12, minHeight: 46 }}>
          <View style={{ width: 24, alignItems: 'center' }}><View style={{ height: 22, width: 22, borderRadius: 11, backgroundColor: reached ? (active ? theme.colors.ink : theme.colors.success) : theme.colors.paper, borderWidth: reached ? 0 : 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' }}>{reached && index < currentStep ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}</View>{index < steps.length - 1 ? <View style={{ flex: 1, minHeight: 23, width: 2, backgroundColor: index < currentStep ? theme.colors.success : theme.colors.line }} /> : null}</View>
          <View style={{ flex: 1, gap: 3, paddingBottom: 13 }}><Text style={{ color: reached ? theme.colors.ink : theme.colors.muted, fontWeight: active ? '800' : '600' }}>{step.label}{active ? ' · Hiện tại' : ''}</Text>{event?.at ? <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{formatDateTime(event.at)}</Text> : null}{event?.note ? <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>{event.note}</Text> : active ? <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>{step.description}</Text> : null}</View>
        </View>;
      })}
      {isDeliveryFailed ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#fae9e7', gap: 5 }}><Text style={{ color: theme.colors.danger, fontWeight: '800' }}>Giao hàng thất bại</Text><Text style={{ color: theme.colors.danger, lineHeight: 19 }}>{lastStatusEvent('delivery_failed')?.note || 'Đơn hàng chưa giao thành công. Cửa hàng sẽ liên hệ để hỗ trợ.'}</Text>{lastStatusEvent('delivery_failed')?.at ? <Text style={{ color: theme.colors.danger, fontSize: 11 }}>{formatDateTime(lastStatusEvent('delivery_failed').at)}</Text> : null}</View> : null}
      {!history.length ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Đơn hàng cũ chưa có lịch sử thời điểm cập nhật trạng thái.</Text> : null}
    </View>

    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 17, gap: 13 }}>
      <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: '800' }}>Sản phẩm ({order.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)})</Text>
      {!order.items.length ? <Text style={{ color: theme.colors.muted }}>Đơn hàng không có dữ liệu sản phẩm.</Text> : null}
      {order.items.map((item, index) => <View key={`${item.variantId}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        {item.image ? <Image source={{ uri: item.image }} style={{ width: 62, height: 76, borderRadius: 11, backgroundColor: theme.colors.sand }} /> : <View style={{ width: 62, height: 76, borderRadius: 11, backgroundColor: theme.colors.sand }} />}
        <View style={{ flex: 1, gap: 5 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{item.name}</Text><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Size {item.size} · {item.color} · SL {item.quantity}</Text><Text style={{ color: theme.colors.ink }}>{formatVnd(item.unitPrice)}</Text></View>
        <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{formatVnd(item.unitPrice * item.quantity)}</Text>
      </View>)}
    </View>

    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 17, gap: 12 }}>
      <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: '800' }}>Thanh toán</Text>
      <InfoRow label="Tạm tính" value={formatVnd(order.subtotal)} />
      <InfoRow label="Giảm giá" value={`− ${formatVnd(order.discount)}`} />
      {order.promotionCode ? <InfoRow label="Mã ưu đãi" value={order.promotionCode} /> : null}
      <InfoRow label="Phí giao hàng" value={formatVnd(order.shippingFee)} />
      <View style={{ height: 1, backgroundColor: theme.colors.line }} />
      <InfoRow label="Tổng cộng" value={formatVnd(order.total)} strong />
      <View style={{ marginTop: 4, padding: 12, borderRadius: 12, backgroundColor: theme.colors.paper, gap: 5 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{paymentLabel[order.paymentMethod] || order.paymentMethod}</Text><Text style={{ color: theme.colors.muted, fontSize: 12 }}>Trạng thái thanh toán: {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}</Text></View>
      {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'unpaid' && order.status !== 'cancelled' ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.paper, gap: 4 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Chuyển khoản với nội dung {order.orderNumber}</Text>{bankAccount ? <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 19 }}>{bankAccount.bankName}{bankAccount.branch ? ` · ${bankAccount.branch}` : ''}{'\n'}Số tài khoản: {bankAccount.accountNumber}{'\n'}Chủ tài khoản: {bankAccount.accountName}</Text> : bankAccountError ? <Text style={{ color: theme.colors.danger, fontSize: 12 }}>Không tải được thông tin tài khoản ngân hàng. Vui lòng liên hệ cửa hàng.</Text> : <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Đang tải thông tin tài khoản ngân hàng…</Text>}<Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>Cửa hàng sẽ cập nhật trạng thái sau khi đối soát.</Text></View> : null}
      {canContinuePayment ? <Button title="Tiếp tục thanh toán" onPress={() => Linking.openURL(order.paymentUrl).catch(() => Alert.alert('Không thể mở cổng thanh toán'))} /> : null}
      {isOnlinePayment && ['pending', 'failed'].includes(order.paymentStatus) && order.status !== 'cancelled' ? <Button title="Kiểm tra trạng thái thanh toán" variant="light" loading={checkingPayment} onPress={checkPaymentStatus} /> : null}
      {!['cancelled', 'completed'].includes(order.status) && order.paymentStatus === 'paid' && order.paymentMethod !== 'cod' ? <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>Đơn hàng đã thanh toán. Nếu cần hủy, vui lòng liên hệ cửa hàng để xử lý hoàn tiền trước.</Text> : null}
      {!['cancelled', 'completed'].includes(order.status) && ['pending', 'failed'].includes(order.paymentStatus) && ['momo', 'zalopay', 'vnpay'].includes(order.paymentMethod) && !canContinuePayment ? <Text style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18 }}>Liên kết thanh toán không còn hiệu lực. Bạn có thể mua lại các sản phẩm còn hàng trong đơn này.</Text> : null}
    </View>

    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 17, gap: 8 }}>
      <Text style={{ color: theme.colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 3 }}>Địa chỉ nhận hàng</Text>
      <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{order.shipping?.recipient}</Text>
      <Text style={{ color: theme.colors.muted }}>{order.shipping?.phone}</Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>{[order.shipping?.line1, order.shipping?.ward, order.shipping?.district, order.shipping?.city].filter(Boolean).join(', ') || 'Chưa có địa chỉ giao hàng'}</Text>
    </View>

    {canCancel ? <Button title="Hủy đơn hàng" variant="light" loading={cancelBusy} onPress={() => Alert.alert('Hủy đơn hàng?', order.paymentStatus === 'refunded' ? 'Khoản thanh toán đã được hoàn. Hủy đơn sẽ hoàn lại tồn kho.' : 'Tồn kho sẽ được hoàn lại sau khi hủy.', [{ text: 'Giữ đơn', style: 'cancel' }, { text: 'Hủy đơn', style: 'destructive', onPress: handleCancel }])} /> : null}
    <Button title="Mua lại sản phẩm trong đơn" variant="light" loading={buyAgainBusy} onPress={handleBuyAgain} />
    {order.status === 'completed' ? <View style={{ gap: 8 }}><Text style={{ color: theme.colors.ink, fontWeight: '800' }}>Đánh giá sản phẩm</Text>{order.items.map((item, index) => <Pressable key={`${item.product}-${index}`} onPress={() => navigation.navigate('Review', { orderId: order._id, productId: item.product, productName: item.name })} style={{ padding: 13, borderRadius: 12, backgroundColor: '#fff' }}><Text style={{ color: theme.colors.accent, fontWeight: '700' }}>Viết đánh giá · {item.name} →</Text></Pressable>)}</View> : null}
  </Page>;
}
