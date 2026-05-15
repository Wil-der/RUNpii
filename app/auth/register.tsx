// app/auth/register.tsx
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Feather } from '@expo/vector-icons';

type Role = 'customer' | 'courier';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'El nombre es obligatorio';
    if (!email.trim()) newErrors.email = 'El email es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Formato de email inválido';
    if (!password) newErrors.password = 'La contraseña es obligatoria';
    else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    if (role === 'courier' && !idCardNumber.trim()) newErrors.idCardNumber = 'El número de carnet es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);

    // Metadatos que pasan al trigger on_auth_user_created
    const metadata: any = {
      full_name: fullName,
      role,
      id_card_number: idCardNumber,
      vehicle_type: vehicleType || null,
    };

    // Subir avatar si se seleccionó
    if (avatarUri) {
      try {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        // El userId aún no lo tenemos, así que usamos un nombre temporal y luego lo renombraremos
        // Mejor: no subir avatar en el registro, se hará en el perfil. Así que omitimos la subida aquí.
        // metadata.avatar_url = ... // no podemos obtener la URL pública antes de registrarse.
        // Posponemos avatar para después del registro.
      } catch (error) {
        console.error('Error uploading avatar:', error);
        // Continuamos sin avatar
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      Alert.alert('Error de registro', error.message);
      setLoading(false);
      return;
    }

    // Si el usuario se creó correctamente, redirigir a verificar email
    if (data.user) {
      // Si había avatar seleccionado, podríamos subirlo aquí usando data.user.id
      // Pero es más seguro hacerlo en la pantalla de perfil. Por ahora, simplemente redirigimos.
      router.replace('/auth/verify-email');
    } else {
      // Esto no debería pasar
      Alert.alert('Error', 'No se pudo crear el usuario');
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#1A1A1A" />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Comienza a usar RUNpii en segundos</Text>
        </View>

        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarContainer} onPress={pickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <Feather name="camera" size={32} color="#9CA3AF" />
            )}
          </Pressable>
          <Text style={styles.avatarHint}>Foto de perfil (opcional)</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Feather name="user" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.fullName ? styles.inputError : null]}
              placeholder="Nombre completo"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={(text) => { setFullName(text); setErrors({ ...errors, fullName: '' }); }}
              autoCapitalize="words"
            />
          </View>
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

          <View style={styles.inputWrapper}>
            <Feather name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrors({ ...errors, email: '' }); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <View style={styles.inputWrapper}>
            <Feather name="lock" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Contraseña"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(text) => { setPassword(text); setErrors({ ...errors, password: '' }); }}
              secureTextEntry
            />
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <View style={styles.inputWrapper}>
            <Feather name="shield" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); setErrors({ ...errors, confirmPassword: '' }); }}
              secureTextEntry
            />
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          <Text style={styles.label}>Tipo de cuenta</Text>
          <View style={styles.roleSelector}>
            <Pressable
              style={[styles.roleButton, role === 'customer' && styles.roleButtonActive]}
              onPress={() => setRole('customer')}
            >
              <Feather name="user" size={24} color={role === 'customer' ? '#1A1A1A' : '#6B7280'} />
              <Text style={[styles.roleButtonText, role === 'customer' && styles.roleButtonTextActive]}>
                Cliente
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleButton, role === 'courier' && styles.roleButtonActive]}
              onPress={() => setRole('courier')}
            >
              <Feather name="truck" size={24} color={role === 'courier' ? '#1A1A1A' : '#6B7280'} />
              <Text style={[styles.roleButtonText, role === 'courier' && styles.roleButtonTextActive]}>
                Mensajero
              </Text>
            </Pressable>
          </View>

          {role === 'courier' && (
            <>
              <View style={styles.inputWrapper}>
                <Feather name="credit-card" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, errors.idCardNumber ? styles.inputError : null]}
                  placeholder="Número de carnet de identidad"
                  placeholderTextColor="#9CA3AF"
                  value={idCardNumber}
                  onChangeText={(text) => { setIdCardNumber(text); setErrors({ ...errors, idCardNumber: '' }); }}
                  autoCapitalize="none"
                />
              </View>
              {errors.idCardNumber ? <Text style={styles.errorText}>{errors.idCardNumber}</Text> : null}

              <Text style={styles.label}>Tipo de vehículo (opcional)</Text>
              <View style={styles.vehicleOptions}>
                {['bicycle', 'motorcycle', 'car', 'van', 'truck'].map((v) => (
                  <Pressable
                    key={v}
                    style={[styles.optionChip, vehicleType === v && styles.optionChipActive]}
                    onPress={() => setVehicleType(v)}
                  >
                    <Text style={[styles.optionChipText, vehicleType === v && styles.optionChipTextActive]}>
                      {v === 'bicycle' ? '🚲 Bicicleta' :
                       v === 'motorcycle' ? '🏍️ Moto' :
                       v === 'car' ? '🚗 Auto' :
                       v === 'van' ? '🚐 Van' : '🚛 Camión'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Pressable
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.push('/auth/login')}>
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta? <Text style={styles.linkHighlight}>Inicia sesión</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 80, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 60, left: 20, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#6B7280' },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#E5E7EB',
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', marginBottom: 8
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9CA3AF' },
  form: { gap: 16 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, backgroundColor: '#F9FAFB', paddingHorizontal: 12
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#1A1A1A', paddingVertical: 14 },
  inputError: { borderColor: '#EF4444', borderWidth: 1, borderRadius: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#EF4444', marginTop: -8, marginLeft: 4 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1A1A1A', marginTop: 8 },
  roleSelector: { flexDirection: 'row', gap: 12 },
  roleButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB'
  },
  roleButtonActive: { borderColor: '#F7C925', backgroundColor: '#F7C925' },
  roleButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#6B7280' },
  roleButtonTextActive: { color: '#1A1A1A' },
  vehicleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
    borderColor: '#E5E7EB', backgroundColor: '#FFFFFF'
  },
  optionChipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  optionChipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6B7280' },
  optionChipTextActive: { color: '#1A1A1A', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#F7C925', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginTop: 8
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 10 },
  linkHighlight: { color: '#F7C925', fontWeight: '600' },
});