import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
export const firebaseAuthConfigured = requiredConfig.every(key => typeof firebaseConfig[key] === 'string' && firebaseConfig[key].trim());
export const firebaseAuthConfigError = 'Chưa cấu hình Firebase Authentication. Hãy điền các biến EXPO_PUBLIC_FIREBASE_* theo docs/FIREBASE_AUTH.md.';
export let firebaseAuthInitializationError = null;

function utf8Chunks(value, limit = 1500) {
  const chunks = [];
  let chunk = '';
  let size = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const bytes = codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (size + bytes > limit && chunk) { chunks.push(chunk); chunk = ''; size = 0; }
    chunk += character;
    size += bytes;
  }
  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks;
}

function secureStoreKeySegment(key) {
  return Array.from(String(key), character => character.codePointAt(0).toString(16)).join('-') || 'empty';
}

const secureAuthStorage = {
  async getItem(key) {
    const prefix = `fitzy.firebase.${secureStoreKeySegment(key)}`;
    const manifestKey = `${prefix}.manifest`;
    const manifestValue = await SecureStore.getItemAsync(manifestKey);
    if (!manifestValue) return null;
    let manifest;
    try { manifest = JSON.parse(manifestValue); } catch { return null; }
    if (!manifest.generation || !Number.isInteger(manifest.count) || manifest.count < 1 || manifest.count > 100) return null;
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, index) => SecureStore.getItemAsync(`${prefix}.${manifest.generation}.${index}`)));
    if (chunks.some(chunk => chunk === null)) return null;
    return chunks.join('');
  },
  async setItem(key, value) {
    const prefix = `fitzy.firebase.${secureStoreKeySegment(key)}`;
    const manifestKey = `${prefix}.manifest`;
    const oldValue = await SecureStore.getItemAsync(manifestKey);
    let oldManifest;
    try { oldManifest = oldValue ? JSON.parse(oldValue) : null; } catch { oldManifest = null; }
    const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const chunks = utf8Chunks(String(value));
    try {
      for (let index = 0; index < chunks.length; index += 1) await SecureStore.setItemAsync(`${prefix}.${generation}.${index}`, chunks[index]);
      await SecureStore.setItemAsync(manifestKey, JSON.stringify({ generation, count: chunks.length }));
    } catch (error) {
      await Promise.all(chunks.map((_, index) => SecureStore.deleteItemAsync(`${prefix}.${generation}.${index}`).catch(() => {})));
      throw error;
    }
    if (oldManifest?.generation && Number.isInteger(oldManifest.count)) {
      await Promise.all(Array.from({ length: Math.min(oldManifest.count, 100) }, (_, index) => SecureStore.deleteItemAsync(`${prefix}.${oldManifest.generation}.${index}`).catch(() => {})));
    }
  },
  async removeItem(key) {
    const prefix = `fitzy.firebase.${secureStoreKeySegment(key)}`;
    const manifestKey = `${prefix}.manifest`;
    const value = await SecureStore.getItemAsync(manifestKey);
    let manifest;
    try { manifest = value ? JSON.parse(value) : null; } catch { manifest = null; }
    await SecureStore.deleteItemAsync(manifestKey);
    if (manifest?.generation && Number.isInteger(manifest.count)) {
      await Promise.all(Array.from({ length: Math.min(manifest.count, 100) }, (_, index) => SecureStore.deleteItemAsync(`${prefix}.${manifest.generation}.${index}`).catch(() => {})));
    }
  }
};

let firebaseAuth = null;
if (firebaseAuthConfigured) {
  try {
    const app = getApps().find(existing => existing.name === '[DEFAULT]') || initializeApp(firebaseConfig);
    try { firebaseAuth = initializeAuth(app, { persistence: getReactNativePersistence(secureAuthStorage) }); }
    catch (error) {
      if (error.code !== 'auth/already-initialized') throw error;
      firebaseAuth = getAuth(app);
    }
  } catch {
    firebaseAuth = null;
    firebaseAuthInitializationError = 'Firebase Authentication chưa khởi tạo được. Kiểm tra cấu hình Firebase và khởi động lại ứng dụng.';
  }
}

export { firebaseAuth };
