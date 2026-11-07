import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { askStylist, clearAdvice } from '../../store/slices/aiSlice';
import { addItems } from '../../store/slices/cartSlice';
import { formatVnd, resolveImageUrl } from '../../constants/theme';

const GENDERS = [
  { id: 'nam', label: 'Nam' },
  { id: 'nu', label: 'Nữ' },
  { id: 'unisex', label: 'Unisex (Cả hai)' }
];

const SEASONS = [
  { id: 'xuan-he', label: '☀️ Xuân - Hè (Mát mẻ)' },
  { id: 'thu-dong', label: '❄️ Thu - Đông (Ấm áp)' },
  { id: 'se-lanh', label: '🍂 Se lạnh / Giao mùa' },
  { id: 'bon-mua', label: '🌤️ Bốn mùa linh hoạt' }
];

const OCCASIONS = [
  'Đi làm công sở',
  'Dạo phố / Cà phê',
  'Hẹn hò / Tiệc nhẹ',
  'Du lịch & Nghỉ dưỡng',
  'Sự kiện trang trọng'
];

const STYLES = [
  'Tối giản (Minimalism)',
  'Thanh lịch (Smart Casual)',
  'Cổ điển (Vintage Chic)',
  'Năng động (Streetwear)',
  'Hiện đại (Modern Chic)'
];

const COLOR_PALETTES = [
  {
    id: 'neutral',
    label: 'Trung tính',
    sub: 'Be / Đen / Trắng',
    dots: ['#d8c2a5', '#181818', '#ffffff']
  },
  {
    id: 'pastel',
    label: 'Pastel dịu nhẹ',
    sub: 'Hồng / Xanh bơ / Kem',
    dots: ['#fbcfe8', '#bae6fd', '#fef3c7']
  },
  {
    id: 'earth',
    label: 'Tone đất ấm',
    sub: 'Nâu đất / Cam gạch',
    dots: ['#78350f', '#b45309', '#d97706']
  },
  {
    id: 'monochrome',
    label: 'All-black / Đơn sắc',
    sub: 'Đen tuyền / Xám than',
    dots: ['#181818', '#374151']
  },
  {
    id: 'cool',
    label: 'Tone lạnh thanh lịch',
    sub: 'Navy / Xám khói',
    dots: ['#1e3a8a', '#64748b', '#cbd5e1']
  },
  {
    id: 'vibrant',
    label: 'Tươi sáng nổi bật',
    sub: 'Đỏ đô / Vàng mustard',
    dots: ['#991b1b', '#eab308', '#ea580c']
  },
  {
    id: 'vintage',
    label: 'Vintage Retro',
    sub: 'Xanh rêu / Nâu cổ điển',
    dots: ['#3f6212', '#854d0e', '#ca8a04']
  },
  {
    id: 'denim',
    label: 'Denim & Indigo',
    sub: 'Xanh jeans kinh điển',
    dots: ['#1d4ed8', '#60a5fa']
  }
];

const SIZES = ['S', 'M', 'L', 'XL', 'Free'];

const BUDGET_OPTIONS = [
  { id: 'under_700k', label: '< 700k', fullLabel: 'Dưới 700.000đ', value: 700000, min: 0 },
  { id: '700k_1200k', label: '700k – 1.2M', fullLabel: '700k – 1.200.000đ', value: 1200000, min: 700000 },
  { id: '1200k_2000k', label: '1.2M – 2.0M', fullLabel: '1.200k – 2.000.000đ', value: 2000000, min: 1200000 },
  { id: 'above_2000k', label: '> 2.0M', fullLabel: 'Trên 2.000.000đ', value: 5000000, min: 2000000 }
];

const QUICK_TAGS = [
  '+ Vải Linen thoáng mát',
  '+ Phom suông giấu bụng',
  '+ Chống nhăn công sở',
  '+ Tôn chiều cao'
];

export default function StylistScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { answer, status, error } = useSelector(state => state.ai);

  const [gender, setGender] = useState('nam');
  const [season, setSeason] = useState('xuan-he');
  const [occasion, setOccasion] = useState('Đi làm công sở');
  const [style, setStyle] = useState('Tối giản (Minimalism)');
  const [colorTone, setColorTone] = useState('neutral');
  const [size, setSize] = useState('M');
  const [budgetOption, setBudgetOption] = useState('700k_1200k');
  const [notes, setNotes] = useState('');

  const scrollRef = useRef(null);

  const selectedBudget = BUDGET_OPTIONS.find(b => b.id === budgetOption) || BUDGET_OPTIONS[1];
  const selectedColorObj = COLOR_PALETTES.find(c => c.id === colorTone) || COLOR_PALETTES[0];
  const selectedGenderObj = GENDERS.find(g => g.id === gender) || GENDERS[0];
  const selectedSeasonObj = SEASONS.find(s => s.id === season) || SEASONS[0];

  const handleReset = () => {
    setGender('nam');
    setSeason('xuan-he');
    setOccasion('Đi làm công sở');
    setStyle('Tối giản (Minimalism)');
    setColorTone('neutral');
    setSize('M');
    setBudgetOption('700k_1200k');
    setNotes('');
    dispatch(clearAdvice());
  };

  const handleToggleTag = tag => {
    const cleanTag = tag.replace(/^\+\s*/, '');
    if (notes.includes(cleanTag)) {
      setNotes(prev =>
        prev
          .replace(cleanTag, '')
          .replace(/,\s*,/g, ',')
          .replace(/^,\s*|,\s*$/g, '')
          .trim()
      );
    } else {
      setNotes(prev => (prev ? `${prev}, ${cleanTag}` : cleanTag));
    }
  };

  const handleGetAdvice = () => {
    if (!user) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập tài khoản để nhận tư vấn phối đồ từ FITZY AI Stylist.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => navigation.navigate('Auth') }
        ]
      );
      return;
    }

    dispatch(
      askStylist({
        gender: selectedGenderObj.label,
        season: selectedSeasonObj.label,
        occasion,
        style,
        colors: `${selectedColorObj.label} (${selectedColorObj.sub})`,
        size,
        minBudget: selectedBudget.min || 0,
        budget: selectedBudget.value,
        notes
      })
    ).then(res => {
      if (res.meta.requestStatus === 'fulfilled') {
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    });
  };

  const handleAddFullOutfitToCart = () => {
    if (!answer?.products?.length) return;

    const itemsToAdd = answer.products.map(product => {
      const variant = product.matchedVariant || product.variants?.[0] || {};
      return {
        productId: product._id,
        variantId: variant._id,
        name: product.name,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        image: product.images?.[0] || '',
        size: variant.size || size,
        color: variant.color || 'Mặc định',
        quantity: 1,
        key: `${product._id}-${variant._id}`
      };
    });

    dispatch(addItems(itemsToAdd));
    Alert.alert(
      'Thành công',
      `Đã thêm trọn bộ outfit (${itemsToAdd.length} món, Size ${size}) vào giỏ hàng!`,
      [
        { text: 'Tiếp tục xem', style: 'cancel' },
        { text: 'Xem giỏ hàng', onPress: () => navigation.navigate('Store', { screen: 'Cart' }) }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* TOP APP BAR */}
        <View style={styles.appBar}>
          <Pressable
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <Ionicons name="arrow-back" size={22} color="#181818" />
          </Pressable>

          <Text style={styles.appBarTitle}>FITZY Stylist</Text>

          <Pressable
            hitSlop={12}
            onPress={handleReset}
            style={styles.resetButton}
          >
            <Text style={styles.resetText}>Làm mới</Text>
            <Ionicons name="reload" size={13} color="#55524c" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SLIM HERO BANNER */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={11} color="#d8c2a5" />
                <Text style={styles.heroBadgeText}>FITZY AI STYLIST</Text>
              </View>
              <Text style={styles.heroSubTag}>Đề xuất dựa trên kho có sẵn</Text>
            </View>
            <Text style={styles.heroTitle}>Tư vấn phối đồ chuẩn gu & theo mùa</Text>
          </View>

          {/* 1. GIỚI TÍNH (SEGMENTED FULL-WIDTH) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>1. ĐỐI TƯỢNG MẶC</Text>
            <View style={styles.segmentedContainer}>
              {GENDERS.map(item => {
                const isSelected = gender === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
                    onPress={() => setGender(item.id)}
                  >
                    <Text style={[styles.segmentText, isSelected && styles.segmentTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 2. MÙA & THỜI TIẾT (HORIZONTAL CHIPS) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>2. MÙA & THỜI TIẾT</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollRow}>
              {SEASONS.map(item => {
                const isSelected = season === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.hChip, isSelected && styles.hChipActive]}
                    onPress={() => setSeason(item.id)}
                  >
                    <Text style={[styles.hChipText, isSelected && styles.hChipTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 3. DỊP SỬ DỤNG (HORIZONTAL CHIPS) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>3. DỊP SỬ DỤNG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollRow}>
              {OCCASIONS.map(item => {
                const isSelected = occasion === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.hChip, isSelected && styles.hChipActive]}
                    onPress={() => setOccasion(item)}
                  >
                    <Text style={[styles.hChipText, isSelected && styles.hChipTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 4. PHONG CÁCH (HORIZONTAL CHIPS) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>4. PHONG CÁCH MONG MUỐN</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollRow}>
              {STYLES.map(item => {
                const isSelected = style === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.hChip, isSelected && styles.hChipActive]}
                    onPress={() => setStyle(item)}
                  >
                    <Text style={[styles.hChipText, isSelected && styles.hChipTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 5. TONE MÀU YÊU THÍCH (8 BẢNG MÀU THỜI TRANG VỚI DOTS) */}
          <View style={styles.sectionBlock}>
            <View style={styles.titleWithCountRow}>
              <Text style={styles.sectionHeading}>5. TONE MÀU YÊU THÍCH</Text>
              <Text style={styles.subHint}>8 bảng màu</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollRow}>
              {COLOR_PALETTES.map(item => {
                const isSelected = colorTone === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.colorPaletteCard, isSelected && styles.colorPaletteCardActive]}
                    onPress={() => setColorTone(item.id)}
                  >
                    <View style={styles.paletteDotsRow}>
                      {item.dots.map((dotColor, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.paletteDot,
                            { backgroundColor: dotColor },
                            dotColor === '#ffffff' && styles.whiteDotBorder
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.colorTitle, isSelected && styles.colorTitleActive]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.colorSubtitle, isSelected && styles.colorSubtitleActive]}>
                      {item.sub}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* 6. KÍCH CỠ CỦA BẠN (SIZE) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>6. KÍCH CỠ CỦA BẠN (SIZE)</Text>
            <View style={styles.sizeRow}>
              {SIZES.map(item => {
                const isSelected = size === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.sizeBox, isSelected && styles.sizeBoxActive]}
                    onPress={() => setSize(item)}
                  >
                    <Text style={[styles.sizeText, isSelected && styles.sizeTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 7. MỨC NGÂN SÁCH TỔNG BỘ */}
          <View style={styles.sectionBlock}>
            <View style={styles.titleWithCountRow}>
              <Text style={styles.sectionHeading}>7. NGÂN SÁCH TỔNG CẢ SET</Text>
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>Tổng giá 2 món</Text>
              </View>
            </View>
            <View style={styles.budgetRow}>
              {BUDGET_OPTIONS.map(item => {
                const isSelected = budgetOption === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.budgetBox, isSelected && styles.budgetBoxActive]}
                    onPress={() => setBudgetOption(item.id)}
                  >
                    <Text style={[styles.budgetBoxText, isSelected && styles.budgetBoxTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 8. GHI CHÚ THÊM (TÙY CHỌN) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>8. GHI CHÚ THÊM (TÙY CHỌN)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickTagsScroll}>
              {QUICK_TAGS.map(tag => {
                const cleanTag = tag.replace(/^\+\s*/, '');
                const isActive = notes.includes(cleanTag);
                return (
                  <Pressable
                    key={tag}
                    style={[styles.quickChip, isActive && styles.quickChipActive]}
                    onPress={() => handleToggleTag(tag)}
                  >
                    <Text style={[styles.quickChipText, isActive && styles.quickChipTextActive]}>
                      {tag}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ví dụ: Cần phối giày da nâu hoặc đi làm phòng máy lạnh..."
              placeholderTextColor="#a39f96"
              style={styles.cleanInput}
            />
          </View>

          {/* ERROR ALERT */}
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={15} color="#a13d37" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* SUBMIT BUTTON */}
          <Pressable
            style={styles.submitButton}
            onPress={handleGetAdvice}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.submitButtonContent}>
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.submitButtonText}>Nhận tư vấn phối đồ</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </View>
            )}
          </Pressable>

          <View style={styles.guaranteeRow}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text style={styles.guaranteeText}>
              100% Sản phẩm đề xuất còn sẵn size tại FITZY
            </Text>
          </View>

          {/* RESULT OUTFIT SECTION */}
          {answer?.products?.length ? (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <View style={styles.resultTitleRow}>
                  <Text style={styles.resultTitle}>Gợi ý outfit dành cho bạn</Text>
                  <View style={styles.matchScoreBadge}>
                    <Text style={styles.matchScoreText}>
                      Độ hợp gu {answer.matchScore || 98}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.resultSubtitle}>
                  Phù hợp: {selectedGenderObj.label} • {selectedSeasonObj.label.split(' ')[1] || 'Bốn mùa'} • Size {size} • {selectedBudget.label}
                </Text>
              </View>

              {/* PRODUCT CARDS */}
              <View style={styles.productsList}>
                {answer.products.map(product => {
                  const hasImage = Boolean(product.images?.[0]);
                  return (
                    <Pressable
                      key={product._id}
                      style={styles.productCard}
                      onPress={() =>
                        navigation.navigate('Product', { id: product._id })
                      }
                    >
                      <View style={styles.productImageWrapper}>
                        {hasImage ? (
                          <Image
                            source={{ uri: resolveImageUrl(product.images[0]) }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.productImage, styles.productImagePlaceholder]}>
                            <Ionicons name="shirt-outline" size={22} color="#a39f96" />
                          </View>
                        )}
                        <View style={styles.sizeTagOnImage}>
                          <Text style={styles.sizeTagText}>Size {size}</Text>
                        </View>
                      </View>

                      <View style={styles.productInfo}>
                        <View style={styles.productNameRow}>
                          <Text style={styles.productName} numberOfLines={1}>
                            {product.name}
                          </Text>
                          {product.roleLabel ? (
                            <View style={styles.roleBadge}>
                              <Text style={styles.roleBadgeText}>
                                {product.roleLabel}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text style={styles.productDescription} numberOfLines={1}>
                          {product.description || `${product.category?.name || 'Trang phục'} • Form chuẩn`}
                        </Text>

                        <View style={styles.productBottomRow}>
                          <Text style={styles.productPrice}>
                            {formatVnd(product.price)}
                          </Text>
                          <View style={styles.viewProductLink}>
                            <Text style={styles.viewProductText}>Xem chi tiết</Text>
                            <Ionicons name="chevron-forward" size={12} color="#6b6862" />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* DASHED DIVIDER */}
              <View style={styles.dashedDivider} />

              {/* TOTAL ROW & ADD TO CART BUTTON */}
              <View style={styles.totalSetRow}>
                <View style={styles.totalPriceCol}>
                  <Text style={styles.totalLabel}>
                    Tổng set ({answer.products.length} món):
                  </Text>
                  <View style={styles.priceWithDiscountRow}>
                    <Text style={styles.totalPriceBold}>
                      {formatVnd(answer.totalPrice || 1239000)}
                    </Text>
                    {answer.totalCompareAtPrice &&
                    answer.totalCompareAtPrice > answer.totalPrice ? (
                      <Text style={styles.totalComparePrice}>
                        {formatVnd(answer.totalCompareAtPrice)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <Pressable
                  style={styles.addToCartButton}
                  onPress={handleAddFullOutfitToCart}
                >
                  <Ionicons name="bag-handle" size={14} color="#ffffff" />
                  <Text style={styles.addToCartButtonText}>Thêm cả bộ</Text>
                </Pressable>
              </View>

              {/* DYNAMIC STYLIST ADVICE CARD */}
              <View style={styles.adviceCard}>
                <Ionicons
                  name="bulb-outline"
                  size={18}
                  color="#d97706"
                  style={{ marginTop: 2 }}
                />
                <Text style={styles.adviceText}>
                  <Text style={styles.adviceBold}>Lời khuyên từ Stylist: </Text>
                  {answer.advice}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf8f5'
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#faf8f5',
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6'
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  appBarTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#181818',
    letterSpacing: -0.3
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  resetText: {
    fontSize: 12.5,
    color: '#55524c',
    fontWeight: '600'
  },
  scrollContainer: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30
  },
  heroCard: {
    backgroundColor: '#161616',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4
  },
  heroBadgeText: {
    color: '#d8c2a5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6
  },
  heroSubTag: {
    color: '#8c8880',
    fontSize: 11
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  sectionBlock: {
    marginBottom: 16
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6e6b65',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  titleWithCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  subHint: {
    fontSize: 11,
    color: '#8c8880'
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e8e5dc',
    gap: 4
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11
  },
  segmentBtnActive: {
    backgroundColor: '#181818'
  },
  segmentText: {
    fontSize: 12.5,
    color: '#33312e',
    fontWeight: '600'
  },
  segmentTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  hScrollRow: {
    gap: 8,
    paddingRight: 16
  },
  hChip: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e8e5dc'
  },
  hChipActive: {
    backgroundColor: '#181818',
    borderColor: '#181818'
  },
  hChipText: {
    fontSize: 12.5,
    color: '#2b2926',
    fontWeight: '500'
  },
  hChipTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  colorPaletteCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e8e5dc',
    gap: 4
  },
  colorPaletteCardActive: {
    backgroundColor: '#181818',
    borderColor: '#181818'
  },
  paletteDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  paletteDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: -3
  },
  whiteDotBorder: {
    borderWidth: 0.8,
    borderColor: '#d0ccc4'
  },
  colorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#181818'
  },
  colorTitleActive: {
    color: '#ffffff'
  },
  colorSubtitle: {
    fontSize: 10,
    color: '#78756e'
  },
  colorSubtitleActive: {
    color: '#d4cfc7'
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 8
  },
  sizeBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e5dc'
  },
  sizeBoxActive: {
    backgroundColor: '#181818',
    borderColor: '#181818'
  },
  sizeText: {
    fontSize: 13.5,
    color: '#262422',
    fontWeight: '600'
  },
  sizeTextActive: {
    color: '#ffffff',
    fontWeight: '800'
  },
  badgePill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgePillText: {
    color: '#92400e',
    fontSize: 10.5,
    fontWeight: '700'
  },
  budgetRow: {
    flexDirection: 'row',
    gap: 8
  },
  budgetBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e8e5dc'
  },
  budgetBoxActive: {
    backgroundColor: '#181818',
    borderColor: '#181818'
  },
  budgetBoxText: {
    fontSize: 11.5,
    color: '#262422',
    fontWeight: '600'
  },
  budgetBoxTextActive: {
    color: '#ffffff',
    fontWeight: '700'
  },
  quickTagsScroll: {
    gap: 6,
    paddingBottom: 8
  },
  quickChip: {
    backgroundColor: '#ebe8e1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  quickChipActive: {
    backgroundColor: '#181818'
  },
  quickChipText: {
    fontSize: 11,
    color: '#4f4c45',
    fontWeight: '500'
  },
  quickChipTextActive: {
    color: '#ffffff',
    fontWeight: '600'
  },
  cleanInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e5dc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12.5,
    color: '#181818'
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10
  },
  errorText: {
    color: '#a13d37',
    fontSize: 11.5,
    flex: 1
  },
  submitButton: {
    backgroundColor: '#181818',
    borderRadius: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700'
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 18
  },
  guaranteeText: {
    fontSize: 11,
    color: '#66635c'
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eeebe3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1
  },
  resultHeader: {
    marginBottom: 12
  },
  resultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181818'
  },
  matchScoreBadge: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  matchScoreText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700'
  },
  resultSubtitle: {
    fontSize: 11.5,
    color: '#736f68'
  },
  productsList: {
    gap: 10
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#faf8f5',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0ece3'
  },
  productImageWrapper: {
    position: 'relative',
    width: 70,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden'
  },
  productImage: {
    width: '100%',
    height: '100%'
  },
  productImagePlaceholder: {
    backgroundColor: '#eae6dd',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sizeTagOnImage: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    backgroundColor: 'rgba(24, 24, 24, 0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1
  },
  sizeTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700'
  },
  productInfo: {
    flex: 1,
    gap: 3
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  productName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#181818',
    flex: 1,
    marginRight: 4
  },
  roleBadge: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  roleBadgeText: {
    color: '#d97706',
    fontSize: 10.5,
    fontWeight: '700'
  },
  productDescription: {
    fontSize: 11.5,
    color: '#78756e'
  },
  productBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#181818'
  },
  viewProductLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  viewProductText: {
    fontSize: 11.5,
    color: '#6b6862',
    fontWeight: '600'
  },
  dashedDivider: {
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: '#e5e1d8',
    marginVertical: 12
  },
  totalSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  totalPriceCol: {
    gap: 2
  },
  totalLabel: {
    fontSize: 11.5,
    color: '#78756e'
  },
  priceWithDiscountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6
  },
  totalPriceBold: {
    fontSize: 16,
    fontWeight: '800',
    color: '#181818'
  },
  totalComparePrice: {
    fontSize: 12,
    color: '#a39f96',
    textDecorationLine: 'line-through'
  },
  addToCartButton: {
    backgroundColor: '#181818',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  addToCartButtonText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700'
  },
  adviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fdfbf7',
    borderWidth: 1,
    borderColor: '#f0e8dc',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    gap: 8
  },
  adviceText: {
    flex: 1,
    fontSize: 12,
    color: '#47443d',
    lineHeight: 18
  },
  adviceBold: {
    fontWeight: '700',
    color: '#181818'
  }
});
