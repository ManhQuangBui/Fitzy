import React, { useCallback, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { Button, Page, StateMessage } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';

const titles = { paid: 'Thanh toán thành công', failed: 'Thanh toán chưa thành công', expired: 'Đã hết hạn thanh toán', refunded: 'Đã hoàn tiền' };

export default function PaymentResultScreen({ route, navigation }) {
  const userId = useSelector(state => state.auth.user?._id);
  const orderId = route.params?.orderId;
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const validOrderId = typeof orderId === 'string' && /^[a-f\d]{24}$/i.test(orderId);

  useFocusEffect(useCallback(() => {
    let active = true;
    let timer;
    let inFlight = false;
    let attempts = 0;
    setOrder(null);
    setError('');
    if (!userId || !validOrderId) { setChecking(false); return undefined; }
    async function check() {
      if (!active || inFlight) return;
      clearTimeout(timer);
      inFlight = true;
      setChecking(true);
      try {
        // Status in the deep link is untrusted. Read the authenticated order instead.
        const response = await api.get(`/orders/${orderId}`);
        if (!active) return;
        const updated = response?.data?.data?.order;
        if (!updated) throw new Error('Không đọc được trạng thái đơn hàng.');
        setOrder(updated);
        setError('');
        attempts += 1;
        if (['pending', 'unpaid'].includes(updated.paymentStatus) && updated.status !== 'cancelled' && attempts < 10) timer = setTimeout(check, 3000);
        else setChecking(false);
      } catch (checkError) {
        if (active) { setError(checkError.message || 'Không thể kết nối máy chủ.'); setChecking(false); }
      } finally { inFlight = false; }
    }
    check();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { attempts = 0; check(); } });
    return () => { active = false; clearTimeout(timer); subscription.remove(); };
  }, [userId, orderId, validOrderId, retry]));

  if (!userId) return <Page><StateMessage title="Đăng nhập để xem kết quả thanh toán" message="Sử dụng tài khoản đã đặt đơn để kiểm tra giao dịch." action="Đăng nhập" onAction={() => navigation.navigate('Auth')} /></Page>;
  if (!validOrderId) return <Page><StateMessage title="Không xác minh được kết quả trả về" message="Mở đơn hàng để kiểm tra trạng thái thanh toán từ cửa hàng." action="Xem đơn hàng" onAction={() => navigation.replace('Orders')} /></Page>;
  const title = order?.status === 'cancelled' && order.paymentStatus !== 'paid' ? 'Đơn hàng đã hủy' : titles[order?.paymentStatus] || 'Đang chờ xác nhận thanh toán';
  return <Page>
    <StateMessage title={title} loading={checking} message={error || (order?.paymentStatus === 'paid' ? 'Cửa hàng đã nhận được xác nhận thanh toán.' : ['pending', 'unpaid'].includes(order?.paymentStatus) ? 'Kết quả sẽ cập nhật khi cửa hàng nhận được thông báo từ cổng thanh toán. Bạn có thể kiểm tra lại sau.' : '')} />
    {order ? <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 8 }}><Text selectable style={{ color: theme.colors.ink, fontWeight: '700' }}>Mã đơn: {order.orderNumber}</Text><Text style={{ color: theme.colors.muted }}>Tổng tiền: {formatVnd(order.total)}</Text></View> : null}
    {!checking && (!order || ['pending', 'unpaid'].includes(order.paymentStatus)) ? <Button title="Kiểm tra lại" onPress={() => setRetry(value => value + 1)} /> : null}
    <Button title="Xem chi tiết đơn hàng" variant="light" onPress={() => navigation.replace('OrderDetail', { orderId })} />
    <Button title="Về danh sách đơn hàng" variant="light" onPress={() => navigation.replace('Orders')} />
  </Page>;
}
