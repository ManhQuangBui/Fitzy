import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { theme } from '../constants/theme';

export function Page({ children, scroll = true, style, contentStyle, refreshControl }) {
  const Container = scroll ? require('react-native').ScrollView : View;
  return <Container keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic" refreshControl={scroll ? refreshControl : undefined} style={[{ flex: 1, backgroundColor: theme.colors.paper }, style]} contentContainerStyle={scroll ? [{ padding: 20, gap: 18 }, contentStyle] : undefined}>{children}</Container>;
}
export function Label({ children, style, muted = false, ...props }) { return <Text selectable style={[{ color: muted ? theme.colors.muted : theme.colors.ink, fontSize: 14 }, style]} {...props}>{children}</Text>; }
export function Button({ title, onPress, disabled, variant = 'dark', loading, style }) {
  const dark = variant === 'dark';
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled || loading} style={[{ minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, borderRadius: 15, backgroundColor: dark ? theme.colors.ink : 'transparent', borderWidth: dark ? 0 : 1, borderColor: theme.colors.line, opacity: disabled || loading ? 0.55 : 1 }, style]}>{loading ? <ActivityIndicator color={dark ? '#fff' : theme.colors.ink} /> : <Text style={{ color: dark ? '#fff' : theme.colors.ink, fontWeight: '700', letterSpacing: 0.3 }}>{title}</Text>}</Pressable>;
}
export function Field({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, autoCapitalize = 'sentences' }) {
  return <View style={{ gap: 7 }}><Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#aaa69f" keyboardType={keyboardType} secureTextEntry={secureTextEntry} multiline={multiline} autoCapitalize={autoCapitalize} style={{ minHeight: multiline ? 90 : 50, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.line, paddingHorizontal: 14, paddingVertical: 13, textAlignVertical: multiline ? 'top' : 'center', color: theme.colors.ink }} /></View>;
}
export function SectionTitle({ title, action, onAction }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 21, fontWeight: '700', color: theme.colors.ink }}>{title}</Text>{action ? <Pressable onPress={onAction}><Text style={{ color: theme.colors.muted, fontWeight: '600' }}>{action}</Text></Pressable> : null}</View>; }
export function StateMessage({ title, message, action, onAction, loading }) { return <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>{loading ? <ActivityIndicator color={theme.colors.ink} /> : null}<Text style={{ color: theme.colors.ink, fontWeight: '700', fontSize: 17 }}>{title}</Text>{message ? <Text style={{ color: theme.colors.muted, textAlign: 'center', lineHeight: 21 }}>{message}</Text> : null}{action ? <Button title={action} variant="light" onPress={onAction} style={{ minWidth: 150, marginTop: 4 }} /> : null}</View>; }
export function ProductCard({ product, onPress, onFavorite, favorite }) {
  const image = product.images?.[0] || product.variants?.[0]?.images?.[0];
  return <Pressable onPress={onPress} style={{ flex: 1, gap: 8, paddingBottom: 10 }}><View style={{ height: 210, borderRadius: 18, overflow: 'hidden', backgroundColor: theme.colors.sand }}>
    {image ? <Image source={{ uri: image }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.colors.muted }}>FITZY · DEMO</Text></View>}
    {onFavorite ? <Pressable accessibilityRole="button" onPress={event => { event.stopPropagation(); onFavorite(); }} style={{ position: 'absolute', top: 10, right: 10, height: 36, width: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 17, color: favorite ? theme.colors.danger : theme.colors.ink }}>{favorite ? '♥' : '♡'}</Text></Pressable> : null}
  </View><Text numberOfLines={1} style={{ color: theme.colors.ink, fontWeight: '600' }}>{product.name}</Text><Text style={{ color: theme.colors.muted }}>{new Intl.NumberFormat('vi-VN').format(product.price)} ₫</Text></Pressable>;
}
export function ProductGrid({ products, navigation, onFavorite }) {
  const { FlatList } = require('react-native');
  return <FlatList contentInsetAdjustmentBehavior="automatic" data={products} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ gap: 12, padding: 20 }} keyExtractor={item => item._id} renderItem={({ item }) => <ProductCard product={item} onPress={() => navigation.navigate('Product', { id: item._id })} onFavorite={onFavorite ? () => onFavorite(item._id) : undefined} favorite={onFavorite?.isFavorite?.(item._id)} />} ListEmptyComponent={<StateMessage title="Chưa có sản phẩm" message="Thử đổi bộ lọc hoặc quay lại sau nhé." />} />;
}
