import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import api from './services/api';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import CollectionPage from './pages/CollectionPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import ReviewsPage from './pages/ReviewsPage';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const location = useLocation();
  const submit = async event => { event.preventDefault(); setBusy(true); setError(''); try { const response = await api.post('/auth/login', { email, password }); const { token } = response.data.data; sessionStorage.setItem('fitzy.admin.token', token); const me = await api.get('/users/me'); if (me.data.data.user.role !== 'admin') { sessionStorage.removeItem('fitzy.admin.token'); throw new Error('Tài khoản này không có quyền quản trị.'); } sessionStorage.setItem('fitzy.admin.user', JSON.stringify(me.data.data.user)); onLogin(me.data.data.user); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  return <main className="login-shell"><section className="login-card"><div className="login-brand"><span className="brand-mark">F</span><div><b>FITZY</b><small>STORE ADMIN</small></div></div><span className="eyebrow">CỔNG QUẢN TRỊ</span><h1>Chào mừng trở lại.</h1><p>Đăng nhập bằng tài khoản quản trị FITZY đã được seed.</p><form className="login-form" onSubmit={submit}><label className="field"><span>Email</span><input className="input" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="username" type="email" placeholder="admin@fitzy.local" /></label><label className="field"><span>Mật khẩu</span><input className="input" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" type="password" placeholder="Mật khẩu quản trị" /></label>{error ? <div className="inline-error">{error}</div> : null}<button className="button primary login-submit" disabled={busy}>{busy ? 'Đang xác thực…' : 'Đăng nhập'}</button></form><div className="login-foot">Tài khoản demo được cấu hình trong FITZY-API/.env khi seed.</div></section><div className="login-side"><div><span className="eyebrow">FITZY · MADE FOR EVERYDAY</span><h2>Phong cách bắt đầu<br />từ những điều vừa vặn.</h2><p>Không gian quản lý cửa hàng FITZY.</p></div><span className="login-side-index">01 / ADMIN</span></div></main>;
}

function Workspace({ user, onLogout }) {
  const location = useLocation(); const navigate = useNavigate(); const section = location.pathname.split('/')[1] || 'dashboard';
  const page = section === 'dashboard' ? <Dashboard /> : section === 'orders' ? <OrdersPage /> : section === 'customers' ? <CustomersPage /> : section === 'reviews' ? <ReviewsPage /> : ['products', 'categories', 'posts', 'promotions'].includes(section) ? <CollectionPage section={section} /> : <Navigate to="/dashboard" replace />;
  return <AdminLayout section={section} user={user} onNavigate={key => navigate(`/${key}`)} onLogout={onLogout}>{page}</AdminLayout>;
}

function RootRoutes() {
  const navigate = useNavigate(); const [user, setUser] = useState(null); const [checking, setChecking] = useState(true);
  useEffect(() => { const token = sessionStorage.getItem('fitzy.admin.token'); if (!token) { setChecking(false); return; } api.get('/users/me').then(response => { const current = response.data.data.user; if (current.role !== 'admin') throw new Error('Administrator access required'); sessionStorage.setItem('fitzy.admin.user', JSON.stringify(current)); setUser(current); }).catch(() => { sessionStorage.removeItem('fitzy.admin.token'); sessionStorage.removeItem('fitzy.admin.user'); }).finally(() => setChecking(false)); }, []);
  const logout = () => { sessionStorage.removeItem('fitzy.admin.token'); sessionStorage.removeItem('fitzy.admin.user'); setUser(null); navigate('/login', { replace: true }); };
  if (checking) return <div className="page-loading"><span className="spinner" />Đang xác thực phiên quản trị…</div>;
  return <Routes><Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={value => { setUser(value); navigate('/dashboard', { replace: true }); }} />} /><Route path="/*" element={user ? <Workspace user={user} onLogout={logout} /> : <Navigate to="/login" replace />} /></Routes>;
}

export default function App() { return <BrowserRouter><RootRoutes /></BrowserRouter>; }
