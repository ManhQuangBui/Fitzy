import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const validatePromotion = createAsyncThunk('promotions/check', async payload => (await api.post('/promotions/check', payload)).data.data);
const promotionSlice = createSlice({ name: 'promotions', initialState: { result: null, status: 'idle', error: null }, reducers: { clearPromotionResult(state) { state.result = null; state.error = null; } }, extraReducers: builder => { builder.addCase(validatePromotion.pending, state => { state.status = 'loading'; state.error = null; }).addCase(validatePromotion.fulfilled, (state, action) => { state.status = 'idle'; state.result = action.payload; }).addCase(validatePromotion.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); } });
export const { clearPromotionResult } = promotionSlice.actions;
export default promotionSlice.reducer;
