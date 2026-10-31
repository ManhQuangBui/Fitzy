import React, { useCallback, useMemo, useState } from 'react';
import { AppState, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders } from '../../store/slices/orderSlice';
import { Page, StateMessage } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';

const statusLabel = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn tất', cancelled: 'Đã hủy' };
const orderStatuses = [['', 'Tất cả'], ['pending', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'], ['preparing', 'Đang chuẩn bị'], ['shipping', 'Đang giao'], ['completed', 'Đã giao'], ['delivery_failed', 'Giao thất bại'], ['cancelled', 'Đã hủy']];
const paymentLabel = { cod: 'COD', bank_transfer: 'Chuyển khoản ngân hàng', momo: 'MoMo', zalopay: 'ZaloPay', vnpay: 'VNPay' };
const paymentStatusLabel = { unpaid: 'Chưa thanh toán', pending: 'Đang chờ thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán thất bại', refunded: 'Đã hoàn tiền', expired: 'Hết hạn' };
const orderStatusLabel = { ...statusLabel, preparing: 'Đang chuẩn bị', delivery_failed: 'Giao hàng thất bại' };
const formatOrderDate = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('vi-VN') : '—';

export default function OrdersScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { items, status, error } = useSelector(state => state.orders);
  const [statusFilter, setStatusFilter] = useState('');
  const load = useCallback(() => { if (user) dispatch(fetchOrders()); }, [dispatch, user?._id]);
  const visibleOrders = useMemo(() => statusFilter ? items.filter(order => order.status === statusFilter) : items, [items, statusFilter]);
  useFocusEffect(useCallback(() => {
    load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    return () => subscription.remove();
  }, [load]));

  if (!user) return <Page><StateMessage title="Đăng nhập để xem đơn hàng" action="Đăng nhập" onAction={() => navigation.navigate('Auth')} /></Page>;

  return <Page refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={load} tintColor={theme.colors.ink} colors={[theme.colors.ink]} />}>
    <View style={{ gap: 5 }}>
      <Text style={{ color: theme.colors.ink, fontSize: 24, fontWeight: '800' }}>Lịch sử đơn hàng</Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 21 }}>Theo dõi trạng thái giao hàng và xem lại thông tin từng đơn.</Text>
    </View>
    {status === 'loading' && !items.length ? <StateMessage title="Đang tải đơn hàng" loading /> : null}
    {error && !items.length ? <StateMessage title="Không thể tải đơn hàng" message={error} action="Thử lại" onAction={load} /> : null}
    {error && items.length > 0 ? <View style={{ padding: 12, borderRadius: 12, backgroundColor: '#fae9e7', gap: 8 }}><Text style={{ color: theme.colors.danger }}>Không thể làm mới danh sách: {error}</Text><Pressable accessibilityRole="button" onPress={load}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Thử lại</Text></Pressable></View> : null}
    <View accessibilityRole="summary" style={{ gap: 9 }}>
      <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Lọc theo trạng thái</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {orderStatuses.map(([value, label]) => <Pressable key={value || 'all'} accessibilityRole="button" accessibilityState={{ selected: statusFilter === value }} onPress={() => setStatusFilter(value)} style={{ borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: statusFilter === value ? theme.colors.ink : '#fff', borderWidth: 1, borderColor: statusFilter === value ? theme.colors.ink : theme.colors.line }}><Text style={{ color: statusFilter === value ? '#fff' : theme.colors.ink, fontSize: 11, fontWeight: '700' }}>{label}</Text></Pressable>)}
      </View>
    </View>
    {visibleOrders.map(order => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const statusColor = ['cancelled', 'delivery_failed'].includes(order.status) ? theme.colors.danger : order.status === 'completed' ? theme.colors.success : theme.colors.accent;
      return <Pressable accessibilityRole="button" accessibilityLabel={`Xem chi tiết đơn ${order.orderNumber}`} key={order._id} onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 5 }}><Text style={{ color: theme.colors.ink, fontSize: 15, fontWeight: '800' }}>{order.orderNumber || 'Đơn hàng'}</Text><Text style={{ color: theme.colors.muted, fontSize: 12 }}>{formatOrderDate(order.createdAt)} · {itemCount} sản phẩm</Text></View>
          <View style={{ backgroundColor: `${statusColor}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }}><Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{orderStatusLabel[order.status] || order.status}</Text></View>
        </View>
        {(order.items || []).slice(0, 2).map((item, index) => <View key={`${order._id}-${item.variantId || index}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {item.image ? <Image source={{ uri: item.image }} style={{ width: 50, height: 60, borderRadius: 9, backgroundColor: theme.colors.sand }} /> : <View style={{ width: 50, height: 60, borderRadius: 9, backgroundColor: theme.colors.sand }} />}
          <View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={{ color: theme.colors.ink, fontWeight: '600' }}>{item.name}</Text><Text style={{ color: theme.colors.muted, fontSize: 11 }}>{item.size} / {item.color} × {item.quantity}</Text></View><Text style={{ color: theme.colors.ink }}>{formatVnd(item.unitPrice * item.quantity)}</Text>
        </View>)}
        {order.items.length > 2 ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>và {order.items.length - 2} sản phẩm khác</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}><View style={{ borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: `${statusColor}15` }}><Text style={{ color: statusColor, fontSize: 10, fontWeight: '700' }}>Đơn: {orderStatusLabel[order.status] || order.status}</Text></View><View style={{ borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#f4f2ee' }}><Text style={{ color: theme.colors.muted, fontSize: 10, fontWeight: '700' }}>Thanh toán: {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}</Text></View></View>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.line, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ flex: 1, color: theme.colors.muted, fontSize: 12 }}>{paymentLabel[order.paymentMethod] || order.paymentMethod}</Text><Text style={{ color: theme.colors.ink, fontWeight: '800' }}>{formatVnd(order.total)}</Text></View>
        <Text style={{ color: theme.colors.accent, fontWeight: '700', fontSize: 12 }}>Xem chi tiết đơn hàng  →</Text>
      </Pressable>;
    })}
    {!items.length && status === 'idle' ? <StateMessage title="Chưa có đơn hàng" message="Các đơn đã đặt sẽ hiển thị tại đây." action="Khám phá" onAction={() => navigation.navigate('Catalog')} /> : null}
    {items.length > 0 && visibleOrders.length === 0 ? <StateMessage title="Không có đơn phù hợp" message="Thử chọn trạng thái khác để xem đơn hàng." action="Xóa bộ lọc" onAction={() => setStatusFilter('')} /> : null}
  </Page>;
}
