// app/auth/verify-email.tsx
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useAppModal } from '@/contexts/ModalContext';

export default function VerifyEmailScreen() {
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showModal } = useAppModal();

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    setResending(false);

    if (error) {
      showModal({
        title: 'Error',
        message: error.message,
        type: 'info',
      });
    } else {
      showModal({
        title: 'Reenviado',
        message: 'Se ha reenviado el email de verificación. Revisa tu bandeja de entrada.',
        type: 'info',
      });
    }
  };

  const handleBackToLogin = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      {/* Cabecera integrada */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToLogin}>
          <Feather name="arrow-left" size={22} color="#F7C925" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verificar Email</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Contenido centrado */}
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Feather name="mail" size={56} color="#F7C925" />
        </View>

        <Text style={styles.title}>Confirma tu cuenta</Text>

        <Text style={styles.message}>
          Enviamos un enlace de verificación a{' '}
          <Text style={styles.emailHighlight}>{user?.email}</Text>.
          {'\n\n'}
          Revisa tu bandeja de entrada y sigue las instrucciones para activar tu cuenta.
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, resending && styles.primaryButtonDisabled]}
          onPress={handleResendEmail}
          disabled={resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.primaryButtonText}>Reenviar email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBackToLogin}>
          <Text style={styles.linkText}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  emailHighlight: {
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
  },
  primaryButton: {
    backgroundColor: '#F7C925',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
  },
  linkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F7C925',
  },
});