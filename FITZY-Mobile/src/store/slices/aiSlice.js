import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const askStylist = createAsyncThunk('ai/stylist', async input => (await api.post('/ai/stylist', input)).data.data);
const aiSlice = createSlice({ name: 'ai', initialState: { answer: null, status: 'idle', error: null }, reducers: { clearAdvice(state) { state.answer = null; state.error = null; } }, extraReducers: builder => { builder.addCase(askStylist.pending, state => { state.status = 'loading'; state.error = null; }).addCase(askStylist.fulfilled, (state, action) => { state.status = 'idle'; state.answer = action.payload; }).addCase(askStylist.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; }); } });
export const { clearAdvice } = aiSlice.actions;
export default aiSlice.reducer;
