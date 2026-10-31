import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';
export const tokenStore = {
  get: () => SecureStore.getItemAsync('fitzy.jwt'),
  set: token => SecureStore.setItemAsync('fitzy.jwt', token),
  clear: () => SecureStore.deleteItemAsync('fitzy.jwt')
};

const api = axios.create({ baseURL, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(async config => {
  if (!config.skipAuth) {
    const token = await tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401) await tokenStore.clear();
  const apiError = new Error(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Không thể kết nối máy chủ');
  apiError.code = error.response?.data?.error?.code;
  apiError.status = error.response?.status;
  return Promise.reject(apiError);
});

export default api;
