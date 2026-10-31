import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchFavorites = createAsyncThunk('favorites/list', async () => (await api.get('/favorites')).data.data.items.filter(item => item.product));
export const addFavorite = createAsyncThunk('favorites/add', async id => (await api.post(`/favorites/${id}`)).data.data.item);
export const removeFavorite = createAsyncThunk('favorites/remove', async id => { await api.delete(`/favorites/${id}`); return id; });
const favoriteSlice = createSlice({ name: 'favorites', initialState: { items: [], status: 'idle', error: null }, reducers: { resetFavorites() { return { items: [], status: 'idle', error: null }; } }, extraReducers: builder => {
  builder.addCase(fetchFavorites.pending, state => { state.status = 'loading'; }).addCase(fetchFavorites.fulfilled, (state, action) => { state.status = 'idle'; state.items = action.payload; }).addCase(fetchFavorites.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(addFavorite.fulfilled, (state, action) => { if (!state.items.some(item => item.product?._id === action.payload.product?._id)) state.items.push(action.payload); })
    .addCase(removeFavorite.fulfilled, (state, action) => { state.items = state.items.filter(item => item.product?._id !== action.payload); });
} });
export const { resetFavorites } = favoriteSlice.actions;
export default favoriteSlice.reducer;
