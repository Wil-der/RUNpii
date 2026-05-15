// app/index.tsx
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function LandingScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Si el usuario ya confirmó su email, va a los tabs; si no, a verificar
        if (user.email_confirmed_at) {
          router.replace('/(tabs)');
        } else {
          router.replace('/auth/verify-email');
        }
      }
      // Si no hay usuario, se queda en esta landing
    }
  }, [loading, user]);

  // Mientras se comprueba la sesión, mostramos un spinner
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  // Si hay sesión, la redirección ocurre en el useEffect; mientras tanto no mostramos nada
  if (user) {
    return null;
  }

  // Landing page para visitantes
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 },
      ]}
    >
      {/* Logo y eslogan */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Feather name="package" size={48} color="#F7C925" />
          <Text style={styles.logoText}>RUNpii</Text>
        </View>
        <Text style={styles.tagline}>
          Mensajería colaborativa, rápida y segura.
        </Text>
      </View>

      {/* Beneficios */}
      <View style={styles.benefits}>
        <View style={styles.benefitCard}>
          <Feather name="zap" size={32} color="#F7C925" />
          <Text style={styles.benefitTitle}>Rápido</Text>
          <Text style={styles.benefitDesc}>
            Entrega en el mismo día con mensajeros locales disponibles en tiempo real.
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Feather name="shield" size={32} color="#F7C925" />
          <Text style={styles.benefitTitle}>Seguro</Text>
          <Text style={styles.benefitDesc}>
            Código de verificación + foto de comprobante en cada entrega. Tú decides quién te ayuda.
          </Text>
        </View>

        <View style={styles.benefitCard}>
          <Feather name="package" size={32} color="#F7C925" />
          <Text style={styles.benefitTitle}>Verificado</Text>
          <Text style={styles.benefitDesc}>
            Todos los mensajeros pasan por verificación de identidad. Reputación transparente.
          </Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actions}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/auth/register')}
        >
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.secondaryButtonText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  logoText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: '#1A1A1A',
  },
  tagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  benefits: {
    gap: 16,
    marginBottom: 50,
    width: '100%',
  },
  benefitCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  benefitTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 6,
  },
  benefitDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#F7C925',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F7C925',
  },
  secondaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F7C925',
  },
});