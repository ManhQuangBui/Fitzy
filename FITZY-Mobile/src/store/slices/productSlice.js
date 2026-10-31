import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchProducts = createAsyncThunk('products/list', async (params = {}) => (await api.get('/products', { params })).data.data);
export const fetchProduct = createAsyncThunk('products/detail', async id => (await api.get(`/products/${id}`)).data.data);
export const fetchCategories = createAsyncThunk('products/categories', async () => (await api.get('/categories')).data.data.items);
const productSlice = createSlice({ name: 'products', initialState: { items: [], pagination: null, categories: [], current: null, status: 'idle', error: null, detailStatus: 'idle', detailError: null }, reducers: { clearCurrent(state) { state.current = null; state.detailStatus = 'idle'; state.detailError = null; } }, extraReducers: builder => {
  builder.addCase(fetchProducts.pending, state => { state.status = 'loading'; state.error = null; }).addCase(fetchProducts.fulfilled, (state, action) => { state.status = 'idle'; state.items = Number(action.meta.arg?.page) > 1 ? [...state.items, ...action.payload.items] : action.payload.items; state.pagination = action.payload.pagination; }).addCase(fetchProducts.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(fetchProduct.pending, state => { state.detailStatus = 'loading'; state.detailError = null; state.current = null; }).addCase(fetchProduct.fulfilled, (state, action) => { state.current = action.payload; state.detailStatus = 'idle'; }).addCase(fetchProduct.rejected, (state, action) => { state.detailStatus = 'failed'; state.detailError = action.error.message; }).addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload; });
} });
export const { clearCurrent } = productSlice.actions;
export default productSlice.reducer;
