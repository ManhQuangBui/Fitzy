import React, { useMemo, useState } from 'react';
import api from '../services/api';
import useResource from '../hooks/useResource';
import { date, money, title } from '../utils/format';
import DataTable, { Status } from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function CustomerDetail({ id, onClose }) {
    const [state, setState] = useState({ data: null, loading: true, error: '' });
    React.useEffect(() => {
        let live = true;
        api.get(`/users/${id}`)
            .then(response => live && setState({ data: response.data.data, loading: false, error: '' }))
            .catch(error => live && setState({ data: null, loading: false, error: error.message }));
        return () => { live = false; };
    }, [id]);
    if (state.loading) return <Modal title="Hồ sơ khách hàng" onClose={onClose}><div className="table-state"><span className="spinner" />Đang tải hồ sơ…</div></Modal>;
    if (state.error) return <Modal title="Hồ sơ khách hàng" onClose={onClose}><div className="inline-error">{state.error}</div></Modal>;
    const { user, orderCount, spent, recentOrders = [], activeOrders = [] } = state.data;
    return (
        <Modal title="Hồ sơ khách hàng" onClose={onClose}>
            {user.isBlocked && (
                <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                    <b>⚠️ Tài khoản đang bị khóa:</b> {user.blockReason || 'Vi phạm chính sách cửa hàng'}
                </div>
            )}
            <div className="detail-grid">
                <div><small>Khách hàng</small><b>{user.name}</b></div>
                <div><small>Email</small><b>{user.email}</b></div>
                <div><small>Điện thoại</small><b>{user.phone || '—'}</b></div>
                <div><small>Tham gia</small><b>{date(user.createdAt)}</b></div>
                <div><small>Đơn hàng</small><b>{orderCount}</b></div>
                <div><small>Giá trị đơn không hủy</small><b>{money(spent)}</b></div>
                <div><small>Đơn đang xử lý</small><b style={{ color: activeOrders?.length ? '#d97706' : '#059669' }}>{activeOrders?.length || 0} đơn</b></div>
            </div>
            <div className="address-card" style={{ marginTop: '14px' }}>
                <b>Địa chỉ đã lưu</b>
                {user.addresses?.length ? (
                    user.addresses.map(address => (
                        <span key={address._id}>
              {address.recipient} · {address.phone} · {[address.line1, address.ward, address.district, address.city].filter(Boolean).join(', ')}
            </span>
                    ))
                ) : (
                    <span>Khách chưa lưu địa chỉ.</span>
                )}
            </div>
            <div className="address-card" style={{ marginTop: '14px' }}>
                <b>Đơn hàng gần đây (tối đa 3 đơn)</b>
                {recentOrders.length > 0 ? (
                    <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e9e6de', borderRadius: '8px', background: '#fff' }}>
                        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                            <tr style={{ background: '#f4f2ec', borderBottom: '1px solid #e9e6de' }}>
                                <th style={{ padding: '6px 8px' }}>Mã đơn</th>
                                <th style={{ padding: '6px 8px' }}>Ngày đặt</th>
                                <th style={{ padding: '6px 8px' }}>Tổng tiền</th>
                                <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentOrders.map(order => (
                                <tr key={order._id} style={{ borderBottom: '1px solid #f0eee9' }}>
                                    <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{order.orderNumber}</td>
                                    <td style={{ padding: '6px 8px' }}>{date(order.createdAt)}</td>
                                    <td style={{ padding: '6px 8px' }}>{money(order.total)}</td>
                                    <td style={{ padding: '6px 8px' }}><Status value={order.status} /></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <span>Khách hàng chưa có đơn hàng nào.</span>
                )}
            </div>
        </Modal>
    );
}
export default function CustomersPage() {
    const [page, setPage] = useState(1);


    const [q, setQ] = useState('');
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [to, setTo] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [viewId, setViewId] = useState('');
    const [target, setTarget] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [targetActiveOrders, setTargetActiveOrders] = useState([]);
    const [checkingTargetOrders, setCheckingTargetOrders] = useState(false);
    const [modalError, setModalError] = useState('');

    React.useEffect(() => {
        if (target && !target.isBlocked) {
            setCheckingTargetOrders(true);
            setModalError('');
            api.get(`/users/${target._id}`)
                .then(res => setTargetActiveOrders(res.data.data.activeOrders || []))
                .catch(() => setTargetActiveOrders([]))
                .finally(() => setCheckingTargetOrders(false));
        } else {
            setTargetActiveOrders([]);
            setModalError('');
        }
    }, [target]);

    const params = useMemo(() => ({
        page,
        limit: 15,
        q: activeFilters.q || undefined,
        status: activeFilters.status || undefined,
        from: activeFilters.from || undefined,
        to: activeFilters.to || undefined
    }), [page, activeFilters]);
    // Thêm chữ "summary" vào đây:
    const { items, pagination, summary, loading, error, refresh } = useResource('/users', params);

    const handleFilter = (e) => {
        e.preventDefault();
        const queryTrim = q.trim();

        if (!queryTrim && !status && !from && !to) {
            setNotice('⚠️ Vui lòng nhập từ khóa hoặc chọn ít nhất 1 điều kiện để lọc!');
            return;
        }

        if (from && !to) {
            setNotice('⚠️ Vui lòng chọn "Đến ngày" khi đã chọn "Từ ngày"!');
            return;
        }

        if (from && to && new Date(from) > new Date(to)) {
            setNotice('⚠️ "Từ ngày" không được lớn hơn "Đến ngày"!');
            return;
        }
        setNotice('');
        setPage(1);
        setActiveFilters({
            q: queryTrim,
            status,
            from,
            to
        });
    };

    const resetFilters = () => {
        setQ('');
        setStatus('');
        setFrom('');
        setTo('');
        setActiveFilters({});
        setNotice('');
        setPage(1);
    };

    const toggle = async () => {
        setBusy(true);
        setModalError('');
        try {
            const willBlock = !target.isBlocked;
            await api.patch(`/users/${target._id}/block`, {
                isBlocked: willBlock,
                blockReason: willBlock ? (blockReason.trim() || 'Vi phạm chính sách') : ''
            });
            setNotice(willBlock ? `Đã khóa tài khoản ${target.name}.` : `Đã mở khóa tài khoản ${target.name}.`);
            setTarget(null);
            setBlockReason('');
            refresh();
        } catch (err) {
            setModalError(err.message);
            setNotice(`⚠️ ${err.message}`);
        } finally {
            setBusy(false);
        }
    };
    const hasFilterActive = Object.keys(activeFilters).length > 0;
    return (
        <div className="page-stack">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">TÀI KHOẢN MUA SẮM</span>
                    <h1>{title('customers')}</h1>
                    <p>Tra cứu hồ sơ, lịch sử mua hàng và trạng thái tài khoản.</p>

                </div>
            </div>
            <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                <article className="metric-card">
                    <div className="metric-top">
                        <span>Tổng khách hàng</span>
                        <span className="metric-icon">♙</span>
                    </div>
                    <strong>{summary?.total ?? (pagination?.total || 0)}</strong>
                    <small>Tài khoản khách hàng</small>
                </article>
                <article className="metric-card">
                    <div className="metric-top">
                        <span>Đang hoạt động</span>
                        <span className="metric-icon" style={{ color: '#376d55' }}>✓</span>
                    </div>
                    <strong style={{ color: '#376d55' }}>{summary?.active ?? 0}</strong>
                    <small>Có thể đăng nhập & mua hàng</small>
                </article>
                <article className="metric-card">
                    <div className="metric-top">
                        <span>Đã bị khóa</span>
                        <span className="metric-icon" style={{ color: '#a84943' }}>✕</span>
                    </div>
                    <strong style={{ color: '#a84943' }}>{summary?.blocked ?? 0}</strong>
                    <small>Bị chặn quyền truy cập</small>
                </article>
            </div>
            {notice ? (
                <div className="notice-bar">
                    {notice}
                    <button onClick={() => setNotice('')}>×</button>
                </div>
            ) : null}
            <section className="panel data-panel">
                <form className="table-toolbar" onSubmit={handleFilter} style={{ flexWrap: 'wrap', gap: '8px' }}>

                    <div className="search-form" style={{ minWidth: '220px' }}>
                        <span>⌕</span>
                        <input
                            value={q}
                            onChange={event => setQ(event.target.value)}
                            placeholder="Tên, email hoặc SĐT..."
                        />
                    </div>

                    <select
                        className="select-control"
                        value={status}
                        onChange={e => setStatus(e.target.value)}
                    >
                        <option value="">-- Trạng thái --</option>
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="blocked">Đã bị khóa</option>
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#666' }}>Từ:</span>
                        <input
                            type="date"
                            className="input"
                            style={{ padding: '6px 8px', fontSize: '13px' }}
                            value={from}
                            onChange={e => setFrom(e.target.value)}
                        />
                    </div>
                    {/* Đến ngày */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', color: '#666' }}>Đến:</span>
                        <input
                            type="date"
                            className="input"
                            style={{ padding: '6px 8px', fontSize: '13px' }}
                            value={to}
                            min={from || undefined}
                            onChange={e => setTo(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="button secondary">
                        Lọc
                    </button>

                    {hasFilterActive && (
                        <button type="button" className="button secondary" onClick={resetFilters}>
                            Xóa lọc
                        </button>
                    )}
                    <span className="toolbar-meta" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
            {pagination ? `${pagination.total} khách hàng` : 'KHÁCH HÀNG FITZY'}
          </span>
                </form>

                <DataTable
                    columns={[
                        { key: 'name', label: 'Khách hàng' },
                        { key: 'email', label: 'Email' },
                        { key: 'phone', label: 'Điện thoại' },
                        { key: 'createdAt', label: 'Ngày tham gia', type: 'date' },
                        {
                            key: 'isBlocked',
                            label: 'Trạng thái',
                            render: row => <Status value={row.isBlocked ? 'blocked' : 'active'} />
                        }
                    ]}
                    rows={items}
                    loading={loading}
                    error={error}
                    onRetry={refresh}
                    renderActions={row => (
                        <>
                            <button className="table-action" onClick={() => setViewId(row._id)}>Hồ sơ</button>
                            <button
                                className={`table-action ${row.isBlocked ? '' : 'danger-text'}`}
                                onClick={() => setTarget(row)}
                            >
                                {row.isBlocked ? 'Mở khóa' : 'Khóa'}
                            </button>
                        </>
                    )}
                />
                {pagination?.pages > 1 ? (
                    <div className="pagination">
                        <span>Trang {page} / {pagination.pages}</span>
                        <div>
                            <button className="button secondary small-button" disabled={page <= 1} onClick={() => setPage(v => v - 1)}>
                                Trước
                            </button>
                            <button className="button secondary small-button" disabled={page >= pagination.pages} onClick={() => setPage(v => v + 1)}>
                                Sau
                            </button>
                        </div>
                    </div>
                ) : null}
            </section>
            {viewId ? <CustomerDetail id={viewId} onClose={() => setViewId('')} /> : null}
            {target ? (
                <Modal
                    title={target.isBlocked ? 'Mở khóa khách hàng?' : 'Khóa tài khoản khách hàng'}
                    onClose={() => { setTarget(null); setBlockReason(''); setModalError(''); setTargetActiveOrders([]); }}
                >
                    <p className="dialog-copy" style={{ marginBottom: '12px' }}>
                        {target.isBlocked
                            ? `Khách hàng ${target.name} sẽ có thể đăng nhập và tiếp tục đặt hàng bình thường.`
                            : `Khách hàng ${target.name} sẽ bị chặn đăng nhập và không thể tạo đơn mới.`}
                    </p>

                    {modalError ? (
                        <div style={{ background: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px' }}>
                            <b>⚠️ Lỗi:</b> {modalError}
                        </div>
                    ) : null}

                    {checkingTargetOrders ? (
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                            <span className="spinner" style={{ marginRight: '6px' }} />Đang kiểm tra trạng thái đơn hàng của khách…
                        </div>
                    ) : null}

                    {!target.isBlocked && targetActiveOrders.length > 0 ? (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px', lineHeight: '18px' }}>
                            <b>⚠️ Không thể khóa tài khoản:</b> Khách hàng đang có <b>{targetActiveOrders.length} đơn hàng chưa hoàn tất</b>:
                            <div style={{ marginTop: '4px', fontWeight: 600 }}>
                                {targetActiveOrders.map(o => `${o.orderNumber} (${o.status})`).join(', ')}
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#b45309' }}>
                                Theo quy định an toàn vận hành, bạn cần hoàn tất hoặc hủy các đơn hàng này trước khi khóa tài khoản.
                            </div>
                        </div>
                    ) : null}

                    {!target.isBlocked && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px' }}>
                                Lý do khóa tài khoản:
                            </label>
                            <input
                                className="input"
                                style={{ width: '100%', fontSize: '12px', padding: '8px 10px' }}
                                placeholder="VD: Boom hàng nhiều lần, spam đơn ảo..."
                                value={blockReason}
                                onChange={e => setBlockReason(e.target.value)}
                                disabled={targetActiveOrders.length > 0}
                            />
                        </div>
                    )}
                    <div className="form-actions">
                        <button className="button secondary" onClick={() => { setTarget(null); setBlockReason(''); setModalError(''); setTargetActiveOrders([]); }}>
                            Hủy
                        </button>
                        <button
                            className={`button ${target.isBlocked ? 'primary' : 'danger'}`}
                            disabled={busy || checkingTargetOrders || (!target.isBlocked && targetActiveOrders.length > 0)}
                            onClick={toggle}
                        >
                            {busy ? 'Đang xử lý…' : target.isBlocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
                        </button>
                    </div>
                </Modal>
            ) : null}
        </div>
    );
}
