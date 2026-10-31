import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import products from './slices/productSlice';
import categories from './slices/categorySlice';
import cart, { saveCart } from './slices/cartSlice';
import orders from './slices/orderSlice';
import favorites from './slices/favoriteSlice';
import reviews from './slices/reviewSlice';
import posts from './slices/postSlice';
import promotions from './slices/promotionSlice';
import ai from './slices/aiSlice';

export const store = configureStore({ reducer: { auth, products, categories, cart, orders, favorites, reviews, posts, promotions, ai }, middleware: getDefaultMiddleware => getDefaultMiddleware().concat(saveCart) });
