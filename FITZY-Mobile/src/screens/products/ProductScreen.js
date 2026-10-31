import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProduct } from '../../store/slices/productSlice';
import { addItem } from '../../store/slices/cartSlice';
import { addFavorite, fetchFavorites, removeFavorite } from '../../store/slices/favoriteSlice';
import { Page, Button, StateMessage, SectionTitle } from '../../components/ui';
import { theme, formatVnd } from '../../constants/theme';

export default function ProductScreen({ route, navigation }) {
  const dispatch = useDispatch(); const result = useSelector(state => state.products.current); const detailStatus = useSelector(state => state.products.detailStatus); const detailError = useSelector(state => state.products.detailError); const user = useSelector(state => state.auth.user); const favorites = useSelector(state => state.favorites.items); const [variantId, setVariantId] = useState(null); const [notice, setNotice] = useState('');
  useEffect(() => { dispatch(fetchProduct(route.params.id)); if (user) dispatch(fetchFavorites()); }, [dispatch, route.params.id, user?._id]);
  const product = result?.product; const variant = useMemo(() => product?.variants.find(entry => entry._id === variantId) || product?.variants.find(entry => entry.isActive && entry.quantity > 0), [product, variantId]);
  if (!product) return <Page><StateMessage title={detailStatus === 'failed' ? 'Không thể tải sản phẩm' : 'Đang tải sản phẩm'} message={detailError} loading={detailStatus !== 'failed'} action={detailStatus === 'failed' ? 'Thử lại' : undefined} onAction={() => dispatch(fetchProduct(route.params.id))} /></Page>;
  const favorite = favorites.some(item => item.product?._id === product._id);
  const selectVariant = entry => { setVariantId(entry._id); setNotice(''); };
  const addToBag = () => {
    if (!variant || variant.quantity < 1) return setNotice('Biến thể này đã hết hàng.');
    dispatch(addItem({ productId: product._id, variantId: variant._id, name: product.name, price: product.price, size: variant.size, color: variant.color, image: variant.images?.[0] || product.images?.[0], key: `${product._id}:${variant._id}` })); setNotice('Đã thêm vào túi đồ.');
  };
  const toggleFavorite = () => { if (!user) return navigation.navigate('Auth'); dispatch(favorite ? removeFavorite(product._id) : addFavorite(product._id)); };
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20 }}>
    <View style={{ height: 390, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.colors.sand }}>{product.images?.[0] ? <Image source={{ uri: product.images[0] }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <StateMessage title="FITZY · DEMO" />}</View>
    <View style={{ gap: 8 }}><Text style={{ color: theme.colors.muted, letterSpacing: 1 }}>{product.category?.name || 'FITZY COLLECTION'}</Text><Text style={{ color: theme.colors.ink, fontSize: 26, fontWeight: '800' }}>{product.name}</Text><Text style={{ color: theme.colors.accent, fontSize: 18, fontWeight: '700' }}>{formatVnd(product.price)}</Text></View>
    <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>{product.description}</Text>
    <View style={{ gap: 10 }}><SectionTitle title="Chọn size và màu" /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{product.variants.map(item => <Pressable key={item._id} disabled={!item.isActive || item.quantity < 1} onPress={() => selectVariant(item)} style={{ paddingHorizontal: 15, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: variant?._id === item._id ? theme.colors.ink : theme.colors.line, backgroundColor: variant?._id === item._id ? theme.colors.ink : '#fff', opacity: item.quantity < 1 ? 0.42 : 1 }}><Text style={{ color: variant?._id === item._id ? '#fff' : theme.colors.ink }}>{item.size} · {item.color}{item.quantity < 1 ? ' · Hết' : ''}</Text></Pressable>)}</View>{variant ? <Text style={{ color: theme.colors.muted }}>Còn {variant.quantity} sản phẩm</Text> : null}</View>
    {notice ? <Text style={{ color: theme.colors.success }}>{notice}</Text> : null}<Button title="Thêm vào túi đồ" onPress={addToBag} disabled={!variant || variant.quantity < 1} /><Button title={favorite ? '♥  Đã yêu thích' : '♡  Thêm yêu thích'} variant="light" onPress={toggleFavorite} />
    <View style={{ gap: 12 }}><SectionTitle title={`Đánh giá (${result.reviews?.length || 0})`} />{result.reviews?.length ? result.reviews.map(review => <View key={review._id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 5 }}><Text style={{ fontWeight: '700' }}>{review.user?.name || 'Khách hàng'} · {'★'.repeat(review.rating)}</Text><Text style={{ color: theme.colors.muted }}>{review.comment}</Text></View>) : <Text style={{ color: theme.colors.muted }}>Chưa có đánh giá.</Text>}</View>
  </ScrollView>;
}
