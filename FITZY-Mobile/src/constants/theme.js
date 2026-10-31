export const theme = {
  colors: { ink: '#181818', muted: '#777570', paper: '#f4f2ee', white: '#ffffff', line: '#e4e1da', accent: '#a98b63', danger: '#a13d37', success: '#367456', sand: '#e9e1d5' },
  spacing: { xs: 6, sm: 10, md: 16, lg: 24, xl: 34 },
  radius: { sm: 12, md: 18, lg: 26 }
};

export const formatVnd = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
