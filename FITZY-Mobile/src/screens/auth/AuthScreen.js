import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, signIn, signUp } from '../../store/slices/authSlice';
import { Button, Field, Page } from '../../components/ui';
import { theme } from '../../constants/theme';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ navigation }) {
  const dispatch = useDispatch();
  const busy = useSelector(state => state.auth.status === 'loading');
  const error = useSelector(state => state.auth.error);
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [validationError, setValidationError] = useState('');
  const isRegister = mode === 'register';

  const submit = async () => {
    dispatch(clearAuthError());
    setValidationError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) return setValidationError('Hãy nhập địa chỉ email hợp lệ.');
    if (password.length < 6) return setValidationError('Mật khẩu cần có ít nhất 6 ký tự.');
    if (isRegister && name.trim().length < 2) return setValidationError('Hãy nhập họ tên (ít nhất 2 ký tự).');
    if (isRegister && password !== confirmation) return setValidationError('Mật khẩu xác nhận chưa khớp.');

    const actionCreator = isRegister ? signUp : signIn;
    const result = await dispatch(actionCreator(isRegister ? { name: name.trim(), email: normalizedEmail, password } : { email: normalizedEmail, password }));
    if (actionCreator.fulfilled.match(result) && result.payload?.role !== 'admin') navigation.goBack();
  };

  return <Page>
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.colors.muted, letterSpacing: 1 }}>FITZY ACCOUNT · FIREBASE</Text>
      <Text style={{ fontSize: 28, color: theme.colors.ink, fontWeight: '800' }}>{isRegister ? 'Tạo tài khoản mới.' : 'Mừng bạn trở lại.'}</Text>
      <Text style={{ color: theme.colors.muted, lineHeight: 21 }}>{isRegister ? 'Tạo tài khoản để đồng bộ túi đồ, yêu thích và đơn hàng.' : 'Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng.'}</Text>
    </View>
    {isRegister ? <Field label="Họ tên" value={name} onChangeText={setName} placeholder="Họ và tên" /> : null}
    <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="ban@email.com" />
    <View style={{ gap: 7 }}>
      <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={!passwordVisible} autoCapitalize="none" placeholder="Ít nhất 6 ký tự" />
      <Pressable accessibilityRole="button" accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setPasswordVisible(value => !value)} hitSlop={8}>
        <Text style={{ color: theme.colors.muted, textAlign: 'right', fontSize: 12, fontWeight: '600' }}>{passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</Text>
      </Pressable>
    </View>
    {isRegister ? <Field label="Xác nhận mật khẩu" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!passwordVisible} autoCapitalize="none" placeholder="Nhập lại mật khẩu" /> : null}
    {validationError || error ? <Text selectable style={{ color: theme.colors.danger, lineHeight: 21 }}>{validationError || error}</Text> : null}
    <Button title={isRegister ? 'Đăng ký' : 'Đăng nhập'} loading={busy} onPress={submit} />
    <Button variant="light" title={isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'} onPress={() => { setMode(isRegister ? 'login' : 'register'); setValidationError(''); dispatch(clearAuthError()); }} />
  </Page>;
}
