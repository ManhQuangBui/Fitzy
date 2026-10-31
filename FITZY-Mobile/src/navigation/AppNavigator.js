import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Text } from 'react-native';
import { theme } from '../constants/theme';
import HomeScreen from '../screens/home/HomeScreen';
import CatalogScreen from '../screens/products/CatalogScreen';
import ProductScreen from '../screens/products/ProductScreen';
import CartScreen from '../screens/cart/CartScreen';
import CheckoutScreen from '../screens/checkout/CheckoutScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import FavoritesScreen from '../screens/favorites/FavoritesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthScreen from '../screens/auth/AuthScreen';
import StylistScreen from '../screens/ai-stylist/StylistScreen';
import ReviewScreen from '../screens/reviews/ReviewScreen';
import PostsScreen from '../screens/posts/PostsScreen';
import PostScreen from '../screens/posts/PostScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminManagementScreen from '../screens/admin/AdminManagementScreen';

const Tabs = createBottomTabNavigator(); const Stack = createNativeStackNavigator();
function TabIcon({ focused, label }) { return <Text style={{ color: focused ? theme.colors.ink : '#aaa69f', fontSize: 10, fontWeight: '700' }}>{label}</Text>; }
function ShopTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.ink, tabBarInactiveTintColor: '#9a9790', tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, backgroundColor: '#fff', borderTopColor: theme.colors.line }, tabBarLabelStyle: { fontSize: 10, fontWeight: '600' } }}>
    <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Khám phá', tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="✦" /> }} />
    <Tabs.Screen name="Catalog" component={CatalogScreen} options={{ title: 'Sản phẩm', tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="▦" /> }} />
    <Tabs.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Yêu thích', tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="♡" /> }} />
    <Tabs.Screen name="Cart" component={CartScreen} options={{ title: 'Túi đồ', tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="▱" /> }} />
    <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Tài khoản', tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="◯" /> }} />
  </Tabs.Navigator>;
}

export default function AppNavigator() {
  const isAdmin = useSelector(state => state.auth.user?.role === 'admin');
  if (isAdmin) return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.paper }, headerShadowVisible: false, headerTintColor: theme.colors.ink, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: theme.colors.paper } }}>
    <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard cửa hàng', headerBackVisible: false }} />
    <Stack.Screen name="AdminResource" component={AdminManagementScreen} options={({ route }) => ({ title: ({ orders: 'Đơn hàng', customers: 'Khách hàng', categories: 'Danh mục', products: 'Sản phẩm', reviews: 'Đánh giá', posts: 'Bài viết', promotions: 'Khuyến mãi' })[route.params?.kind] || 'Quản lý cửa hàng' })} />
  </Stack.Navigator>;
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.colors.paper }, headerShadowVisible: false, headerTintColor: theme.colors.ink, headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: theme.colors.paper } }}>
    <Stack.Screen name="Store" component={ShopTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Product" component={ProductScreen} options={{ title: 'Chi tiết sản phẩm' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Thanh toán' }} />
    <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
    <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng' }} />
    <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Tài khoản FITZY', presentation: 'modal' }} />
    <Stack.Screen name="Stylist" component={StylistScreen} options={{ title: 'FITZY Stylist' }} />
    <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Viết đánh giá' }} />
    <Stack.Screen name="Posts" component={PostsScreen} options={{ title: 'FITZY Journal' }} />
    <Stack.Screen name="Post" component={PostScreen} options={{ title: 'Bài viết' }} />
  </Stack.Navigator>;
}
