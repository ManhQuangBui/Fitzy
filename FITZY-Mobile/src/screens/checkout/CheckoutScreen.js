import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { placeOrder } from '../../store/slices/orderSlice';
import { clearCart } from '../../store/slices/cartSlice';
import { Button, Field, Page, SectionTitle, StateMessage } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';
import api from '../../services/api';

export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch(); const items = useSelector(state => state.cart.items.filter(item => item.selected)); const promotion = useSelector(state => state.cart.selectedPromotion); const busy = useSelector(state => state.orders.status === 'loading'); const error = useSelector(state => state.orders.error); const user = useSelector(state => state.auth.user);
  const submitLock = useRef(false);
  const address = user?.addresses?.find(item => item.isDefault) || user?.addresses?.[0] || {};
  const [recipient, setRecipient] = useState(address.recipient || user?.name || ''); const [phone, setPhone] = useState(address.phone || user?.phone || ''); const [line1, setLine1] = useState(address.line1 || ''); const [ward, setWard] = useState(address.ward || ''); const [district, setDistrict] = useState(address.district || ''); const [city, setCity] = useState(address.city || ''); const [formError, setFormError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([{ id: 'cod', name: 'Thanh toán khi nhận hàng (COD)', description: 'Thanh toán tiền mặt khi nhận được đơn hàng.' }]); const [paymentMethod, setPaymentMethod] = useState('cod');
  useEffect(() => { let active = true; api.get('/payments/methods', { skipAuth: true }).then(response => { if (active) setPaymentMethods(response.data.data.methods); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    const savedAddress = user?.addresses?.find(item => item.isDefault) || user?.addresses?.[0] || {};
    setRecipient(savedAddress.recipient || user?.name || ''); setPhone(savedAddress.phone || user?.phone || '');
    setLine1(savedAddress.line1 || ''); setWard(savedAddress.ward || ''); setDistrict(savedAddress.district || ''); setCity(savedAddress.city || '');
  }, [user?._id]);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0); const discount = promotion?.discount || 0; const shippingFee = subtotal - discount >= 500000 ? 0 : 30000;
  if (!user) return <Page><StateMessage title="Đăng nhập để thanh toán" message="Đơn hàng sẽ được liên kết với tài khoản của bạn." action="Đăng nhập" onAction={() => navigation.navigate('Auth')} /></Page>;
  const submit = async () => {
    if (submitLock.current || busy) return;
    const shipping = { recipient: recipient.trim(), phone: phone.trim(), line1: line1.trim(), ward: ward.trim(), district: district.trim(), city: city.trim() };
    if (!items.length) return setFormError('Vui lòng chọn ít nhất một sản phẩm trong túi đồ.');
    if (!shipping.recipient || !shipping.phone || !shipping.line1 || !shipping.district || !shipping.city) return setFormError('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
    if (!/^\+?[0-9\s()-]{8,20}$/.test(shipping.phone)) return setFormError('Số điện thoại chưa hợp lệ.');
    setFormError('');
    submitLock.current = true;
    try {
      const result = await dispatch(placeOrder({ items: items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })), promotionCode: promotion?.code, paymentMethod, shipping }));
      if (placeOrder.fulfilled.match(result)) {
        const order = result.payload.order;
        dispatch(clearCart());
        if (result.payload.paymentUrl) {
          navigation.replace('Orders');
          try { await Linking.openURL(result.payload.paymentUrl); }
          catch { Alert.alert('Đã tạo đơn hàng', `Không thể mở cổng thanh toán. Mã đơn ${order.orderNumber} vẫn được lưu trong Đơn hàng.`); }
          return;
        }
        if (['momo', 'zalopay', 'vnpay'].includes(paymentMethod)) {
          navigation.replace('Orders');
          Alert.alert('Đơn hàng đã được tạo', `Chưa nhận được liên kết thanh toán. Nếu cổng đã xử lý giao dịch, trạng thái đơn ${order.orderNumber} sẽ được đồng bộ khi bạn kiểm tra lại.`);
          return;
        }
        const transfer = paymentMethods.find(method => method.id === paymentMethod)?.bankAccount;
        const message = paymentMethod === 'bank_transfer' && transfer
          ? `Mã đơn: ${order.orderNumber}\nNgân hàng: ${transfer.bankName}\nSố tài khoản: ${transfer.accountNumber}\nChủ tài khoản: ${transfer.accountName}${transfer.branch ? `\nChi nhánh: ${transfer.branch}` : ''}\nSố tiền: ${formatVnd(order.total)}\nNội dung: ${order.orderNumber}\n\nĐơn sẽ được xác nhận sau khi cửa hàng kiểm tra giao dịch.`
          : `Mã đơn ${order.orderNumber}. Thanh toán khi nhận hàng.`;
        Alert.alert(paymentMethod === 'bank_transfer' ? 'Đặt hàng thành công · Chuyển khoản' : 'Đặt hàng thành công', message, [{ text: 'Đã hiểu', onPress: () => navigation.replace('Orders') }]);
      }
    } finally { submitLock.current = false; }
  };
  return <Page>
    <SectionTitle title="Thông tin nhận hàng" />
    <Field label="Người nhận *" value={recipient} onChangeText={value => { setRecipient(value); setFormError(''); }} placeholder="Họ và tên người nhận" />
    <Field label="Số điện thoại *" value={phone} onChangeText={value => { setPhone(value); setFormError(''); }} placeholder="09xx xxx xxx" keyboardType="phone-pad" />
    <Field label="Địa chỉ cụ thể *" value={line1} onChangeText={value => { setLine1(value); setFormError(''); }} placeholder="Số nhà, tên đường" />
    <Field label="Phường / xã" value={ward} onChangeText={value => { setWard(value); setFormError(''); }} placeholder="Phường / xã" />
    <Field label="Quận / huyện *" value={district} onChangeText={value => { setDistrict(value); setFormError(''); }} placeholder="Quận / huyện" />
    <Field label="Tỉnh / thành phố *" value={city} onChangeText={value => { setCity(value); setFormError(''); }} placeholder="Tỉnh / thành phố" />
    <SectionTitle title="Phương thức thanh toán" />
    {paymentMethods.map(method => <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method.id }} onPress={() => setPaymentMethod(method.id)} style={{ padding: 15, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: paymentMethod === method.id ? theme.colors.ink : theme.colors.line, gap: 6 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>{paymentMethod === method.id ? '◉' : '○'}  {method.name}</Text><Text style={{ color: theme.colors.muted, lineHeight: 20 }}>{method.description}</Text>{method.bankAccount ? <Text style={{ color: theme.colors.ink, lineHeight: 20 }}>Ngân hàng: {method.bankAccount.bankName}{method.bankAccount.branch ? ` · ${method.bankAccount.branch}` : ''}{'\n'}Số tài khoản: {method.bankAccount.accountNumber}{'\n'}Chủ tài khoản: {method.bankAccount.accountName}{'\n'}Nội dung chuyển khoản sẽ là mã đơn hàng.</Text> : null}</Pressable>)}
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 18, gap: 10 }}><Text style={{ color: theme.colors.ink, fontWeight: '700' }}>Tóm tắt đơn hàng</Text><Summary label="Tạm tính" value={formatVnd(subtotal)} /><Summary label="Ưu đãi" value={`− ${formatVnd(discount)}`} /><Summary label="Giao hàng" value={formatVnd(shippingFee)} /><Summary label="Tổng tiền" value={formatVnd(subtotal - discount + shippingFee)} strong /></View>
    {formError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{formError}</Text> : null}{error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}<Button title="Xác nhận đặt hàng" disabled={!items.length} loading={busy} onPress={submit} />
  </Page>;
}
function Summary({ label, value, strong }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: strong ? theme.colors.ink : theme.colors.muted, fontWeight: strong ? '700' : '400' }}>{label}</Text><Text style={{ color: theme.colors.ink, fontWeight: strong ? '800' : '500' }}>{value}</Text></View>; }
