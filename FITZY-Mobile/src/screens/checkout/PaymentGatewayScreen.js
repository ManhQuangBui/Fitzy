import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Button, Page, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';
import { isVnPayPaymentUrl, isPaymentReturnUrl, isWebPaymentUrl } from '../../services/paymentNavigation';

export default function PaymentGatewayScreen({ route, navigation }) {
  const { orderId, paymentUrl } = route.params || {};
  const finished = useRef(false);
  const webView = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const valid = typeof orderId === 'string' && /^[a-f\d]{24}$/i.test(orderId) && isVnPayPaymentUrl(paymentUrl);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    // Ignore callback status/identifiers: the result screen reads this order from the API.
    navigation.replace('PaymentResult', { orderId });
  }

  function allowNavigation(request) {
    if (isPaymentReturnUrl(request.url)) { finish(); return false; }
    if (isWebPaymentUrl(request.url) || request.url === 'about:blank') return true;
    Alert.alert('Chọn thanh toán bằng thẻ', 'Để thanh toán ngay trong FITZY, hãy chọn thẻ nội địa NCB thay vì mở ứng dụng ngân hàng.');
    return false;
  }

  if (!valid) return <Page><StateMessage title="Liên kết thanh toán không hợp lệ" message="Vui lòng mở lại đơn hàng để kiểm tra giao dịch." action="Xem đơn hàng" onAction={() => navigation.replace('Orders')} /></Page>;
  return <View style={{ flex: 1, backgroundColor: theme.colors.paper }}>
    {error ? <View style={{ padding: 20, gap: 12 }}><StateMessage title="Không tải được cổng thanh toán" message={error} /><Button title="Thử lại" onPress={() => { setError(''); setLoading(true); webView.current?.reload(); }} /></View> : null}
    <WebView
      ref={webView}
      source={{ uri: paymentUrl }}
      style={{ flex: 1, display: error ? 'none' : 'flex' }}
      originWhitelist={['*']}
      onShouldStartLoadWithRequest={allowNavigation}
      onNavigationStateChange={state => { if (isPaymentReturnUrl(state.url)) finish(); }}
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onError={event => { if (!finished.current) { setLoading(false); setError(event.nativeEvent.description || 'Vui lòng kiểm tra kết nối mạng.'); } }}
      onHttpError={event => { if (!finished.current) { setLoading(false); setError(`Cổng thanh toán trả lỗi ${event.nativeEvent.statusCode}. Vui lòng thử lại.`); } }}
      onContentProcessDidTerminate={() => webView.current?.reload()}
      setSupportMultipleWindows={false}
      thirdPartyCookiesEnabled
      sharedCookiesEnabled
      mixedContentMode="never"
    />
    {loading && !error ? <View style={{ position: 'absolute', top: 12, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 10 }}><ActivityIndicator color={theme.colors.ink} /></View> : null}
    <View style={{ padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.line }}><Text style={{ color: theme.colors.muted, textAlign: 'center', fontSize: 12 }}>Thanh toán bảo mật qua VNPay</Text><Button title="Đóng và kiểm tra đơn hàng" variant="light" onPress={finish} /></View>
  </View>;
}
