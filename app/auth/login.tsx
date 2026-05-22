// app/auth/login.tsx
import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';
import { useAppModal } from '@/contexts/ModalContext';
import { useRateLimit } from '@/hooks/useRateLimit';

const REMEMBER_KEY = '@runpii_remembered_email';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();
  const { showModal } = useAppModal();
  const { locked, remainingSeconds, recordFailedAttempt, resetAttempts } = useRateLimit();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(REMEMBER_KEY);
        if (stored) {
          const { email: savedEmail } = JSON.parse(stored);
          setEmail(savedEmail || '');
          setRememberMe(true);
        }
      } catch {}
    })();
  }, []);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('El email es obligatorio');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Formato de email inválido');
      valid = false;
    }

    if (!password) {
      setPasswordError('La contraseña es obligatoria');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validate() || locked) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      await recordFailedAttempt();
      showModal({
        title: 'Error de inicio de sesión',
        message: error.message,
        type: 'info',
      });
      return;
    }

    // Éxito: limpiar bloqueos
    await resetAttempts();

    try {
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_KEY, JSON.stringify({ email }));
      } else {
        await AsyncStorage.removeItem(REMEMBER_KEY);
      }
    } catch {}

    if (data.user && !data.user.email_confirmed_at) {
      router.replace('/auth/verify-email');
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.inner}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#1A1A1A" />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Bienvenido de nuevo</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!locked}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Contraseña"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry
              editable={!locked}
            />
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          {locked && (
            <Text style={styles.lockoutText}>
              Demasiados intentos. Reintenta en {remainingSeconds} s.
            </Text>
          )}

          <View style={styles.rememberRow}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: '#ccc', true: '#F7C925' }}
              thumbColor={rememberMe ? '#FFF' : '#FFF'}
              disabled={locked}
            />
            <Text style={styles.rememberText}>Recuérdame</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, (loading || locked) && styles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading || locked}
          >
            {loading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {locked ? `Bloqueado (${remainingSeconds}s)` : 'Iniciar sesión'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/auth/forgot-password')}>
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/auth/register')}>
          <Text style={styles.linkText}>
            ¿No tienes cuenta? <Text style={styles.linkHighlight}>Regístrate</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 14,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: -1,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#EF4444',
    marginTop: -8,
    marginLeft: 4,
  },
  lockoutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#6B7280',
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
    textAlign: 'center',
    marginTop: 12,
  },
  linkHighlight: {
    color: '#F7C925',
    fontWeight: '600',
  },
});