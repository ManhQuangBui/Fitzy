import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const TAB_ICON_NAMES = {
  home: {
    active: 'home',
    inactive: 'home-outline',
  },
  catalog: {
    active: 'grid',
    inactive: 'grid-outline',
  },
  favorites: {
    active: 'heart',
    inactive: 'heart-outline',
  },
  cart: {
    active: 'bag-handle',
    inactive: 'bag-handle-outline',
  },
  profile: {
    active: 'person',
    inactive: 'person-outline',
  },
};

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused, badge }) {
  const iconConfig = TAB_ICON_NAMES[name] || { active: 'ellipse', inactive: 'ellipse-outline' };
  const iconName = focused ? iconConfig.active : iconConfig.inactive;
  const color = focused ? theme.colors.ink : '#9ca3af';

  return (
    <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={iconName} size={22} color={color} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: '#181818',
          }}
        />
      ) : null}
    </View>
  );
}

function ShopTabs() {
  const cartItemsCount = useSelector(state => state.cart?.items?.length || 0);

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.ink,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: '#ffffff',
          borderTopColor: '#ece8e1',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Khám phá',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Catalog"
        component={CatalogScreen}
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ focused }) => <TabIcon name="catalog" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Yêu thích',
          tabBarIcon: ({ focused }) => <TabIcon name="favorites" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Túi hàng',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="cart" focused={focused} badge={cartItemsCount > 0} />
          ),
        }}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs.Navigator>
  );
}

export default function AppNavigator() {
  const isAdmin = useSelector(state => state.auth.user?.role === 'admin');
  if (isAdmin)
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.paper },
          headerShadowVisible: false,
          headerTintColor: theme.colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.colors.paper },
        }}
      >
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'Dashboard cửa hàng', headerBackVisible: false }}
        />
        <Stack.Screen
          name="AdminResource"
          component={AdminManagementScreen}
          options={({ route }) => ({
            title:
              ({
                orders: 'Đơn hàng',
                customers: 'Khách hàng',
                categories: 'Danh mục',
                products: 'Sản phẩm',
                reviews: 'Đánh giá',
                posts: 'Bài viết',
                promotions: 'Khuyến mãi',
              })[route.params?.kind] || 'Quản lý cửa hàng',
          })}
        />
      </Stack.Navigator>
    );

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.paper },
        headerShadowVisible: false,
        headerTintColor: theme.colors.ink,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.colors.paper },
      }}
    >
      <Stack.Screen name="Store" component={ShopTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Product"
        component={ProductScreen}
        options={{
          title: 'Chi tiết sản phẩm',
          headerStyle: { backgroundColor: theme.colors.paper },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.paper },
        }}
      />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Thanh toán' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Chi tiết đơn hàng' }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{ title: 'Tài khoản FITZY', presentation: 'modal' }}
      />
      <Stack.Screen name="Stylist" component={StylistScreen} options={{ title: 'FITZY Stylist' }} />
      <Stack.Screen name="Review" component={ReviewScreen} options={{ title: 'Viết đánh giá' }} />
      <Stack.Screen name="Posts" component={PostsScreen} options={{ title: 'FITZY Journal' }} />
      <Stack.Screen name="Post" component={PostScreen} options={{ title: 'Bài viết' }} />
    </Stack.Navigator>
  );
}
