export const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const date = value => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export const title = value => ({ dashboard: 'Tổng quan', products: 'Sản phẩm', categories: 'Danh mục', orders: 'Đơn hàng', customers: 'Khách hàng', reviews: 'Đánh giá', posts: 'Bài viết', promotions: 'Khuyến mãi' }[value] || value);
