import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchPosts = createAsyncThunk('posts/list', async () => (await api.get('/posts')).data.data.items);
const postSlice = createSlice({ name: 'posts', initialState: { items: [], status: 'idle', error: null }, reducers: {}, extraReducers: builder => { builder.addCase(fetchPosts.pending, state => { state.status = 'loading'; }).addCase(fetchPosts.fulfilled, (state, action) => { state.status = 'idle'; state.items = action.payload; }).addCase(fetchPosts.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); } });
export default postSlice.reducer;
