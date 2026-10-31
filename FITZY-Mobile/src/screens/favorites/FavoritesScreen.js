import React, { useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFavorites, removeFavorite } from '../../store/slices/favoriteSlice';
import { ProductCard, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function FavoritesScreen({ navigation }) {
  const dispatch = useDispatch(); const user = useSelector(state => state.auth.user); const { items, status, error } = useSelector(state => state.favorites);
  const load = useCallback(() => { if (user) dispatch(fetchFavorites()); }, [dispatch, user?._id]); useEffect(load, [load]);
  if (!user) return <StateMessage title="Đăng nhập để lưu yêu thích" message="Danh sách yêu thích đồng bộ với tài khoản của bạn." action="Đăng nhập" onAction={() => navigation.navigate('Auth')} />;
  return <FlatList contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: theme.colors.paper }} data={items.filter(entry => entry.product)} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ padding: 18, gap: 10 }} keyExtractor={item => item._id} renderItem={({ item }) => <ProductCard product={item.product} onPress={() => navigation.navigate('Product', { id: item.product._id })} favorite onFavorite={() => dispatch(removeFavorite(item.product._id))} />} ListEmptyComponent={status === 'loading' ? <StateMessage title="Đang tải yêu thích" loading /> : error ? <StateMessage title="Không thể tải danh sách" message={error} action="Thử lại" onAction={load} /> : <StateMessage title="Chưa có món yêu thích" message="Chạm vào biểu tượng trái tim ở sản phẩm để lưu lại." action="Khám phá" onAction={() => navigation.navigate('Catalog')} />} />;
}
