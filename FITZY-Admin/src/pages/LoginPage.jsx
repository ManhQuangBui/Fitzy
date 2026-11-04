import React, { useState } from 'react';
import api from '../services/api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });
      const { token } = response.data.data;
      sessionStorage.setItem('fitzy.admin.token', token);
      const me = await api.get('/users/me');
      if (me.data.data.user.role !== 'admin') {
        sessionStorage.removeItem('fitzy.admin.token');
        throw new Error('Tài khoản này không có quyền quản trị. Vui lòng đăng nhập bằng tài khoản Admin.');
      }
      sessionStorage.setItem('fitzy.admin.user', JSON.stringify(me.data.data.user));
      onLogin(me.data.data.user);
    } catch (err) {
      if (err.message?.includes('Network Error') || err.message?.includes('ERR_CONNECTION_REFUSED')) {
        setError('Không thể kết nối đến Backend API (http://localhost:4000). Vui lòng đảm bảo server API đã được khởi động qua lệnh "npm run dev".');
      } else {
        setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setBusy(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@fitzy.local');
    setPassword('Admin@Fitzy2026!');
    setError('');
  };

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">F</span>
          <div>
            <b>FITZY</b>
            <small>STORE ADMIN</small>
          </div>
        </div>

        <span className="eyebrow">CỔNG QUẢN TRỊ VIÊN</span>
        <h1>Chào mừng trở lại.</h1>
        <p>Đăng nhập bằng tài khoản quản trị FITZY để truy cập bảng điều khiển.</p>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Email quản trị viên</span>
            <input
              className="input"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="username"
              type="email"
              placeholder="admin@fitzy.local"
            />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                className="input"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu quản trị"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                style={{
                  position: 'absolute',
                  right: 10,
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  fontSize: 14,
                  color: '#85857e',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error ? <div className="inline-error">{error}</div> : null}

          <button className="button primary login-submit" disabled={busy}>
            {busy ? 'Đang xác thực thông tin…' : 'Đăng nhập trang quản trị'}
          </button>
        </form>

        <div style={{
          marginTop: 6,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#f4f1e9',
          border: '1px solid #e5dfd2',
          display: 'flex',
          flexDirection: 'column',
          gap: 7
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3a3b37' }}>
              🔑 Tài khoản Admin mẫu (Seed):
            </span>
            <button
              type="button"
              onClick={fillDemoAdmin}
              style={{
                background: '#222320',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Điền nhanh
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#686762', lineHeight: 1.5 }}>
            <div>Email: <b style={{ color: '#222' }}>admin@fitzy.local</b></div>
            <div>Mật khẩu: <b style={{ color: '#222' }}>Admin@Fitzy2026!</b></div>
          </div>
        </div>

        <div className="login-foot">
          Hệ thống quản trị bán hàng thời trang FITZY. Dữ liệu demo được tạo sẵn để trải nghiệm đầy đủ các tính năng quản lý.
        </div>
      </section>

      <div className="login-side">
        <div>
          <span className="eyebrow">FITZY · FASHION COMMERCE</span>
          <h2>Phong cách bắt đầu<br />từ những điều vừa vặn.</h2>
          <p>Không gian quản lý toàn diện: Đơn hàng, sản phẩm, doanh thu, đánh giá và khuyến mãi.</p>
        </div>
        <span className="login-side-index">FITZY STORE ADMIN · v1.0</span>
      </div>
    </main>
  );
}

