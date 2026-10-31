export function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : '—';
}

export function formatPhone(value) {
  return String(value || '').replace(/[^0-9+]/g, '');
}
