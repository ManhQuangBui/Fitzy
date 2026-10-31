import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { clearReview, submitReview } from '../../store/slices/reviewSlice';
import { Button, Field, Page, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function ReviewScreen({ route, navigation }) {
  const dispatch = useDispatch(); const user = useSelector(state => state.auth.user); const { productId, productName, orderId } = route.params; const { status, error, submitted } = useSelector(state => state.reviews); const [rating, setRating] = useState(5); const [comment, setComment] = useState('');
  if (!user) return <Page><StateMessage title="Đăng nhập để gửi đánh giá" action="Đăng nhập" onAction={() => navigation.navigate('Auth')} /></Page>;
  const save = async () => { const result = await dispatch(submitReview({ productId, orderId, rating, comment })); if (submitReview.fulfilled.match(result)) { navigation.goBack(); dispatch(clearReview()); } };
  return <Page><View style={{ gap: 8 }}><Text style={{ color: theme.colors.muted }}>ĐÁNH GIÁ SẢN PHẨM</Text><Text style={{ color: theme.colors.ink, fontSize: 23, fontWeight: '800' }}>{productName}</Text></View><View style={{ flexDirection: 'row', gap: 12 }}>{[1, 2, 3, 4, 5].map(value => <Text key={value} onPress={() => setRating(value)} style={{ color: value <= rating ? theme.colors.accent : '#c7c2b8', fontSize: 31 }}>★</Text>)}</View><Field label="Chia sẻ trải nghiệm" value={comment} onChangeText={setComment} multiline placeholder="Chất liệu, phom dáng, cách phối..." />{error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}{submitted ? <Text style={{ color: theme.colors.success }}>Đã gửi đánh giá.</Text> : null}<Button title="Gửi đánh giá" loading={status === 'loading'} onPress={save} /></Page>;
}
