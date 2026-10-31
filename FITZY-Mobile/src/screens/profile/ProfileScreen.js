import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signOut, updateProfile } from '../../store/slices/authSlice';
import { Button, Field, Page, SectionTitle } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch(); const user = useSelector(state => state.auth.user); const busy = useSelector(state => state.auth.status === 'loading'); const error = useSelector(state => state.auth.error); const [name, setName] = useState(user?.name || ''); const [phone, setPhone] = useState(user?.phone || '');
  useEffect(() => { setName(user?.name || ''); setPhone(user?.phone || ''); }, [user?._id, user?.name, user?.phone]);
  if (!user) return <Page><View style={{ gap: 8 }}><Text style={{ fontSize: 25, fontWeight: '800', color: theme.colors.ink }}>Chào bạn.</Text><Text style={{ color: theme.colors.muted }}>Đăng nhập để theo dõi đơn hàng và đồng bộ danh sách yêu thích.</Text></View><Button title="Đăng nhập / Đăng ký" onPress={() => navigation.navigate('Auth')} /><Button title="FITZY Stylist · Tư vấn phối đồ" variant="light" onPress={() => navigation.navigate('Stylist')} /></Page>;
  const save = async () => { const result = await dispatch(updateProfile({ name, phone })); if (updateProfile.fulfilled.match(result)) Alert.alert('Đã lưu', 'Thông tin cá nhân đã được cập nhật.'); };
  const logout = async () => {
    try { await dispatch(signOut()).unwrap(); Alert.alert('Đã đăng xuất'); }
    catch (logoutError) { Alert.alert('Chưa thể đăng xuất', logoutError || 'Vui lòng thử lại.'); }
  };
  return <Page><View style={{ gap: 5 }}><Text style={{ color: theme.colors.muted }}>TÀI KHOẢN FITZY</Text><Text style={{ fontSize: 25, color: theme.colors.ink, fontWeight: '800' }}>{user.name}</Text><Text style={{ color: theme.colors.muted }}>{user.email}</Text></View><SectionTitle title="Thông tin cá nhân" /><Field label="Họ tên" value={name} onChangeText={setName} /><Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />{error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}<Button title="Lưu hồ sơ" loading={busy} onPress={save} />
    <View style={{ gap: 9 }}><Button title="Đơn hàng của tôi" variant="light" onPress={() => navigation.navigate('Orders')} /><Button title="Tư vấn FITZY Stylist" variant="light" onPress={() => navigation.navigate('Stylist')} /><Button title="Đăng xuất" variant="light" loading={busy} onPress={logout} />
    </View></Page>;
}
