import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Page, StateMessage } from '../../components/ui';
import { theme } from '../../constants/theme';

const resolveImageUrl = (url) => {
  if (!url) return '';
  const apiHost = (process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:4000/api').replace(/\/api\/?$/, '');
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):4000/, apiHost);
  }
  if (!url.startsWith('http')) {
    return `${apiHost}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  return url;
};

export default function PostScreen({ route, navigation }) {
  const [state, setState] = useState({ item: null, loading: true, error: '' });

  useEffect(() => {
    let live = true;
    api.get(`/posts/${route.params.slug}`)
      .then(response => live && setState({ item: response.data.data.item, loading: false, error: '' }))
      .catch(error => live && setState({ item: null, loading: false, error: error.message }));
    return () => { live = false; };
  }, [route.params.slug]);

  if (state.loading) return <Page><StateMessage title="Đang tải bài viết" loading /></Page>;
  if (state.error || !state.item) return <Page><StateMessage title="Không thể mở bài viết" message={state.error} /></Page>;

  const post = state.item;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Header Info */}
      <View style={styles.metaRow}>
        <Text style={styles.eyebrow}>
          FITZY JOURNAL · {new Date(post.publishedAt || Date.now()).toLocaleDateString('vi-VN')}
        </Text>
        {post.readTime && <Text style={styles.readTime}>⏱ {post.readTime}</Text>}
      </View>

      <Text style={styles.title}>{post.title}</Text>

      {/* Author & Badge */}
      <View style={styles.authorBar}>
        <View style={styles.authorGroup}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarChar}>F</Text>
          </View>
          <View>
            <Text style={styles.authorName}>{post.author?.name || 'FITZY Editorial'}</Text>
            <Text style={styles.authorRole}>{post.author?.role || 'Fashion Editor'}</Text>
          </View>
        </View>

        {post.badge ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{post.badge}</Text>
          </View>
        ) : null}
      </View>

      {/* Hero Image */}
      {post.image ? (
        <Image
          source={{ uri: resolveImageUrl(post.image) }}
          style={styles.mainImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Excerpt */}
      {post.excerpt ? (
        <View style={styles.excerptBox}>
          <Text style={styles.excerptText}>{post.excerpt}</Text>
        </View>
      ) : null}

      {/* Content */}
      <Text style={styles.content}>{post.content}</Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 ? (
        <View style={styles.tagsContainer}>
          {post.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Related Products */}
      {post.relatedProducts && post.relatedProducts.length > 0 ? (
        <View style={styles.relatedSection}>
          <Text style={styles.relatedHeading}>Sản phẩm trong bài viết</Text>
          <View style={styles.relatedGrid}>
            {post.relatedProducts.map(prod => (
              <Pressable
                key={prod._id}
                onPress={() => navigation.navigate('Product', { id: prod._id, slug: prod.slug })}
                style={styles.relatedCard}
              >
                {prod.images?.[0] ? (
                  <Image source={{ uri: resolveImageUrl(prod.images[0]) }} style={styles.relatedThumb} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.relatedProdName} numberOfLines={1}>{prod.name}</Text>
                  <Text style={styles.relatedProdPrice}>
                    {Number(prod.price || 0).toLocaleString('vi-VN')} đ
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#8c7d70" />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingBottom: 40,
    backgroundColor: '#ffffff',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#8c7d70',
  },
  readTime: {
    fontSize: 11,
    color: '#a1a1aa',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    color: '#181818',
    marginBottom: 14,
  },
  authorBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f4ece2',
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
  },
  authorRole: {
    fontSize: 11,
    color: '#8c7d70',
  },
  badgePill: {
    backgroundColor: '#f4ede4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#181818',
  },
  mainImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    marginBottom: 18,
  },
  excerptBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#181818',
    paddingLeft: 12,
    marginBottom: 16,
  },
  excerptText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    color: '#52525b',
  },
  content: {
    fontSize: 15,
    lineHeight: 25,
    color: '#27272a',
    marginBottom: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagPill: {
    backgroundColor: '#f4f4f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#52525b',
  },
  relatedSection: {
    borderTopWidth: 1,
    borderTopColor: '#f4ece2',
    paddingTop: 18,
    marginTop: 10,
  },
  relatedHeading: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#181818',
    marginBottom: 12,
  },
  relatedGrid: {
    gap: 10,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf8f5',
    padding: 10,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee7de',
  },
  relatedThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  relatedProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
  },
  relatedProdPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8c7d70',
    marginTop: 2,
  },
});
