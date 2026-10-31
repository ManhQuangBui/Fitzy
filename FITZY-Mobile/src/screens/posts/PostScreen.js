import React, { useEffect, useState } from 'react';
import { Image, Text } from 'react-native';
import api from '../../services/api';
import { Page, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

export default function PostScreen({ route }) {
  const [state, setState] = useState({ item: null, loading: true, error: '' });
  useEffect(() => { let live = true; api.get(`/posts/${route.params.slug}`).then(response => live && setState({ item: response.data.data.item, loading: false, error: '' })).catch(error => live && setState({ item: null, loading: false, error: error.message })); return () => { live = false; }; }, [route.params.slug]);
  if (state.loading) return <Page><StateMessage title="Đang tải bài viết" loading /></Page>;
  if (state.error || !state.item) return <Page><StateMessage title="Không thể mở bài viết" message={state.error} /></Page>;
  return <Page><Text style={{ color: theme.colors.accent, letterSpacing: 1 }}>FITZY JOURNAL · {new Date(state.item.publishedAt).toLocaleDateString('vi-VN')}</Text><Text style={{ color: theme.colors.ink, fontSize: 27, fontWeight: '800', lineHeight: 34 }}>{state.item.title}</Text>{state.item.image ? <Image source={{ uri: state.item.image }} style={{ width: '100%', height: 230, borderRadius: 18 }} /> : null}{state.item.excerpt ? <Text style={{ color: theme.colors.muted, fontSize: 16, lineHeight: 24 }}>{state.item.excerpt}</Text> : null}<Text style={{ color: theme.colors.ink, lineHeight: 25 }}>{state.item.content}</Text></Page>;
}
