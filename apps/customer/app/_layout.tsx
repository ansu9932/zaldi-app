import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../lib/brand';
import { useStore } from '../lib/store';
import { registerForPush } from '../lib/push';

export default function RootLayout() {
  const setPushToken = useStore((s) => s.setPushToken);

  useEffect(() => {
    registerForPush().then((token) => { if (token) setPushToken(token); });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.white },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'My Profile' }} />
        <Stack.Screen name="orders" options={{ title: 'Order history' }} />
        <Stack.Screen name="address" options={{ title: 'Delivery address' }} />
        <Stack.Screen name="track" options={{ title: 'Track order' }} />
        <Stack.Screen name="pay" options={{ title: 'Payment' }} />
        <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ title: 'My Favorites' }} />
        <Stack.Screen name="cart" options={{ title: 'Your Cart' }} />
        <Stack.Screen name="support" options={{ title: 'Help & Support' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
