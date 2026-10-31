import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api', timeout: 20000, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(config => { const token = sessionStorage.getItem('fitzy.admin.token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(response => response, error => { if (error.response?.status === 401) { sessionStorage.removeItem('fitzy.admin.token'); sessionStorage.removeItem('fitzy.admin.user'); } return Promise.reject(new Error(error.response?.data?.error?.message || error.response?.data?.message || error.message || 'API request failed')); });
export default api;
