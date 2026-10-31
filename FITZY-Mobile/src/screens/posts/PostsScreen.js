import React, { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPosts } from '../../store/slices/postSlice';
import { Page, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function PostsScreen({ navigation }) {
  const dispatch = useDispatch(); const { items, status, error } = useSelector(state => state.posts);
  useEffect(() => { dispatch(fetchPosts()); }, [dispatch]);
  return <Page><Text style={{ color: theme.colors.muted }}>Bài viết thời trang FITZY · Nội dung demo.</Text>{status === 'loading' && !items.length ? <StateMessage title="Đang tải bài viết" loading /> : error && !items.length ? <StateMessage title="Không thể tải bài viết" message={error} action="Thử lại" onAction={() => dispatch(fetchPosts())} /> : null}{items.map(post => <Pressable key={post._id} onPress={() => navigation.navigate('Post', { slug: post.slug })} style={{ backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden' }}>{post.image ? <Image source={{ uri: post.image }} style={{ width: '100%', height: 180, backgroundColor: theme.colors.sand }} /> : null}<View style={{ padding: 16, gap: 7 }}><Text style={{ color: theme.colors.accent, fontSize: 10, letterSpacing: 1 }}>FITZY JOURNAL · {new Date(post.publishedAt).toLocaleDateString('vi-VN')}</Text><Text style={{ color: theme.colors.ink, fontSize: 19, fontWeight: '800' }}>{post.title}</Text><Text style={{ color: theme.colors.muted, lineHeight: 21 }}>{post.excerpt}</Text></View></Pressable>)}{!items.length && status === 'idle' ? <StateMessage title="Chưa có bài viết" message="Bài viết đã xuất bản sẽ hiển thị tại đây." /> : null}</Page>;
}
