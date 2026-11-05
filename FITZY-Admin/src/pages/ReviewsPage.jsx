import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import useResource from '../hooks/useResource';
import { title } from '../utils/format';
import DataTable from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [rating, setRating] = useState('');
  const [product, setProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [activeFilters, setActiveFilters] = useState({});
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');

  const params = useMemo(() => ({
    page,
    limit: 15,
    q: activeFilters.q || undefined,
    status: activeFilters.status || undefined,
    rating: activeFilters.rating || undefined,
    product: activeFilters.product || undefined
  }), [page, activeFilters]);

  const { items, pagination, summary, loading, error, refresh } = useResource('/reviews/admin/list', params);

  useEffect(() => {
    api.get('/admin/products', { params: { limit: 100 } })
      .then(response => setProducts(response.data.data.items || []))
      .catch(() => {});
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveFilters({
      q: q.trim(),
      status,
      rating,
      product
    });
  };

  const resetFilters = () => {
    setQ('');
    setStatus('');
    setRating('');
    setProduct('');
    setActiveFilters({});
    setPage(1);
  };

  const toggle = async () => {
    setBusy(true);
    try {
      const nextStatus = target.status === 'visible' ? 'hidden' : 'visible';
      await api.patch(`/reviews/${target._id}/moderate`, { status: nextStatus });
      setNotice(`Đánh giá đã được ${nextStatus === 'visible' ? 'hiển thị công khai' : 'ẩn'}.`);
      setTarget(null);
      refresh();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openReplyModal = (review) => {
    setReplyTarget(review);
    setReplyText(review.adminReply || '');
    setReplyError('');
  };

  const handleSaveReply = async (customText) => {
    setReplyBusy(true);
    setReplyError('');
    try {
      const text = customText !== undefined ? customText : replyText;
      await api.patch(`/reviews/${replyTarget._id}/reply`, { reply: text.trim() });
      setNotice(text.trim() ? 'Đã lưu phản hồi thành công.' : 'Đã xóa phản hồi thành công.');
      setReplyTarget(null);
      refresh();
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setReplyBusy(false);
    }
  };

  const selectedProductName = useMemo(() => {
    const selectedId = activeFilters.product || product;
    if (!selectedId) return '';
    return products.find(p => p._id === selectedId)?.name || '';
  }, [activeFilters.product, product, products]);

  const hasActiveFilters = Boolean(activeFilters.q || activeFilters.status || activeFilters.rating || activeFilters.product);

  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <span className="eyebrow">PHẢN HỒI & ĐÁNH GIÁ</span>
          <h1>{title('reviews')}</h1>
          <p>Quản lý và kiểm duyệt đánh giá sản phẩm từ các đơn hàng hoàn tất.</p>
        </div>
      </div>

      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <article className="metric-card">
          <div className="metric-top">
            <span>Điểm trung bình</span>
            <span className="metric-icon" style={{ color: '#d97706' }}>★</span>
          </div>
          <strong>{summary?.avgRating ? `${summary.avgRating} / 5` : '—'}</strong>
          <small>{selectedProductName ? `Sản phẩm: ${selectedProductName}` : 'Toàn bộ cửa hàng'}</small>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Tổng đánh giá</span>
            <span className="metric-icon">✎</span>
          </div>
          <strong>{summary?.total ?? 0}</strong>
          <small>{selectedProductName ? 'Đánh giá của sản phẩm này' : 'Tất cả sản phẩm'}</small>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Đang hiển thị</span>
            <span className="metric-icon" style={{ color: '#059669' }}>✓</span>
          </div>
          <strong style={{ color: '#059669' }}>{summary?.visibleCount ?? 0}</strong>
          <small>Khách hàng có thể xem</small>
        </article>

        <article className="metric-card">
          <div className="metric-top">
            <span>Đã ẩn</span>
            <span className="metric-icon" style={{ color: '#dc2626' }}>✕</span>
          </div>
          <strong style={{ color: '#dc2626' }}>{summary?.hiddenCount ?? 0}</strong>
          <small>Đã bị quản trị viên ẩn</small>
        </article>
      </div>

      {notice && (
        <div className="notice-bar">
          {notice}
          <button onClick={() => setNotice('')}>×</button>
        </div>
      )}

      <section className="panel data-panel">
        <form className="table-toolbar" onSubmit={handleFilter} style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            className="input"
            style={{ minWidth: '220px', padding: '7px 12px', fontSize: '13px' }}
            placeholder="Tìm bình luận, từ khóa, khách..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />

          <select
            className="select-control"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="visible">Đang hiển thị</option>
            <option value="hidden">Đã ẩn</option>
          </select>

          <select
            className="select-control"
            value={rating}
            onChange={e => setRating(e.target.value)}
          >
            <option value="">Tất cả số sao</option>
            {[5, 4, 3, 2, 1].map(v => (
              <option key={v} value={v}>{v} sao</option>
            ))}
          </select>

          <select
            className="select-control"
            value={product}
            onChange={e => setProduct(e.target.value)}
            style={{ maxWidth: '240px' }}
          >
            <option value="">Tất cả sản phẩm</option>
            {products.map(item => (
              <option key={item._id} value={item._id}>{item.name}</option>
            ))}
          </select>

          <button type="submit" className="button primary small-button" style={{ padding: '7px 16px' }}>
            Tìm kiếm
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="button secondary small-button"
              onClick={resetFilters}
              style={{ padding: '7px 14px' }}
            >
              Đặt lại
            </button>
          )}

          <span className="toolbar-meta" style={{ marginLeft: 'auto' }}>
            {pagination ? `${pagination.total} đánh giá` : 'ĐÁNH GIÁ KHÁCH HÀNG'}
          </span>
        </form>

        <DataTable
          columns={[
            {
              key: 'product',
              label: 'Sản phẩm',
              render: row => <b>{row.product?.name || '—'}</b>
            },
            {
              key: 'user',
              label: 'Khách hàng',
              render: row => (
                <div>
                  <strong>{row.user?.name || 'Khách hàng'}</strong>
                  {row.user?.email && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{row.user.email}</div>
                  )}
                </div>
              )
            },
            {
              key: 'rating',
              label: 'Số sao',
              render: row => (
                <span>
                  <span style={{ color: '#d97706', fontSize: '14px' }}>{'★'.repeat(row.rating)}</span>
                  <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{'★'.repeat(5 - row.rating)}</span>
                  <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '4px' }}>({row.rating}/5)</span>
                </span>
              )
            },
            {
              key: 'comment',
              label: 'Bình luận',
              render: row => (
                <div style={{ maxWidth: '340px' }}>
                  <div style={{ wordBreak: 'break-word' }}>{row.comment || <em style={{ color: '#94a3b8' }}>Không có nhận xét</em>}</div>
                  {row.adminReply ? (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 10px',
                      background: '#f8fafc',
                      borderLeft: '3px solid #0f172a',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#334155',
                      wordBreak: 'break-word'
                    }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>↳ FITZY phản hồi:</strong>
                      <span>{row.adminReply}</span>
                    </div>
                  ) : null}
                </div>
              )
            },
            { key: 'status', label: 'Trạng thái', type: 'status' },
            { key: 'createdAt', label: 'Ngày gửi', type: 'date' }
          ]}
          rows={items}
          loading={loading}
          error={error}
          onRetry={refresh}
          renderActions={row => (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                className="table-action"
                onClick={() => openReplyModal(row)}
                style={{ color: '#0284c7', fontWeight: 600 }}
              >
                {row.adminReply ? 'Sửa phản hồi' : 'Phản hồi'}
              </button>
              <button
                className="table-action"
                onClick={() => setTarget(row)}
              >
                {row.status === 'visible' ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          )}
        />

        {pagination?.pages > 1 && (
          <div className="pagination">
            <span>Trang {page} / {pagination.pages}</span>
            <div>
              <button
                className="button secondary small-button"
                disabled={page <= 1}
                onClick={() => setPage(value => value - 1)}
              >
                Trước
              </button>
              <button
                className="button secondary small-button"
                disabled={page >= pagination.pages}
                onClick={() => setPage(value => value + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>

      {target && (
        <ConfirmDialog
          title={target.status === 'visible' ? 'Ẩn đánh giá?' : 'Hiển thị đánh giá?'}
          message={`Bình luận của ${target.user?.name || 'khách hàng'} sẽ ${
            target.status === 'visible' ? 'không còn hiển thị công khai' : 'được hiển thị công khai'
          }.`}
          onCancel={() => setTarget(null)}
          onConfirm={toggle}
          busy={busy}
        />
      )}

      {replyTarget && (
        <Modal
          title={replyTarget.adminReply ? 'Chỉnh sửa phản hồi' : 'Phản hồi đánh giá của khách hàng'}
          onClose={() => { setReplyTarget(null); setReplyText(''); setReplyError(''); }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px'
            }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>Sản phẩm:</strong> {replyTarget.product?.name || '—'}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Khách hàng:</strong> {replyTarget.user?.name || 'Khách hàng'} ({replyTarget.user?.email || '—'})
              </div>
              <div style={{ marginBottom: '6px' }}>
                <strong>Đánh giá:</strong>{' '}
                <span style={{ color: '#d97706' }}>{'★'.repeat(replyTarget.rating)}</span>
                <span style={{ color: '#cbd5e1' }}>{'★'.repeat(5 - replyTarget.rating)}</span>
                {' '}({replyTarget.rating}/5)
              </div>
              <div>
                <strong>Nhận xét của khách:</strong>
                <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: '#475569' }}>
                  "{replyTarget.comment || 'Không có nhận xét'}"
                </p>
              </div>
            </div>

            {replyError && (
              <div style={{
                background: '#fdf2f2',
                border: '1px solid #f8b4b4',
                color: '#9b1c1c',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <b>⚠️ Lỗi:</b> {replyError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Câu trả lời của FITZY Store:
              </label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: '90px', padding: '10px', fontSize: '13px', lineHeight: '1.4' }}
                placeholder="Nhập câu trả lời gửi đến khách hàng..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                maxLength={1200}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                {replyText.length}/1200 ký tự
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="button secondary small-button"
                onClick={() => { setReplyTarget(null); setReplyText(''); setReplyError(''); }}
                disabled={replyBusy}
              >
                Hủy
              </button>
              {replyTarget.adminReply && (
                <button
                  type="button"
                  className="button secondary small-button"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => handleSaveReply('')}
                  disabled={replyBusy}
                >
                  {replyBusy ? 'Đang xử lý...' : 'Xóa phản hồi'}
                </button>
              )}
              <button
                type="button"
                className="button primary small-button"
                onClick={() => handleSaveReply()}
                disabled={replyBusy || !replyText.trim()}
              >
                {replyBusy ? 'Đang lưu...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
