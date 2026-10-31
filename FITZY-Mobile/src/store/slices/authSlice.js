import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import api from '../../services/api';
import { firebaseErrorMessage, registerWithFirebase, signInWithFirebase, signOutFromFirebase } from '../../services/firebaseAuthService';
import { resetOrders } from './orderSlice';
import { resetFavorites } from './favoriteSlice';

export const signIn = createAsyncThunk('auth/signIn', async (credentials, { rejectWithValue }) => {
  try { return await signInWithFirebase(credentials); }
  catch (error) { return rejectWithValue(firebaseErrorMessage(error)); }
});

export const signUp = createAsyncThunk('auth/signUp', async (values, { rejectWithValue }) => {
  try { return await registerWithFirebase(values); }
  catch (error) { return rejectWithValue(firebaseErrorMessage(error)); }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (values, { rejectWithValue }) => {
  try { return (await api.patch('/users/me', values)).data.data.user; }
  catch (error) { return rejectWithValue(firebaseErrorMessage(error)); }
});

export const signOut = createAsyncThunk('auth/signOut', async (_, { dispatch, rejectWithValue }) => {
  try {
    await signOutFromFirebase();
    dispatch(resetOrders());
    dispatch(resetFavorites());
    return null;
  }
  catch (error) { return rejectWithValue(firebaseErrorMessage(error)); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, status: 'idle', hydrated: false, error: null },
  reducers: {
    clearAuthError(state) { state.error = null; },
    firebaseSessionLoading(state) { state.status = 'loading'; state.error = null; },
    firebaseSessionResolved(state, action) { state.user = action.payload; state.status = 'idle'; state.hydrated = true; state.error = null; },
    firebaseSessionFailed(state, action) { state.user = null; state.status = 'idle'; state.hydrated = true; state.error = action.payload; }
  },
  extraReducers: builder => {
    builder.addCase(updateProfile.fulfilled, (state, action) => { state.user = action.payload; state.status = 'idle'; state.error = null; })
      .addCase(updateProfile.pending, state => { state.status = 'loading'; state.error = null; })
      .addCase(updateProfile.rejected, (state, action) => { state.status = 'idle'; state.error = action.payload || action.error.message; })
      .addCase(signOut.fulfilled, state => { state.user = null; state.status = 'idle'; state.hydrated = true; state.error = null; })
      .addCase(signOut.rejected, (state, action) => { state.status = 'idle'; state.error = action.payload || action.error.message; })
      .addMatcher(action => [signIn.pending.type, signUp.pending.type].includes(action.type), state => { state.status = 'loading'; state.error = null; })
      .addMatcher(action => [signIn.fulfilled.type, signUp.fulfilled.type].includes(action.type), (state, action) => { state.user = action.payload; state.status = 'idle'; state.hydrated = true; state.error = null; })
      .addMatcher(action => [signIn.rejected.type, signUp.rejected.type].includes(action.type), (state, action) => { state.status = 'idle'; state.error = action.payload || action.error.message; });
  }
});

export const { clearAuthError, firebaseSessionLoading, firebaseSessionResolved, firebaseSessionFailed } = authSlice.actions;
export default authSlice.reducer;
