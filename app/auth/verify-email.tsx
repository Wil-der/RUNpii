// app/auth/verify-email.tsx
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';

export default function VerifyEmailScreen() {
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setResending(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', 'Se ha reenviado el email de verificación. Revisa tu bandeja de entrada.');
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Botón para volver al login (cierra sesión) */}
      <Pressable style={styles.backButton} onPress={handleBackToLogin}>
        <Feather name="arrow-left" size={24} color="#1A1A1A" />
      </Pressable>

      <View style={styles.content}>
        {/* Ícono decorativo */}
        <View style={styles.iconWrapper}>
          <Feather name="mail" size={64} color="#F7C925" />
        </View>

        <Text style={styles.title}>Verifica tu Email</Text>

        <Text style={styles.message}>
          Te hemos enviado un email de confirmación a{' '}
          <Text style={styles.emailHighlight}>{user?.email}</Text>.
          {'\n\n'}
          Revisa tu bandeja de entrada y sigue las instrucciones para activar tu cuenta.
        </Text>

        <Pressable
          style={[styles.primaryButton, resending && styles.primaryButtonDisabled]}
          onPress={handleResendEmail}
          disabled={resending}
        >
          {resending ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.primaryButtonText}>Reenviar Email</Text>
          )}
        </Pressable>

        <Pressable onPress={handleBackToLogin}>
          <Text style={styles.linkText}>
            <Text style={styles.linkHighlight}>Volver al inicio de sesión</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailHighlight: {
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  primaryButton: {
    backgroundColor: '#F7C925',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  linkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  linkHighlight: {
    color: '#F7C925',
    fontFamily: 'Inter_600SemiBold',
  },
});