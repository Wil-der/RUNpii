// app/(tabs)/profile.tsx
import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile, Profile } from '@/lib/supabase-operations';
import { supabase } from '@/lib/supabase';

const MAX_AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.7;

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'front' | 'back' | null>(null);
  const [showRoleSwitchConfirm, setShowRoleSwitchConfirm] = useState(false);
  const [roleSwitchLoading, setRoleSwitchLoading] = useState(false);

  // Estados del formulario de edición
  const [form, setForm] = useState<Partial<Profile>>({});

  // Inicializar formulario cuando profile cambia
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        address: profile.address ?? '',
        avatar_url: profile.avatar_url ?? '',
        id_card_number: profile.id_card_number ?? '',
        vehicle_type: profile.vehicle_type ?? null,
        max_package_size: profile.max_package_size ?? null,
        max_weight_kg: profile.max_weight_kg ?? null,
        price_per_km: profile.price_per_km ?? null,
      });
    }
  }, [profile]);

  // Refresco manual
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshProfile?.();
    setIsRefreshing(false);
  }, [refreshProfile]);

  // Helpers de formateo (igual que antes)
  const formatRole = (role: string | undefined) => {
    switch (role) {
      case 'customer': return 'Cliente';
      case 'courier': return 'Mensajero';
      case 'admin': return 'Administrador';
      default: return role || 'No definido';
    }
  };

  const formatVerificationStatus = (status: string | undefined) => {
    switch (status) {
      case 'pending': return { text: '⏳ Pendiente', color: '#FFA500' };
      case 'approved': return { text: '✅ Aprobado', color: '#4CAF50' };
      case 'rejected': return { text: '❌ Rechazado', color: '#F44336' };
      default: return { text: status || 'Desconocido', color: '#999' };
    }
  };

  const formatAvailabilityStatus = (status: string | undefined) => {
    switch (status) {
      case 'available': return '🟢 Disponible';
      case 'pending_acceptance': return '🟠 Esperando aceptación';
      case 'busy': return '🟡 Ocupado';
      case 'offline': return '⬛ Desconectado';
      default: return status || 'Desconocido';
    }
  };

  const formatVehicleType = (vehicle: string | undefined) => {
    switch (vehicle) {
      case 'bicycle': return '🚲 Bicicleta';
      case 'motorcycle': return '🏍️ Motocicleta';
      case 'car': return '🚗 Auto';
      case 'van': return '🚐 Van';
      case 'truck': return '🚛 Camión';
      default: return vehicle || 'No especificado';
    }
  };

  const formatPackageSize = (size: string | undefined) => {
    switch (size) {
      case 'small': return '📦 Pequeño';
      case 'medium': return '📦 Mediano';
      case 'large': return '📦 Grande';
      case 'extra_large': return '📦 Extra Grande';
      default: return size || 'No especificado';
    }
  };

  // Guardar cambios del perfil
  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!form.full_name?.trim()) {
      Alert.alert('Error', 'El nombre completo es obligatorio');
      return;
    }

    try {
      const updates: Partial<Profile> = {
        full_name: form.full_name.trim(),
        address: form.address?.trim() || null,
        avatar_url: form.avatar_url || null,
      };

      if (profile.role === 'courier') {
        updates.id_card_number = form.id_card_number?.trim() || null;
        updates.vehicle_type = form.vehicle_type;
        updates.max_package_size = form.max_package_size;
        updates.max_weight_kg = form.max_weight_kg ?? null;
        updates.price_per_km = form.price_per_km ?? null;
      }

      const { error } = await updateProfile(profile.id, updates);
      if (error) throw error;

      await refreshProfile?.();
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    }
  };

  // Cambio de avatar
  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso denegado', 'Necesitas permitir acceso a la galería');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: AVATAR_QUALITY,
      });
      if (result.canceled || !result.assets[0] || !profile) return;

      setUploadingAvatar(true);
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileName = `${profile.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, avatar_url: data.publicUrl }));
        await updateProfile(profile.id, { avatar_url: data.publicUrl });
        await refreshProfile?.();
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Subir fotos del carnet (frontal o trasera)
  const pickDocumentImage = async (side: 'front' | 'back') => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0] || !profile) return;

      setUploadingDoc(side);
      const imageUri = result.assets[0].uri;
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileName = `${profile.id}/id_${side}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('id_docs')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('id_docs').getPublicUrl(fileName);
      const column = side === 'front' ? 'id_card_front_url' : 'id_card_back_url';
      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, [column]: data.publicUrl }));
        await updateProfile(profile.id, { [column]: data.publicUrl });
        await refreshProfile?.();
        Alert.alert('Éxito', `Foto del carnet (${side === 'front' ? 'frontal' : 'trasero'}) subida`);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo subir la foto del documento');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Cambio de rol
  const handleSwitchRole = async () => {
    if (!profile) return;
    const targetRole = profile.role === 'customer' ? 'courier' : 'customer';

    // Si cambia a courier, verificar si tiene pedidos activos como cliente (simple)
    if (targetRole === 'courier') {
      // Por ahora solo mostramos confirmación; la validación real vendrá luego
      Alert.alert(
        'Cambiar a Mensajero',
        'Podrás comenzar a recibir pedidos después de que tu cuenta sea verificada. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Continuar', onPress: () => executeRoleSwitch(targetRole) },
        ]
      );
    } else {
      // Cambiar a cliente: verifica que no tenga pedidos activos como mensajero
      const { data: activeOrders, error } = await supabase
        .from('orders')
        .select('id')
        .eq('courier_id', profile.id)
        .in('status', ['assigned', 'picked_up', 'in_transit']);
      if (error) {
        Alert.alert('Error', 'No se pudo verificar tus pedidos activos');
        return;
      }
      if (activeOrders && activeOrders.length > 0) {
        Alert.alert(
          'No puedes cambiar de rol',
          `Tienes ${activeOrders.length} pedido(s) activo(s) como mensajero. Finalízalos antes de cambiar a cliente.`
        );
        return;
      }
      Alert.alert(
        'Cambiar a Cliente',
        'Dejarás de recibir pedidos como mensajero. ¿Confirmas?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cambiar', onPress: () => executeRoleSwitch(targetRole) },
        ]
      );
    }
  };

  const executeRoleSwitch = async (targetRole: string) => {
    if (!profile) return;
    setRoleSwitchLoading(true);
    try {
      const updates: Partial<Profile> = {
        role: targetRole as any,
      };
      if (targetRole === 'courier') {
        // Si se hace mensajero por primera vez, resetear verificación
        updates.verification_status = 'pending';
        updates.is_active = false;
        updates.availability_status = 'offline';
      } else {
        updates.is_active = false;
        updates.availability_status = 'offline';
      }
      const { error } = await updateProfile(profile.id, updates);
      if (error) throw error;
      await refreshProfile?.();
      Alert.alert('Rol actualizado', `Ahora eres ${targetRole === 'courier' ? 'Mensajero' : 'Cliente'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRoleSwitchLoading(false);
      setShowRoleSwitchConfirm(false);
    }
  };

  // Control de estado activo/inactivo (mensajero)
  const toggleActiveStatus = async () => {
    if (!profile) return;
    const newActive = !profile.is_active;
    const newAvailability = newActive ? 'available' : 'offline';

    try {
      const { error } = await updateProfile(profile.id, {
        is_active: newActive,
        availability_status: newAvailability as any,
      });
      if (error) throw error;
      await refreshProfile?.();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Verificación de completitud (solo visual)
  const getProfileCompletion = () => {
    if (!profile) return 0;
    let filled = 0;
    const fields = ['full_name', 'address'];
    if (profile.role === 'courier') fields.push('id_card_number', 'vehicle_type', 'max_package_size', 'max_weight_kg', 'price_per_km');
    fields.forEach((f) => {
      if ((profile as any)[f] !== null && (profile as any)[f] !== '') filled++;
    });
    return Math.round((filled / fields.length) * 100);
  };

  if (!profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
      >
        {/* Cabecera */}
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
            <View style={styles.avatarContainer}>
              {form.avatar_url ? (
                <Image source={{ uri: form.avatar_url }} style={styles.avatar} />
              ) : (
                <Feather name="user" size={48} color="#999" />
              )}
              {uploadingAvatar && <ActivityIndicator style={styles.avatarLoader} color="#F7C925" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{profile.full_name || 'Sin nombre'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{formatRole(profile.role)}</Text>
          </View>
          {profile.role === 'courier' && (
            <View style={styles.verificationRow}>
              <Text style={{ color: formatVerificationStatus(profile.verification_status).color }}>
                {formatVerificationStatus(profile.verification_status).text}
              </Text>
            </View>
          )}
        </View>

        {/* Completitud */}
        <View style={styles.completionContainer}>
          <View style={styles.completionBarBg}>
            <View style={[styles.completionBarFill, { width: `${getProfileCompletion()}%`, backgroundColor: getProfileCompletion() === 100 ? '#4CAF50' : '#F7C925' }]} />
          </View>
          <Text style={styles.completionText}>Perfil {getProfileCompletion()}% completo</Text>
        </View>

        {/* Sección de estado del mensajero (solo courier) */}
        {profile.role === 'courier' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estado de servicio</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Disponibilidad</Text>
                <Text style={[styles.infoValue, { color: profile.availability_status === 'available' ? '#4CAF50' : '#999' }]}>
                  {formatAvailabilityStatus(profile.availability_status)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Activo para recibir pedidos</Text>
                <Switch
                  value={profile.is_active}
                  onValueChange={toggleActiveStatus}
                  trackColor={{ false: '#ccc', true: '#F7C925' }}
                  disabled={profile.verification_status !== 'approved'}
                />
              </View>
              {profile.verification_status !== 'approved' && (
                <Text style={styles.hint}>Debes estar verificado para activarte</Text>
              )}
            </View>
          </View>
        )}

        {/* Sección de verificación (solo mensajero) */}
        {profile.role === 'courier' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verificación de identidad</Text>
            <View style={styles.card}>
              <Text style={styles.verificationStep}>
                {profile.verification_status === 'pending' && '⏳ Tus documentos están siendo revisados.'}
                {profile.verification_status === 'approved' && '✅ Verificación completada.'}
                {profile.verification_status === 'rejected' && '❌ Verificación rechazada. Contacta al administrador.'}
              </Text>
              <View style={styles.docRow}>
                <TouchableOpacity
                  style={styles.docButton}
                  onPress={() => pickDocumentImage('front')}
                  disabled={uploadingDoc !== null}
                >
                  {profile.id_card_front_url ? (
                    <Image source={{ uri: profile.id_card_front_url }} style={styles.docImage} />
                  ) : (
                    <Feather name="camera" size={32} color="#999" />
                  )}
                  <Text style={styles.docLabel}>Frontal</Text>
                  {uploadingDoc === 'front' && <ActivityIndicator />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.docButton}
                  onPress={() => pickDocumentImage('back')}
                  disabled={uploadingDoc !== null}
                >
                  {profile.id_card_back_url ? (
                    <Image source={{ uri: profile.id_card_back_url }} style={styles.docImage} />
                  ) : (
                    <Feather name="camera" size={32} color="#999" />
                  )}
                  <Text style={styles.docLabel}>Trasero</Text>
                  {uploadingDoc === 'back' && <ActivityIndicator />}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Información personal (con edición inline) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Información personal</Text>
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Feather name={isEditing ? 'x' : 'edit-2'} size={20} color="#F7C925" />
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  value={form.full_name}
                  onChangeText={(t) => setForm({ ...form, full_name: t })}
                  placeholder="Nombre completo"
                />
                <TextInput
                  style={styles.input}
                  value={form.address ?? ''}
                  onChangeText={(t) => setForm({ ...form, address: t })}
                  placeholder="Dirección"
                  multiline
                />
                {profile.role === 'courier' && (
                  <>
                    <TextInput
                      style={styles.input}
                      value={form.id_card_number ?? ''}
                      onChangeText={(t) => setForm({ ...form, id_card_number: t })}
                      placeholder="Número de carnet"
                    />
                    <Text style={styles.fieldLabel}>Vehículo</Text>
                    <View style={styles.chipRow}>
                      {['bicycle', 'motorcycle', 'car', 'van', 'truck'].map((v) => (
                        <TouchableOpacity
                          key={v}
                          style={[styles.chip, form.vehicle_type === v && styles.chipActive]}
                          onPress={() => setForm({ ...form, vehicle_type: v as any })}
                        >
                          <Text style={[styles.chipText, form.vehicle_type === v && styles.chipTextActive]}>
                            {formatVehicleType(v)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.fieldLabel}>Tamaño máximo</Text>
                    <View style={styles.chipRow}>
                      {['small', 'medium', 'large', 'extra_large'].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.chip, form.max_package_size === s && styles.chipActive]}
                          onPress={() => setForm({ ...form, max_package_size: s as any })}
                        >
                          <Text style={[styles.chipText, form.max_package_size === s && styles.chipTextActive]}>
                            {formatPackageSize(s)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput
                      style={styles.input}
                      value={form.max_weight_kg?.toString() ?? ''}
                      onChangeText={(t) => setForm({ ...form, max_weight_kg: t ? parseFloat(t) : null })}
                      placeholder="Peso máximo (kg)"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={styles.input}
                      value={form.price_per_km?.toString() ?? ''}
                      onChangeText={(t) => setForm({ ...form, price_per_km: t ? parseFloat(t) : null })}
                      placeholder="Tarifa por km ($)"
                      keyboardType="numeric"
                    />
                  </>
                )}
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                  <Text style={styles.saveButtonText}>Guardar cambios</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nombre</Text>
                  <Text style={styles.infoValue}>{profile.full_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{profile.address || '—'}</Text>
                </View>
                {profile.role === 'courier' && (
                  <>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Carnet</Text>
                      <Text style={styles.infoValue}>{profile.id_card_number || '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Vehículo</Text>
                      <Text style={styles.infoValue}>{formatVehicleType(profile.vehicle_type)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tamaño máx.</Text>
                      <Text style={styles.infoValue}>{formatPackageSize(profile.max_package_size)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Peso máx.</Text>
                      <Text style={styles.infoValue}>{profile.max_weight_kg ? `${profile.max_weight_kg} kg` : '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tarifa/km</Text>
                      <Text style={styles.infoValue}>{profile.price_per_km ? `$${profile.price_per_km.toFixed(2)}` : '—'}</Text>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* Cambio de rol */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.roleSwitchButton} onPress={handleSwitchRole} disabled={roleSwitchLoading}>
            {roleSwitchLoading ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.roleSwitchText}>
                {profile.role === 'customer' ? 'Convertirse en Mensajero' : 'Cambiar a Cliente'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => signOut()}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#F7C925',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarLoader: { position: 'absolute' },
  name: { fontFamily: 'Inter_700Bold', fontSize: 22, color: '#1A1A1A', marginBottom: 4 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#333', marginBottom: 8 },
  roleBadge: { backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#F7C925' },
  verificationRow: { marginTop: 8 },
  completionContainer: { paddingHorizontal: 20, marginBottom: 20 },
  completionBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 },
  completionBarFill: { height: '100%', borderRadius: 3 },
  completionText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 6 },
  section: { marginBottom: 20, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: '#E5E7EB', borderBottomWidth: 1 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  infoValue: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1A1A1A' },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#F59E0B', marginTop: 6 },
  verificationStep: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1A1A1A', marginBottom: 12 },
  docRow: { flexDirection: 'row', justifyContent: 'space-around' },
  docButton: {
    width: 100, height: 100, backgroundColor: '#E5E7EB', borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  docImage: { width: 100, height: 100, borderRadius: 8 },
  docLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 4 },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 12,
  },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1A1A1A', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  chipText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280' },
  chipTextActive: { color: '#1A1A1A', fontWeight: '600' },
  saveButton: { backgroundColor: '#F7C925', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  roleSwitchButton: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#F7C925',
  },
  roleSwitchText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#F7C925' },
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  logoutText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#EF4444', marginLeft: 8 },
});