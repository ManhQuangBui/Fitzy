import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
export const fetchOrders = createAsyncThunk('orders/list', async () => {
  const limit = 50;
  const readPage = async page => {
    const response = await api.get('/orders', { params: { page, limit } });
    const data = response?.data?.data;
    if (!data || !Array.isArray(data.items)) throw new Error('Dữ liệu lịch sử đơn hàng từ máy chủ không hợp lệ.');
    return data;
  };
  const first = await readPage(1);
  const totalPages = Number.isInteger(first.pagination?.pages) && first.pagination.pages > 0 ? first.pagination.pages : 1;
  const items = [...first.items];
  for (let page = 2; page <= totalPages; page += 1) {
    const result = await readPage(page);
    items.push(...result.items);
  }
  return [...new Map(items.filter(order => order && typeof order === 'object').map(order => [order._id || `${order.orderNumber}:${order.createdAt}`, { ...order, items: Array.isArray(order.items) ? order.items.filter(item => item && typeof item === 'object') : [] }])).values()];
});
export const placeOrder = createAsyncThunk('orders/create', async values => (await api.post('/orders', values)).data.data);
export const cancelOrder = createAsyncThunk('orders/cancel', async id => (await api.post(`/orders/${id}/cancel`)).data.data.order);
const orderSlice = createSlice({ name: 'orders', initialState: { items: [], latest: null, status: 'idle', error: null }, reducers: { clearOrderError(state) { state.error = null; }, resetOrders() { return { items: [], latest: null, status: 'idle', error: null }; } }, extraReducers: builder => {
  builder.addCase(fetchOrders.pending, state => { state.status = 'loading'; state.error = null; }).addCase(fetchOrders.fulfilled, (state, action) => { state.status = 'idle'; state.items = action.payload; }).addCase(fetchOrders.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(placeOrder.pending, state => { state.status = 'loading'; state.error = null; }).addCase(placeOrder.fulfilled, (state, action) => { state.status = 'idle'; state.latest = action.payload.order; state.items.unshift(action.payload.order); }).addCase(placeOrder.rejected, (state, action) => { state.status = 'failed'; state.error = action.error.message; })
    .addCase(cancelOrder.fulfilled, (state, action) => { const index = state.items.findIndex(item => item._id === action.payload._id); if (index >= 0) state.items[index] = action.payload; });
} });
export const { clearOrderError, resetOrders } = orderSlice.actions;
export default orderSlice.reducer;
