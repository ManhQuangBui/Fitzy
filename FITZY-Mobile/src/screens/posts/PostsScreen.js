import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import api from '../../services/api';

const CATEGORIES = [
  'Tất cả bài viết',
  'Phối đồ hàng ngày',
  'Xu hướng mới',
  'Chăm sóc vải',
  'Màu sắc & Chất liệu',
];

const CATEGORY_ICONS = {
  'Phối đồ hàng ngày': '👔 ',
  'Xu hướng mới': '✨ ',
  'Chăm sóc vải': '🧵 ',
  'Màu sắc & Chất liệu': '🎨 ',
};

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

export default function PostsScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả bài viết');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState(new Set());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [subscriberEmail, setSubscriberEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts', { params: { limit: 20 } });
      setPosts(res.data?.data?.items || []);
    } catch (err) {
      console.warn('Lỗi tải bài viết:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const toggleLike = (postId) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleBookmark = (postId) => {
    setBookmarkedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleSubscribe = () => {
    if (!subscriberEmail || !subscriberEmail.includes('@')) {
      Alert.alert('Thông báo', 'Vui lòng nhập đúng định dạng email.');
      return;
    }
    setSubscribed(true);
    setSubscriberEmail('');
    Alert.alert('Thành công', 'Cảm ơn bạn đã đăng ký! FITZY sẽ gửi Lookbook mới nhất vào hòm thư của bạn.');
  };

  // Tách bài Editorial Pick và danh sách bài thường
  const editorialPost = useMemo(() => {
    return posts.find((p) => p.isEditorialPick) || posts[0];
  }, [posts]);

  const regularPosts = useMemo(() => {
    return posts.filter((p) => {
      if (showBookmarksOnly && !bookmarkedPosts.has(p._id)) return false;
      if (posts.length > 1 && editorialPost && p._id === editorialPost._id) return false;
      if (selectedCategory !== 'Tất cả bài viết' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.title.toLowerCase().includes(q) || (p.excerpt && p.excerpt.toLowerCase().includes(q));
      }
      return true;
    });
  }, [posts, editorialPost, selectedCategory, searchQuery, showBookmarksOnly, bookmarkedPosts]);

  return (
    <View style={styles.container}>
      {/* 1. Custom Navigation Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.ink} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>FITZY · MAGAZINE</Text>
          <Text style={styles.headerTitle}>FITZY Journal</Text>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setIsSearching(!isSearching)}
            style={[styles.iconButton, isSearching && styles.iconButtonActive]}
            hitSlop={10}
          >
            <Ionicons
              name={isSearching ? 'close' : 'search-outline'}
              size={21}
              color={isSearching ? '#ffffff' : theme.colors.ink}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowBookmarksOnly(!showBookmarksOnly)}
            style={[styles.iconButton, showBookmarksOnly && styles.iconButtonActive]}
            hitSlop={10}
          >
            <Ionicons
              name={showBookmarksOnly || bookmarkedPosts.size > 0 ? 'bookmark' : 'bookmark-outline'}
              size={21}
              color={showBookmarksOnly ? '#ffffff' : theme.colors.ink}
            />
          </Pressable>
        </View>
      </View>

      {/* Thanh tìm kiếm khi mở search */}
      {isSearching && (
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm bài viết, phong cách..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          ) : null}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Tiêu điểm tuần này (Hero Editorial Card) */}
        {!showBookmarksOnly && editorialPost && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>• TIÊU ĐIỂM TUẦN NÀY</Text>
              <Text style={styles.sectionSub}>Cập nhật hôm nay</Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Post', { slug: editorialPost.slug })}
              style={styles.heroCard}
            >
              <Image source={{ uri: resolveImageUrl(editorialPost.image) }} style={styles.heroImage} />
              <View style={styles.heroOverlay}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.editorialPickBadge}>
                    <Text style={styles.editorialPickText}>EDITORIAL PICK</Text>
                  </View>
                  <View style={styles.trendBadge}>
                    <Text style={styles.trendBadgeText}>{editorialPost.badge || 'Xu hướng 2025'}</Text>
                  </View>
                </View>

                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMetaText}>
                    📅 Hôm nay • ⏱ {editorialPost.readTime || '5 phút đọc'}
                  </Text>
                </View>

                <Text style={styles.heroTitle} numberOfLines={2}>
                  {editorialPost.title}
                </Text>

                <Text style={styles.heroExcerpt} numberOfLines={2}>
                  {editorialPost.excerpt}
                </Text>

                <View style={styles.heroAuthorRow}>
                  <View style={styles.authorGroup}>
                    <View style={styles.authorAvatarCircle}>
                      <Text style={styles.authorAvatarChar}>F</Text>
                    </View>
                    <Text style={styles.heroAuthorName}>
                      {editorialPost.author?.name || 'FITZY Styling Team'}
                    </Text>
                  </View>
                  <View style={styles.readMoreGroup}>
                    <Text style={styles.readMoreText}>Đọc tiếp</Text>
                    <Ionicons name="chevron-forward" size={14} color="#ffffff" />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        )}

        {/* 3. Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.chipPill, isActive && styles.chipPillActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {CATEGORY_ICONS[cat] || ''}{cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 4. Bài viết mới nhất */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {showBookmarksOnly ? 'BÀI VIẾT ĐÃ LƯU' : 'BÀI VIẾT MỚI NHẤT'}
            </Text>
            <Text style={styles.sectionSub}>Hiển thị {regularPosts.length} bài</Text>
          </View>

          <View style={styles.articlesList}>
            {regularPosts.map((post) => {
              const isLiked = likedPosts.has(post._id);
              const isBookmarked = bookmarkedPosts.has(post._id);

              // Thẻ dạng Spotlight Outfit (2 ảnh phối hợp song song hoặc tự động lấy từ 2 sản phẩm gắn thẻ)
              const taggedProds = post.relatedProducts || [];
              const outfitImages = post.spotlightImages?.length >= 2 
                ? post.spotlightImages 
                : taggedProds.slice(0, 2).map(p => p.images?.[0]).filter(Boolean);

              if (outfitImages.length >= 2) {
                return (
                  <Pressable
                    key={post._id}
                    onPress={() => navigation.navigate('Post', { slug: post.slug })}
                    style={styles.spotlightCard}
                  >
                    <View style={styles.spotlightImageGrid}>
                      <View style={styles.spotlightImageWrapper}>
                        <Image source={{ uri: resolveImageUrl(outfitImages[0]) }} style={styles.spotlightImg} />
                        <View style={styles.spotlightBadgeOnImg}>
                          <Text style={styles.spotlightBadgeOnImgText}>{post.badge || 'Phong cách làm việc'}</Text>
                        </View>
                      </View>
                      <View style={styles.spotlightImageWrapper}>
                        <Image source={{ uri: resolveImageUrl(outfitImages[1]) }} style={styles.spotlightImg} />
                      </View>
                    </View>

                    <View style={styles.spotlightContent}>
                      <Text style={styles.articleDate}>
                        ⏱ {post.readTime || '3 phút đọc'}
                      </Text>
                      <Text style={styles.spotlightTitle}>{post.title}</Text>
                      <Text style={styles.spotlightExcerpt} numberOfLines={2}>
                        {post.excerpt}
                      </Text>

                      <View style={styles.spotlightFooter}>
                        <Text style={styles.spotlightHashtags}>
                          {taggedProds.length > 0 ? `🛍️ Có ${taggedProds.length} sản phẩm gợi ý` : (post.tags?.join(' ') || '#SmartCasual #FitzyMinimal')}
                        </Text>
                        <Pressable
                          onPress={() => navigation.navigate('Stylist')}
                          style={styles.outfitActionBtn}
                        >
                          <Text style={styles.outfitActionText}>Xem gợi ý outfit →</Text>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              }

              // Thẻ dạng Compact Horizontal Card thông thường
              return (
                <Pressable
                  key={post._id}
                  onPress={() => navigation.navigate('Post', { slug: post.slug })}
                  style={styles.horizontalCard}
                >
                  <View style={styles.horizontalThumbWrap}>
                    <Image source={{ uri: resolveImageUrl(post.image) }} style={styles.horizontalThumb} />
                    {post.badge ? (
                      <View style={styles.thumbMiniBadge}>
                        <Text style={styles.thumbMiniBadgeText}>{post.badge}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.horizontalContent}>
                    <Text style={styles.articleDate}>
                      ⏱ {post.readTime || '4 phút đọc'}
                    </Text>
                    <Text style={styles.horizontalTitle} numberOfLines={2}>
                      {post.title}
                    </Text>
                    <View style={styles.horizontalBottomRow}>
                      <Text style={styles.horizontalAuthor}>
                        Tác giả: {post.author?.name || 'FITZY Editorial'}
                      </Text>
                      <View style={styles.cardActionsRow}>
                        <Pressable onPress={() => toggleBookmark(post._id)} hitSlop={8} style={{ marginRight: 6 }}>
                          <Ionicons
                            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                            size={16}
                            color={isBookmarked ? theme.colors.ink : '#9ca3af'}
                          />
                        </Pressable>
                        <Pressable onPress={() => toggleLike(post._id)} hitSlop={8}>
                          <Ionicons
                            name={isLiked ? 'heart' : 'heart-outline'}
                            size={17}
                            color={isLiked ? '#e11d48' : '#9ca3af'}
                          />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 5. Newsletter Subscription Card (Lookbook số mới) */}
        <View style={styles.newsletterCard}>
          <Text style={styles.newsletterEyebrow}>BẢN TIN FITZY</Text>
          <Text style={styles.newsletterTitle}>Đăng ký nhận Lookbook số mới</Text>
          <Text style={styles.newsletterSubtitle}>
            Nhận gợi ý outfit hàng tuần, xu hướng phối đồ tối giản và ưu đãi độc quyền dành riêng cho thành viên.
          </Text>

          <View style={styles.newsletterForm}>
            <TextInput
              style={styles.newsletterInput}
              placeholder="Email của bạn..."
              placeholderTextColor="#71717a"
              value={subscriberEmail}
              onChangeText={setSubscriberEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable onPress={handleSubscribe} style={styles.newsletterBtn}>
              <Text style={styles.newsletterBtnText}>{subscribed ? 'Đã lưu ✓' : 'Đăng ký'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbfaf8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: '#fbfaf8',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f3ede4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#181818',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#8c7d70',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ece8e1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#181818',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionBlock: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#262626',
  },
  sectionSub: {
    fontSize: 11,
    color: '#8c7d70',
  },

  // Hero Card
  heroCard: {
    height: 360,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#181818',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.52)',
    padding: 18,
    justifyContent: 'flex-end',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  editorialPickBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  editorialPickText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#181818',
    letterSpacing: 0.5,
  },
  trendBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroMetaRow: {
    marginBottom: 6,
  },
  heroMetaText: {
    fontSize: 11,
    color: '#e4e4e7',
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 6,
  },
  heroExcerpt: {
    fontSize: 12,
    color: '#d4d4d8',
    lineHeight: 18,
    marginBottom: 14,
  },
  heroAuthorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarChar: {
    fontSize: 12,
    fontWeight: '800',
    color: '#181818',
  },
  heroAuthorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  readMoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Category Chips
  chipsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  chipPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e2d8',
  },
  chipPillActive: {
    backgroundColor: '#181818',
    borderColor: '#181818',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52525b',
  },
  chipTextActive: {
    color: '#ffffff',
  },

  // Articles List
  articlesList: {
    gap: 14,
  },
  horizontalCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f0ece4',
  },
  horizontalThumbWrap: {
    width: 86,
    height: 86,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f4ede4',
  },
  horizontalThumb: {
    width: '100%',
    height: '100%',
  },
  thumbMiniBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(24,24,24,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  thumbMiniBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  horizontalContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  articleDate: {
    fontSize: 10,
    color: '#8c7d70',
    fontWeight: '500',
  },
  horizontalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#181818',
    lineHeight: 19,
  },
  horizontalBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  horizontalAuthor: {
    fontSize: 11,
    color: '#71717a',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Spotlight Card
  spotlightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee8dd',
  },
  spotlightImageGrid: {
    flexDirection: 'row',
    height: 170,
    gap: 4,
    backgroundColor: '#ece6dc',
  },
  spotlightImageWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  spotlightImg: {
    width: '100%',
    height: '100%',
  },
  spotlightBadgeOnImg: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(24,24,24,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  spotlightBadgeOnImgText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  spotlightContent: {
    padding: 14,
    gap: 6,
  },
  spotlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181818',
    lineHeight: 22,
  },
  spotlightExcerpt: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 18,
  },
  spotlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f4f0e8',
  },
  spotlightHashtags: {
    fontSize: 11,
    color: '#8c7d70',
    fontWeight: '500',
  },
  outfitActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  outfitActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181818',
  },

  // Newsletter Card
  newsletterCard: {
    backgroundColor: '#181818',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 26,
    padding: 22,
    alignItems: 'center',
  },
  newsletterEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#c4b5a5',
    marginBottom: 6,
  },
  newsletterTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  newsletterSubtitle: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  newsletterForm: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#27272a',
    borderRadius: 30,
    padding: 4,
    gap: 6,
  },
  newsletterInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 13,
  },
  newsletterBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsletterBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#181818',
  },
});
