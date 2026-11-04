import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, signIn, signUp } from '../../store/slices/authSlice';
import { firebaseAuthConfigured, firebaseAuthConfigError } from '../../config/firebase';
import { theme } from '../../constants/theme';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const ICONS = {
  mail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMLSURBVHhe7ZotkBNBEIVPIpFIJBKJRFFIJBKJROK6BZnJzFEVGYm6QiJPIhAnwSEPB45CXRUGqpPNXfL2Z3a3J8lOqr+qNpvJS15n3+zsZs7ODMMwDMMwDMMwDONUOPf0tKTC75+d+I4eR8/L4Plr9PyvxAqev0fPH8OMXqC/0RDRveDZ44eVXsHzZYz0AP0OompOsWdMshxfe08P0XdvJFI10VMrx1fouxfzOT2pia0Fr9eNo1c4EU615jN6ee55Uc1BNU/B0Wv0nyQ4/oBC0hiJHY4tiTijt+hLphEcl6Q6U7bOHPoVPf+Q4zJpl9aouaM30ojg+Xdw9A2btCC6j+9pRQajQPT8Z7dhfKWa4A5E5eVTg5+dkijie1uRwSgQHP2tHZNfI+eaIjOreRST0FL6Bnm+wGN34ryYWuQkUtHzDX7Xqr7gMXWD5FjwxHj8tiYSuVSkVhcfR8/weJYGbV4Ljn/i66sPP3LkEpG6kaWJjOvy14uUgCzRo+PPOOZu7OEj1xUpWf+8n9GjzdiUvyR9BaYQuT6Rwh+rr79WhggcM3J9I4UM8dfIUIFjRG5IpJCh/mqMFThE5MZEChnr7xaNwD4jNzZSiMbfCq3APiKniRSi9acXqMgRuRyRQtT+1AJbaCKXK1KI2p9aABgTuZyRQtT+1AIt9IncPiKFqP2pBTpIRq7lNU2kELU/tUCCVOSwtJFC1P7UAj3pjNymORkihaj9qQUG0BG5bJFC1P7UAgPByOWOFKL2pxYYifz/37UuyoXan1pg4qj9qQUmjtqfWmDiqP2pBSaO2p9aYOKo/akFJo7aX5NAdPQcx5VKk79BDZJFGgrIbQGOKxVZa6G/QQ0S5M56t0F8iWNKpWnPZZ+nmzusNjmCiOzUwnGlUe3W3XkQJ/eCOC6JbEvDBlW1lPlITsnSqjpzak8p5Ykm+u+FPOVDsVMrOXsG7S7bpul0PLVS3xzLPwttu0NLLrkIZZtT1xvKifHKVmhJIpajY5VCLoc4+ZVSMmWgH8MwDMMwDMMwDMMojv9ZPuaAQWKvYQAAAABJRU5ErkJggg==',
  lock: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAPXSURBVHhe7ZshcBQxFIYrkUgkikEikQiGQSAYFIpBIHBUongRXLKb60xlJbLyJLKygwGJQFRWVp485uX2mLt/39L2Lv9ttrPfzDN77/a9fcm+JC/Zg4ORkZGRkZGRkZG9EoI8rLwcRu/OkgS3WJc6uF96fRrccfwqT/D/d5YY5H0d3G8MyHVSe3dZB3HHIvfxnneCeiKvtwkMigZKex7ef7CIyL0Y3Ak+6M7i3dnge1OM8iB6d956uDWpg7uKwc309dkQ775F7y5QH4J0Mdj81ATnfw94Gr28xP8hGoA6uBCDmxv3WAZ4aEFKr1VXz9ERa4sHSgHXoOL9lve80N/xP8WSXg98iNTa4lD3tlQTeWv2Ju/OtWFQvzh0tGo5H9xCHwx1t6V57TR3QQO4gLpFoS1oDuUT+Yy6u9LREPOiX7U0M2636nfUy0WaZYM9vYZ6xWCOWlsk5JuSeqx3l9iLipwfaSBawQnuBPVyY/VaXc6gXu/oCIWOVpU8Rb3caG8xRrUZ6vUOznu066MOC6MaMEed3sH8o3Mh1GFhvWbF5aENB32eSeFNaQ353i2OJvIY9XrjyMsjbME6fPmEeixikOdof1rJG9TrjejlBTpYB/mAeiyOvLxC+9Mq38x9Z6ZBnqGD0cuhXt+HqC20r9fRz72TqoTLhekfdLBvaSaQs9rLx70vYnW9o0sIdKpU0fXhPuZkCS1yWSvpYQh5hq1bNcasdVBCzU3GjHUp3v1sXQvyDpMpTapUREt2a+8WsXKLqXc/2j4tq4+UnNSajK3qwU1deb2KyCxxdGHZ17xj1acoJREdEdAQFt119sosb1yHZT9dg7SgQVvXyQKutfR1Q51Ssfblsq7VmpICv5uS0NGr7X/GZK03QwOak1CvVCz/6QHKaoAM3X+6ATJ0/+kGyND9pxsgQ/efboAM3X+2gVQdWB530aXMae6VN9t/qgFdAFvVgVz3V5j+J5gGuo606CFO1N0Wpv8JpgFj6/ifoO62MP1PMA10lVBybjwy/U8wDWhFAO+dJOORGab/CbaB5uz0KlHPcwZHYfvPN0CG7j/dABm6/3QDZOj+0w2QoftPN0CG7j/dABm6/5YB3NEoGcv/rAFqtk42A5R5rsLE2tPLGiDFWHGXd1CyA+uAqVYRUG8njDXTPLsRAs2HNZvnJ4O7Qr2daT5J2mgFPdmadQMuM83HfFY55RR1d0YDYZUmVt+SatLW97oU0Rxp7cuntR5re7xz5T0kYQ8u1j73UGRvp06gPDEMYfccZLUTMYBAzXLvktwanUhikuxbaIl4ZGRkZKQc/gLhmFR+/ZjSmwAAAABJRU5ErkJggg==',
  user: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAPDSURBVHhe7ZshcBsxEEUDCwsLCwsLCwsLCwsDCwvDtKCWfJfOGBoGBgYWGgYWFgYGFhq282U5Y//bO5/PurPk6s1oJpPsybfr1WpXq1xdFQqFQqFQGEA1M59rJ8vayqp28ndvWHmsndzPZ+bLwpjX/OxFM7fmW+XkT8Mo7WNdOXEXb6j6u3lfOfmtGKDXgFHhdTzvRVA7cw1PYKUHjZm54fmzJhinqWgYlZNfWEKVM7IdalzaGbdOFvw5WTKfmw9tnlNZuXPOvOVntiDmeGO1PA/D8zNZYYx5VVt5YsUQS26d+cjybdS1eRN2NTbSGn9j+WzAbsVKVVaeu7ymDRgbS1GZ745lsyAo1NjKj/EcBobV5sTuyLLJgwSPFYkRWFWvdEZYLnng+qxIrHjBcQ25FcskDyuBbZtlhuLLEzJ+dlk2K4A8h2WGEmq4vfl/zMw7lksWvy2zgaz5ynJDCbnV3vynBP/JwW7DCsRM6rBr8fxZGQiwAjHrp9qaT435c9vqkRCSEvcsM5RQfuwbKNIOORlKsblG8shyQ+CyA18GyySPltDhdyx3LFr8ybLc0AI1vulTvUirxxCTWC4LEHcayjh5YLm+IJfi+WAwlsuGkA81z3KsrI7NfNXADAPlfgSLBJGV8opZee6jnI85zYC/HUuWzxKtdnoxlD9uNYJED8ZA7MLPPsi3G8Z74anxLBn8yaKTh4aSQ4eVx2OXaBa0xZEjx/JiPEfjQExpHTjz6ROzLgYfc5wslZJk1yg4XvXtZ37+vwJnOTDY7siu+CxMCDzkpXtqZaWXD/K0/TuWmc+nLtWrNu2aw+3kPsNfYLByh1NF/pzsQBFZOfnJSsYafmeLeJQ7Gf7Ej7saIw4s0Sw8yl820PphLcPfFbKyQkNx92bHpvSQxU4Maha8ysAzyWbYSOK6cppgEOQ1S991PfKI1HcyZuaGTxN54B2Sy5sOlRCbW2XmOlaJAGP18NSHWJ93Ep3GsfI4ZjvGG6rrSt+Ac6eodBhnHbPNcwi/9FriFAL4WTypzTh4oXO0gRHTOlKKaC2nXoTOQuMbg3HO6tIdh3MxOiq90UqDFIyzpcW715OUKmG97xvHynMqxtnScoI5uKPSi3B02lhaKfalNjdklR1uTC/SOhQpdzW1e0SjepGSxSZ/DVeJl+tRwoHWE598+xyA5kWjnABo/04wZpYcC+06MvIlljuZhoGsPLFMqnDdNoqBwq7g17P/RsbcDSKz++7+nCqjd58MLDXfLUl8UykUCoVCoVAoFAqFQqFQGJl/+pQhpEC/oN8AAAAASUVORK5CYII=',
  eye: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAR2SURBVHhe7ZohbBRBFIaRSBxIJLISiaxEokglElk3I3ozt1tIcYfDUXkJpvJkDUkTTGUNSWWDWhIgJf/sbHv79u3M222vd23elzxznZmbefPmf2/m+uiRoiiKoiiKoiiKoiiKoijKxlOW5lnpzHbhjb02e1Q6u2h9NjGvvTfPaf8HBxY5deZ97QB7UXp7OcRCH2cXGOPBOAxRggUV3p7QBd/UCm9PEWH4Dvq9Gw8mve/tQeltRRe2Ciuc/XIvourAmCdDHNMcG2hPW4uMxefhb86e034Jm2+so0pvdnKLgUOw20OFtxH04Hxnz+i4xKpyYnbpGGvjw8S8CLvdneiyzeEU2ncs5Z7ZKr2dpSIVGjWdmpe0752CRacyUk4bjDGPpxPzBu2WslsVHT5HVOLY0n4NAq2rCmfe0X53AsKYmVCze0e57ILdFRyXWqe82aH9lwlHsI6oTv9oM2wG7bcS8EWlt4fMJBAx57nFoH/hrad9cyZ1Oo4W7RvM2eNc/xsTF3fU+fJ6AovUcQCx//iayNmz1JFt6N0AYf9RpJwDHaDtOfqOAZxWp3ZkKvMqHN8+4Xf2mI7LAW1jtWkVTko4p8JEaHuOsPCuY5L6Eu5qXOkgTOPIdmz/23YSt5t1kWe2aVuOoFtEkNFfMkkcW0ZXKqme4DvodzdOko6RJKbRrnP2zBZt2weihI6RihxKyHi0vzCKAJzEap+zixtlN9QQdNChzgF1TdOamEhHlgm1Unsuc9omRYzErpO8ndG2Ij5687b09i8ZrBpTndIQxw2ftsnR2Sxnz2ibHPWV5Xou+9EKZz7TtllKZ39Rb0sFmdLJJkLtWiZeL1rzyZUVHEG4vflNnP1v8FErvP1DJlTh3kXbSaALQ0ajbXKEOx8ZRyLylPqomZ90rE+TyVPaNsnUm690EITnqF3rZBG5QDfEuuZqDGghbZMjZlMuI3+nbUUUznyjg41RfjopCC5tk6OTTZ1d0DY5GKGH/Ri6nit6rwaCa8UyzMW2GpIJIa604JNW7w2cczDmmGPaItQQTDUKx0mdFG/bLaFGf+nOcZfjITrGOWdsRmaplb/77oNFSneAiaJQD6WEPwgqv7hD2pYjvjy0a7DonDGZNEnCSRfS3QxPDsxkcVyaZ9jW72Vc5OIzwRWht3pehXMa+pwEkxR/MVV3b9gDTPJ0G9+FuHmuzjkNoWDrpO0rm+d2N/molTAsOFeoZh7jVu+chliyc8clLCT3DpxZSMckr4lYfO/G4fMBWfNWiALIPoDFRZ3kjkM8sj7WSeQ6EjZgltv18M7EFH9LNpdm25UQf1rmznvjqFNUzpKUDo2Spt4YMSnHXELoab+1EOscLp0uGyIk+1NOivgqOeOyW8sy5cPaSOoAtbrdISIQC6fWpPr6mPF6R02ifxtBeEGUOuoWDBEFR4+NzLURHSXa/TFWF4Iyfdto6stmeBHM6VTW4JQH9U9UHPXPMcFh0Bf+31zi5+GiOjG70KV7HymKoiiKoiiKoiiKoiiKojxw/gOtkyFkARtPdQAAAABJRU5ErkJggg==',
  eyeOff: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAUdSURBVHhe7ZoxbBQ5FIYpKenuOigpKa+8ClFSUqGUV16Z7r2IrL3jgLgup2uuu6Rb6ZroJMR2ICQkBA1lGqTQRTQ3JwHi9GxP1vPm2eOZZMIm8Se9Ymdtr/3bfu/Zs9euFQqFQqFQKBQKhQkxCu5VGt9XCo8qDci/v/IYhYdG47fGKoV/8jJXFgC4bjTWoUBFJMaOxqdcoCJSAK2iSuMBF6iIFFBEyqCIlEERKYPTimQM/OhyK8CV4YFRuGw9m8F9reEWr38hGCISDXKu4FcnAB7z8n1m6yhcUhsXSrCUSEZv7dOAKo1vut+dzmxWrwFpJfI+rR1pkaY3Wq1rv6pstq3gGe98ypptQ+K2fREgPbffKTzi9RK2WFuhjIaN+TZ8FDrdEoRme6jjbRy6zebZmVCw2sxgk7fx3Xg8g9t2trsd7Rh33GMx23DHaNyVzocnv6Xx/XwOP/G65wqthKERKRSJtuV8Bg/oWRDdai/4glblU4Ab7V9dQSvLnxFjQtWVgl94vXOBlrHQISeCxoOdnUc3Y46bBKHZzdguzk9p2OC/H2K3oFtRnfredmkyeL1J8Fcfe0InaOBH4WDOMrrZdnpCOolOW4vXtabwZV/9U5McsMKltB2SdYaawsMc515p1J26A+qPIjVQ8gO8fEiqLhklki60U6SCn+32jTl+hS95+xLk20TfNIVIiQHW1BFeXsIouCvUdwJFops9q0l5UGYYp2gn1j9rkaTZdEke3ONlJVwSmXbIMZFo2wp+pc71JySE+Nv0LLONJNJVqxVnG+7wsjHIcfM2JIuJZCMeL5+5iggSSTwPKlyeKrpRDsEbHSoO4XKaVsdeRbZsVCSbK7XLLniZFH4ldkXSuMvLZvFEw0Oj8QtrrB6TnfIlTif8hF8TRepMlsJDXqYPd2RZ9WXHW6Xgd162F6PwE+94rkPmdKKJ911DRPLHi1YZKa3owzpuDf+1+4NfB2+1SuNn1qGazl28XA58YBTKm+9yRbJnPvb9mEjkthp84G39Npv9wMsmmWv4izdCy3PUrHWiSPvokCOSz2tWzzUeh23k4KOpFJFf87JZVAr+5o2N8fy8U3z7EH0idaKpwiVvow/B0ZO9GzqeE3ynu54/cqyIIRxsaykS9oj0b/i5L3vnSOJQEjlmm7awOYSQjZJwuSL503bLUVN9aeZSIoUW+rE+JHHGRmQR5/m79z40yNwZEFaRPVdJjj9DpD1eR8L6HJ6DOatzTwHZJEQ6zp1NEoTXp87SdmmuYYP3ZduVwnY4PrGtfd42J5o9TyFOQ0wkMkr+eHmOD9XdE/YIkxx9g78Xkvo5nTgNNmHrhO0TW/QdAJOXWgONi+S3pnwXdB7iNPiUXdou/s1F+h64ZyAdm2v8x2h4zp/b3/Mi0eCjE0fPhag5Kd4BRu+B7SXYDO7zeiF+y2qfJ7HjiJ2A3cxjSSfKBrbIjbaT4F8tS/vddd5uJ9iQQjqHfFQq9KZEkmxt/mzq8xwpnIZGK6T3VU4KipaV2vojHt28RdKH707SD3Bz5fZoBdLAuTV/jXHbTPZ3klUaX/B+rR32BjFXqAmMR7e1xQuVPftDba7xrVH4jj8nuzAiEeSj/I1gn5/qNYqO4Z+oUo77QokU4l7HWMHIv8h/c/HP7VvcGWySX4pFwksp0llTRMqgiJRBESmDIlIGKZFGvyy8bCREyn63f+mJiZQ6FF85/NXMKkkd8croSuD+kXtOt4qFQqFQKBQKhcvN/9CHxqynstKqAAAAAElFTkSuQmCC'
};

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

  useEffect(() => {
    navigation.setOptions({
      title: 'TÀI KHOẢN FITZY',
      headerTitleAlign: 'center',
      headerRight: () => null,
    });
  }, [navigation]);

  const handleForgotPassword = () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !emailPattern.test(normalizedEmail)) {
      return Alert.alert('Quên mật khẩu', 'Vui lòng nhập địa chỉ email vào ô Email để nhận hướng dẫn khôi phục mật khẩu.');
    }
    if (!firebaseAuthConfigured) {
      return Alert.alert('Thông báo', firebaseAuthConfigError);
    }
    Alert.alert('Quên mật khẩu', `Hệ thống sẽ gửi email đặt lại mật khẩu đến: ${normalizedEmail}.`);
  };

  const submit = async () => {
    dispatch(clearAuthError());
    setValidationError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) return setValidationError('Hãy nhập địa chỉ email hợp lệ.');
    if (password.length < 6) return setValidationError('Mật khẩu cần có ít nhất 6 ký tự.');
    if (isRegister && name.trim().length < 2) return setValidationError('Hãy nhập họ tên (ít nhất 2 ký tự).');
    if (isRegister && password !== confirmation) return setValidationError('Mật khẩu xác nhận chưa khớp.');

    const actionCreator = isRegister ? signUp : signIn;
    const result = await dispatch(
      actionCreator(
        isRegister
          ? { name: name.trim(), email: normalizedEmail, password }
          : { email: normalizedEmail, password }
      )
    );
    if (actionCreator.fulfilled.match(result) && result.payload?.role !== 'admin') {
      navigation.goBack();
    }
  };

  const displayError = validationError || error;
  const showNotice = !firebaseAuthConfigured || Boolean(displayError);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.colors.paper }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.headingSection}>
          <Text style={styles.badgeText}>FITZY ACCOUNT • FIREBASE</Text>
          <Text style={styles.mainTitle}>{isRegister ? 'Tạo tài khoản mới.' : 'Mừng bạn trở lại.'}</Text>
          <Text style={styles.subTitle}>
            {isRegister
              ? 'Tạo tài khoản để tiếp tục mua sắm và theo dõi đơn hàng thời trang của bạn.'
              : 'Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng thời trang của bạn.'}
          </Text>
        </View>


        {isRegister ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Họ tên</Text>
            <View style={styles.inputContainer}>
              <Image source={{ uri: ICONS.user }} style={styles.fieldIcon} resizeMode="contain" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Họ và tên"
                placeholderTextColor="#aaa69f"
                autoCapitalize="words"
                style={styles.input}
              />
            </View>
          </View>
        ) : null}


        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <Image source={{ uri: ICONS.mail }} style={styles.fieldIcon} resizeMode="contain" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="ban@email.com"
              placeholderTextColor="#aaa69f"
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Mật khẩu</Text>
          <View style={styles.inputContainer}>
            <Image source={{ uri: ICONS.lock }} style={styles.fieldIcon} resizeMode="contain" />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
              placeholder="Ít nhất 6 ký tự"
              placeholderTextColor="#aaa69f"
              style={styles.input}
            />
        -
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onPress={() => setPasswordVisible(prev => !prev)}
              hitSlop={12}
              style={styles.eyeButton}
            >
              <Image
                source={{ uri: passwordVisible ? ICONS.eye : ICONS.eyeOff }}
                style={styles.eyeIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>


          {!isRegister ? (
            <Pressable
              accessibilityRole="button"
              onPress={handleForgotPassword}
              hitSlop={8}
              style={styles.forgotPasswordPressable}
            >
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </Pressable>
          ) : null}
        </View>


        {isRegister ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
            <View style={styles.inputContainer}>
              <Image source={{ uri: ICONS.lock }} style={styles.fieldIcon} resizeMode="contain" />
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#aaa69f"
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                onPress={() => setPasswordVisible(prev => !prev)}
                hitSlop={12}
                style={styles.eyeButton}
              >
                <Image
                  source={{ uri: passwordVisible ? ICONS.eye : ICONS.eyeOff }}
                  style={styles.eyeIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>
        ) : null}


        {showNotice ? (
          <View style={styles.alertBox}>
            <View style={styles.alertIconBadge}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            <View style={styles.alertTextWrapper}>
              {!firebaseAuthConfigured && !displayError ? (
                <Text style={styles.alertText}>
                  Chưa cấu hình Firebase Authentication. Hãy điền các biến{' '}
                  <Text style={styles.alertCode}>EXPO_PUBLIC_FIREBASE_*</Text>{' '}
                  theo{' '}
                  <Text style={styles.alertCode}>docs/FIREBASE_AUTH.md</Text>.
                </Text>
              ) : (
                <Text style={styles.alertText}>{displayError}</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Primary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={submit}
          disabled={busy}
          style={[styles.primaryButton, busy && { opacity: 0.65 }]}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{isRegister ? 'Đăng ký' : 'Đăng nhập'}</Text>
          )}
        </Pressable>

        {/* Secondary Action Button */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMode(isRegister ? 'login' : 'register');
            setValidationError('');
            dispatch(clearAuthError());
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {isRegister ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
            <Text style={styles.secondaryButtonHighlight}>
              {isRegister ? 'Đăng nhập' : 'Đăng ký'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headingSection: {
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 22,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.ink,
    marginBottom: 8,
  },
  inputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  fieldIcon: {
    width: 20,
    height: 20,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.ink,
    paddingVertical: 0,
  },
  eyeButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 22,
    height: 22,
  },
  forgotPasswordPressable: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  alertBox: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    marginTop: 2,
  },
  alertIconBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#e02424',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  alertIconText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
  alertTextWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  alertText: {
    fontSize: 13,
    color: '#be123c',
    lineHeight: 18,
  },
  alertCode: {
    textDecorationLine: 'underline',
    fontWeight: '600',
    color: '#be123c',
  },
  primaryButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: theme.colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: theme.colors.ink,
  },
  secondaryButtonHighlight: {
    fontWeight: '700',
    textDecorationLine: 'underline',
    color: theme.colors.ink,
  },
});
