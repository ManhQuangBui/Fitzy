import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../services/api';
import { signOut } from '../../store/slices/authSlice';
import { Button, Page, SectionTitle, StateMessage } from '../../components/ui';
import { formatVnd, theme } from '../../constants/theme';

function MetricCard({ label, value, hint }) {
  return <View style={{ flex: 1, minWidth: '45%', padding: 16, gap: 8, borderRadius: 18, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }}>
    <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{label}</Text>
    <Text selectable style={{ color: theme.colors.ink, fontSize: 23, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
    <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{hint}</Text>
  </View>;
}

const ranges = [
  { key: 'day', label: 'Ngày', hint: '30 ngày' },
  { key: 'month', label: 'Tháng', hint: '12 tháng' },
  { key: 'year', label: 'Năm', hint: '5 năm' }
];

export default function AdminDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);
  const [range, setRange] = useState('month');

  useEffect(() => {
    let active = true;
    setState(current => ({ ...current, loading: true, error: null }));
    api.get('/stats', { params: { range } })
      .then(response => { if (active) setState({ data: response.data.data, loading: false, error: null }); })
      .catch(error => { if (active) setState(current => ({ ...current, loading: false, error: error.message })); });
    return () => { active = false; };
  }, [attempt, range]);

  const data = state.data;
  const chart = data?.chart || [];
  const maxRevenue = Math.max(1, ...chart.map(item => Number(item.revenue) || 0));
  const chartItems = range === 'day' ? chart.slice(-10) : chart;

  return <Page contentStyle={{ padding: 18, gap: 18 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>FITZY · CHỦ CỬA HÀNG</Text>
        <Text selectable style={{ color: theme.colors.ink, fontSize: 23, fontWeight: '800' }}>Xin chào, {user?.name || 'Chủ cửa hàng'}</Text>
      </View>
      <Button title="Đăng xuất" variant="light" onPress={() => dispatch(signOut())} style={{ minHeight: 42, paddingHorizontal: 12 }} />
    </View>

    {state.error ? <View style={{ padding: 14, gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#e8cbc7', backgroundColor: '#fff5f3' }}>
      <Text selectable style={{ color: theme.colors.danger, lineHeight: 20 }}>Không tải được số liệu: {state.error}</Text>
      <Button title="Thử tải lại" variant="light" onPress={() => setAttempt(value => value + 1)} />
    </View> : null}

    {state.loading && !data ? <StateMessage title="Đang tải dashboard" loading /> : null}
    {!state.loading && !data && !state.error ? <StateMessage title="Chưa có số liệu" message="Hãy thử tải lại dashboard." action="Thử lại" onAction={() => setAttempt(value => value + 1)} /> : null}

    {data ? <>
      <View style={{ padding: 20, gap: 7, borderRadius: 22, backgroundColor: theme.colors.ink }}>
        <Text style={{ color: '#c9c0b2', fontSize: 12, fontWeight: '600' }}>DOANH THU ĐƠN HOÀN TẤT · {ranges.find(item => item.key === range)?.hint.toUpperCase()}</Text>
        <Text selectable style={{ color: theme.colors.white, fontSize: 29, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{formatVnd(data.revenue)}</Text>
        <Text style={{ color: '#c9c0b2', fontSize: 12 }}>Chỉ tính đơn hoàn tất; đơn đã hủy không được tính.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {ranges.map(item => <Pressable key={item.key} accessibilityRole="button" onPress={() => setRange(item.key)} style={{ flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 13, borderWidth: 1, borderColor: range === item.key ? theme.colors.ink : theme.colors.line, backgroundColor: range === item.key ? theme.colors.ink : theme.colors.white }}>
          <Text style={{ color: range === item.key ? theme.colors.white : theme.colors.ink, fontWeight: '700' }}>{item.label}</Text>
          <Text style={{ color: range === item.key ? '#d2cec4' : theme.colors.muted, fontSize: 10 }}>{item.hint}</Text>
        </Pressable>)}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <MetricCard label="Đơn hàng" value={data.orderCount ?? 0} hint={`Trong ${ranges.find(item => item.key === range)?.hint}`} />
        <MetricCard label="Khách hàng" value={data.customerCount ?? 0} hint="Tài khoản khách mua hàng" />
        <MetricCard label="Sản phẩm" value={data.productCount ?? 0} hint="Đang kinh doanh" />
      </View>

      <View style={{ gap: 13, padding: 17, borderRadius: 18, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }}>
        <SectionTitle title={`Doanh thu theo ${range === 'day' ? 'ngày' : range === 'month' ? 'tháng' : 'năm'}`} />
        {chartItems.length ? chartItems.map(item => <View key={item._id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text selectable style={{ color: theme.colors.muted, fontSize: 11 }}>{item._id}</Text>
            <Text selectable style={{ color: theme.colors.ink, fontSize: 11, fontWeight: '700' }}>{formatVnd(item.revenue)}</Text>
          </View>
          <View style={{ height: 8, borderRadius: 5, backgroundColor: theme.colors.paper, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(3, (Number(item.revenue) / maxRevenue) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: theme.colors.accent }} />
          </View>
        </View>) : <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Chưa có đơn hàng hoàn tất trong khoảng thời gian này.</Text>}
      </View>

      <View style={{ gap: 13, padding: 17, borderRadius: 18, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line }}>
        <SectionTitle title="Sản phẩm bán chạy" />
        {(data.topProducts || []).length ? data.topProducts.slice(0, 5).map((product, index) => <View key={product._id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderTopColor: theme.colors.line }}>
          <Text style={{ width: 25, color: theme.colors.accent, fontWeight: '800' }}>{String(index + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text selectable numberOfLines={1} style={{ color: theme.colors.ink, fontWeight: '700' }}>{product.name}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 11 }}>{product.salesCount || 0} đã bán</Text>
          </View>
          <Text selectable style={{ color: theme.colors.ink, fontSize: 12 }}>{formatVnd(product.price)}</Text>
        </View>) : <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Chưa có sản phẩm để thống kê.</Text>}
      </View>
    </> : null}

    <View style={{ gap: 12 }}>
      <SectionTitle title="Quản lý cửa hàng" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {[
          ['orders', 'Đơn hàng'], ['customers', 'Khách hàng'], ['categories', 'Danh mục'],
          ['products', 'Sản phẩm'], ['reviews', 'Đánh giá'], ['posts', 'Bài viết'], ['promotions', 'Khuyến mãi']
        ].map(([kind, label]) => <Button key={kind} title={label} variant="light" onPress={() => navigation.navigate('AdminResource', { kind })} style={{ flexGrow: 1, minWidth: '44%', minHeight: 46 }} />)}
      </View>
    </View>
    <Button title="Làm mới số liệu" variant="light" onPress={() => setAttempt(value => value + 1)} loading={state.loading && !!data} />
  </Page>;
}
