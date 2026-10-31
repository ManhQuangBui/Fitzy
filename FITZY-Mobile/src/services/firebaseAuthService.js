import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { firebaseAuth, firebaseAuthConfigured, firebaseAuthConfigError, firebaseAuthInitializationError } from '../config/firebase';
import api, { tokenStore } from './api';

let activeAuthOperations = 0;

export function isFirebaseAuthOperationActive() { return activeAuthOperations > 0; }

function requireFirebaseAuth() {
  if (!firebaseAuthConfigured || !firebaseAuth) {
    const error = new Error(firebaseAuthInitializationError || firebaseAuthConfigError);
    error.code = firebaseAuthInitializationError ? 'FIREBASE_CLIENT_INITIALIZATION_FAILED' : 'FIREBASE_CLIENT_NOT_CONFIGURED';
    throw error;
  }
  return firebaseAuth;
}

function withAuthOperation(operation) {
  activeAuthOperations += 1;
  return Promise.resolve().then(operation).finally(() => { activeAuthOperations -= 1; });
}

export function firebaseErrorMessage(error) {
  const code = error?.code || '';
  const apiMessages = {
    EMAIL_VERIFICATION_REQUIRED: 'Firebase đã nhận yêu cầu gửi email xác minh, nhưng chưa xác nhận thư đã tới hộp thư. Kiểm tra mẫu email trong Firebase Console rồi đăng nhập lại sau khi xác minh.',
    FIREBASE_ACCOUNT_CONFLICT: 'Tài khoản Firebase này đang liên kết với hồ sơ FITZY khác. Hãy liên hệ cửa hàng để được hỗ trợ.',
    FIREBASE_NOT_CONFIGURED: 'API chưa được cấu hình Firebase Admin. Hãy cấu hình biến FIREBASE_* trong FITZY-API.',
    FIREBASE_VERIFICATION_UNAVAILABLE: 'API chưa xác minh được Firebase. Hãy kiểm tra cấu hình máy chủ rồi thử lại.',
    FIREBASE_EMAIL_REQUIRED: 'Tài khoản Firebase cần có địa chỉ email để sử dụng FITZY.',
    ACCOUNT_BLOCKED: 'Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng.',
    FIREBASE_TOKEN_INVALID: 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.',
    AUTH_EXPIRED: 'Phiên đăng nhập hết hạn. Hãy đăng nhập lại.',
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không chính xác.',
    EMAIL_IN_USE: 'Email đã được dùng cho tài khoản FITZY khác.',
    RATE_LIMITED: 'Bạn thao tác quá nhiều lần. Hãy đợi một lúc rồi thử lại.'
  };
  if (apiMessages[code]) return apiMessages[code];
  const firebaseMessages = {
    'FIREBASE_CLIENT_NOT_CONFIGURED': firebaseAuthConfigError,
    'FIREBASE_CLIENT_INITIALIZATION_FAILED': firebaseAuthInitializationError || firebaseAuthConfigError,
    'auth/email-already-in-use': 'Email đã có tài khoản Firebase. Hãy chuyển sang Đăng nhập.',
    'auth/invalid-email': 'Email chưa đúng định dạng.',
    'auth/weak-password': 'Mật khẩu cần có ít nhất 6 ký tự.',
    'auth/missing-password': 'Hãy nhập mật khẩu.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không chính xác.',
    'auth/invalid-login-credentials': 'Email hoặc mật khẩu không chính xác.',
    'auth/user-not-found': 'Không tìm thấy tài khoản. Hãy kiểm tra email hoặc đăng ký tài khoản mới.',
    'auth/wrong-password': 'Email hoặc mật khẩu không chính xác.',
    'auth/network-request-failed': 'Không thể kết nối Firebase. Kiểm tra Internet rồi thử lại.',
    'auth/too-many-requests': 'Đã có quá nhiều lần thử. Hãy đợi rồi đăng nhập lại.',
    'auth/quota-exceeded': 'Firebase đã tạm giới hạn gửi email xác minh. Hãy thử lại sau.',
    'auth/operation-not-allowed': 'Firebase chưa bật đăng nhập Email/Password trong Firebase Console.',
    'auth/configuration-not-found': 'Firebase Authentication chưa được bật hoặc cấu hình chưa hoàn tất.',
    'auth/user-disabled': 'Tài khoản Firebase đã bị vô hiệu hóa.'
  };
  if (firebaseMessages[code]) return firebaseMessages[code];
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') return 'Không thể kết nối máy chủ. Kiểm tra Internet rồi thử lại.';
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

async function exchangeOrRequestVerification(firebaseUser, options) {
  try { return await exchangeFirebaseUser(firebaseUser, options); }
  catch (error) {
    if (error.code === 'EMAIL_VERIFICATION_REQUIRED') {
      // Preserve Firebase's send error so the UI does not falsely claim that an
      // email was sent when Firebase rejected the verification request.
      await sendEmailVerification(firebaseUser);
      throw Object.assign(new Error(firebaseErrorMessage(error)), { code: error.code });
    }
    throw error;
  }
}

async function exchangeFirebaseUser(firebaseUser, { name, forceRefresh = false } = {}) {
  await reload(firebaseUser);
  const idToken = await firebaseUser.getIdToken(forceRefresh);
  const response = await api.post('/auth/firebase/exchange', {
    idToken,
    name: String(name || firebaseUser.displayName || '').trim().slice(0, 80)
  }, { skipAuth: true });
  await tokenStore.set(response.data.data.token);
  return response.data.data.user;
}

export function syncFirebaseSession(firebaseUser) {
  return exchangeFirebaseUser(firebaseUser, { forceRefresh: true });
}

export function signInWithFirebase({ email, password }) {
  return withAuthOperation(async () => {
    const auth = requireFirebaseAuth();
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return exchangeOrRequestVerification(credential.user, { forceRefresh: true });
  });
}

export function registerWithFirebase({ name, email, password }) {
  return withAuthOperation(async () => {
    const auth = requireFirebaseAuth();
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const displayName = name.trim();
    if (displayName) await updateFirebaseProfile(credential.user, { displayName });
    return exchangeOrRequestVerification(credential.user, { name: displayName, forceRefresh: true });
  });
}

export function signOutFromFirebase() {
  return withAuthOperation(async () => {
    const auth = requireFirebaseAuth();
    await firebaseSignOut(auth);
    await tokenStore.clear();
  });
}
