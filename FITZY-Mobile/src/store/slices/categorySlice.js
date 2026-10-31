import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchCategories = createAsyncThunk('categories/list', async () => (await api.get('/categories')).data.data.items);
const categorySlice = createSlice({ name: 'categories', initialState: { items: [], status: 'idle', error: null }, reducers: {}, extraReducers: builder => { builder.addCase(fetchCategories.fulfilled, (state, action) => { state.items = action.payload; state.status = 'idle'; }).addCase(fetchCategories.pending, state => { state.status = 'loading'; }).addCase(fetchCategories.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); } });
export default categorySlice.reducer;
