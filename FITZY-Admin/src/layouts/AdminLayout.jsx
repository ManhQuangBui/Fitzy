import React from 'react';
import { title } from '../utils/format';

const nav = [
  { section: 'CỬA HÀNG', items: [['dashboard', '◫', 'Tổng quan'], ['orders', '▤', 'Đơn hàng'], ['products', '◈', 'Sản phẩm'], ['categories', '▦', 'Danh mục']] },
  { section: 'NỘI DUNG', items: [['customers', '♙', 'Khách hàng'], ['reviews', '☆', 'Đánh giá'], ['posts', '▧', 'Bài viết'], ['promotions', '%', 'Khuyến mãi']] }
];
export default function AdminLayout({ section, onNavigate, user, onLogout, children }) {
  return <div className="admin-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">F</span><div><b>FITZY</b><small>STORE ADMIN</small></div></div><div className="store-chip"><span className="store-dot" /> Cửa hàng FITZY <span className="chevron">⌄</span></div>{nav.map(group => <div className="nav-group" key={group.section}><small>{group.section}</small>{group.items.map(([key, icon, label]) => <button key={key} className={`nav-item ${section === key ? 'selected' : ''}`} onClick={() => onNavigate(key)}><span className="nav-icon">{icon}</span>{label}{key === 'orders' ? <span className="nav-tail">›</span> : null}</button>)}</div>)}<div className="sidebar-bottom"><div className="avatar">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div><div className="user-mini"><b>{user?.name || 'Quản trị viên'}</b><small>Administrator</small></div><button className="logout-icon" title="Đăng xuất" onClick={onLogout}>↗</button></div></aside><main className="workspace"><header className="topbar"><div className="breadcrumb">Cửa hàng <span>/</span> <b>{title(section)}</b></div><div className="top-actions"><span className="today">FITZY · {new Date().toLocaleDateString('vi-VN')}</span><div className="avatar small">{(user?.name || 'A').slice(0, 1).toUpperCase()}</div></div></header><div className="page-content">{children}</div></main></div>;
}
