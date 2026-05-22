// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { ModalProvider } from '@/contexts/ModalContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import OfflineBanner from '@/components/OfflineBanner';
import * as Notifications from 'expo-notifications';

// Evitar que el splash se oculte automáticamente
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading: authLoading, isOffline } = useAuth();
  const router = useRouter();

  // Cargar fuentes Inter
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [appReady, setAppReady] = useState(false);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !authLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authLoading]);

  useEffect(() => {
    if (fontsLoaded && !authLoading) {
      setAppReady(true);
    }
  }, [fontsLoaded, authLoading]);

  // Manejar la navegación al tocar una notificación
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.order_id) {
        router.push(`/(tabs)/order-detail?order_id=${data.order_id}`);
      }
    });
    return () => subscription.remove();
  }, []);

  usePushNotifications();

  // Mientras las fuentes o la sesión cargan, no mostramos nada (el splash sigue visible)
  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }} onLayout={onLayoutRootView} />
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ModalProvider>
        <ProfileProvider>
          <OfflineBanner visible={isOffline} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ProfileProvider>
      </ModalProvider>
    </ThemeProvider>
  );
}