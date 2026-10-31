import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
export const hydrateCart = createAsyncThunk('cart/hydrate', async () => JSON.parse(await AsyncStorage.getItem('fitzy.cart') || '[]'));
export const checkPromotion = createAsyncThunk('cart/promotion', async ({ code, items }, { rejectWithValue }) => { try { return (await api.post('/promotions/check', { code, items })).data.data; } catch (error) { return rejectWithValue(error.message); } });
const cartSlice = createSlice({ name: 'cart', initialState: { items: [], selectedPromotion: null, error: null }, reducers: {
  addItem(state, action) { const incoming = action.payload; const existing = state.items.find(item => item.productId === incoming.productId && item.variantId === incoming.variantId); if (existing) existing.quantity = Math.min(20, existing.quantity + 1); else state.items.push({ ...incoming, quantity: 1, selected: true }); state.selectedPromotion = null; }
  ,addItems(state, action) { for (const incoming of action.payload) { const existing = state.items.find(item => item.productId === incoming.productId && item.variantId === incoming.variantId); if (existing) existing.quantity = Math.min(20, existing.quantity + incoming.quantity); else state.items.push({ ...incoming, quantity: Math.min(20, incoming.quantity), selected: true }); } state.selectedPromotion = null; state.error = null; }
  ,setQuantity(state, action) { const item = state.items.find(entry => entry.key === action.payload.key); if (item) item.quantity = Math.max(1, Math.min(20, Number(action.payload.quantity) || 1)); state.selectedPromotion = null; }
  ,toggleItem(state, action) { const item = state.items.find(entry => entry.key === action.payload); if (item) item.selected = !item.selected; state.selectedPromotion = null; }
  ,removeItem(state, action) { state.items = state.items.filter(item => item.key !== action.payload); state.selectedPromotion = null; }
  ,clearCart(state) { state.items = []; state.selectedPromotion = null; }
  ,clearPromotion(state) { state.selectedPromotion = null; state.error = null; }
  ,setError(state, action) { state.error = action.payload; }
  ,reset() { return { items: [], selectedPromotion: null, error: null }; }
}, extraReducers: builder => {
  builder.addCase(hydrateCart.fulfilled, (state, action) => { state.items = action.payload; })
    .addCase(checkPromotion.fulfilled, (state, action) => { state.selectedPromotion = action.payload; state.error = null; })
    .addCase(checkPromotion.rejected, (state, action) => { state.error = action.payload; state.selectedPromotion = null; });
} });

export const { addItem, addItems, setQuantity, toggleItem, removeItem, clearCart, clearPromotion, setError } = cartSlice.actions;
export const saveCart = store => next => action => { const result = next(action); if (action.type.startsWith('cart/') && !action.type.endsWith('/pending')) AsyncStorage.setItem('fitzy.cart', JSON.stringify(store.getState().cart.items)).catch(() => {}); return result; };
export default cartSlice.reducer;
