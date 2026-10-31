import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store';
import { firebaseSessionFailed, firebaseSessionLoading, firebaseSessionResolved } from './src/store/slices/authSlice';
import { hydrateCart } from './src/store/slices/cartSlice';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/constants/theme';
import { firebaseAuth, firebaseAuthConfigError, firebaseAuthInitializationError } from './src/config/firebase';
import { firebaseErrorMessage, isFirebaseAuthOperationActive, syncFirebaseSession } from './src/services/firebaseAuthService';
import { tokenStore } from './src/services/api';

function Bootstrap() {
  const dispatch = useDispatch(); const hydrated = useSelector(state => state.auth.hydrated);
  const role = useSelector(state => state.auth.user?.role);
  useEffect(() => {
    dispatch(hydrateCart());
    if (!firebaseAuth) {
      tokenStore.clear().catch(() => {}).finally(() => dispatch(firebaseSessionFailed(firebaseAuthInitializationError || firebaseAuthConfigError)));
      return undefined;
    }
    let active = true;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async firebaseUser => {
      if (!active || isFirebaseAuthOperationActive()) return;
      if (!firebaseUser) {
        await tokenStore.clear().catch(() => {});
        if (active) dispatch(firebaseSessionResolved(null));
        return;
      }
      dispatch(firebaseSessionLoading());
      try {
        const profile = await syncFirebaseSession(firebaseUser);
        if (active) dispatch(firebaseSessionResolved(profile));
      } catch (error) {
        await tokenStore.clear().catch(() => {});
        if (active) dispatch(firebaseSessionFailed(firebaseErrorMessage(error)));
      }
    }, error => { if (active) dispatch(firebaseSessionFailed(firebaseErrorMessage(error))); });
    return () => { active = false; unsubscribe(); };
  }, [dispatch]);
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: theme.colors.paper, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={theme.colors.ink} /></View>;
  return <NavigationContainer key={role === 'admin' ? 'admin-navigation' : 'store-navigation'} linking={{ prefixes: ['fitzy://'], config: { screens: { Orders: 'payment-result' } } }} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.colors.paper, card: theme.colors.paper, text: theme.colors.ink, primary: theme.colors.ink } }}><StatusBar barStyle="dark-content" backgroundColor={theme.colors.paper} /><AppNavigator /></NavigationContainer>;
}

export default function App() { return <Provider store={store}><Bootstrap /></Provider>; }
