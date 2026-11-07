export const theme = {
  colors: { ink: '#181818', muted: '#777570', paper: '#f4f2ee', white: '#ffffff', line: '#e4e1da', accent: '#a98b63', danger: '#a13d37', success: '#367456', sand: '#e9e1d5' },
  spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 34 },
  radius: { sm: 12, md: 18, lg: 26 }
};

export const formatVnd = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);

export const resolveImageUrl = url => {
  if (!url) return '';
  const serverHost = (process.env.EXPO_PUBLIC_SERVER_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/?$/, '').replace(/\/+$/, '');
  if (!serverHost) return url;
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, serverHost);
  }
  if (!url.startsWith('http')) {
    return `${serverHost}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};
