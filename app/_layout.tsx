// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { ModalProvider } from '@/contexts/ModalContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { loading } = useAuth();

  if (loading) {
    // Mientras se carga la sesión, podrías mostrar un splash o nada
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Landing / pantalla inicial */}
          <Stack.Screen name="index" />
          {/* Grupo de tabs (protegido) */}
          <Stack.Screen name="(tabs)" />
          {/* Grupo de autenticación (login, register, verify-email) */}
          <Stack.Screen name="auth" />
          {/* Modal (opcional) */}
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ModalProvider>
    </ThemeProvider>
  );
}