import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const submitReview = createAsyncThunk('reviews/create', async ({ productId, ...body }) => (await api.post(`/products/${productId}/reviews`, body)).data.data.review);
const reviewSlice = createSlice({ name: 'reviews', initialState: { status: 'idle', error: null, submitted: null }, reducers: { clearReview(state) { state.error = null; state.submitted = null; } }, extraReducers: builder => { builder.addCase(submitReview.pending, state => { state.status = 'loading'; state.error = null; }).addCase(submitReview.fulfilled, (state, action) => { state.status = 'idle'; state.submitted = action.payload; }).addCase(submitReview.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); } });
export const { clearReview } = reviewSlice.actions;
export default reviewSlice.reducer;
