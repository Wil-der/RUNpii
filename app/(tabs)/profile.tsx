// app/(tabs)/profile.tsx
import { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile, Profile } from '@/lib/supabase-operations';
import { supabase } from '@/lib/supabase';
import { useAppModal } from '@/contexts/ModalContext';
import { useProfileContext } from '@/contexts/ProfileContext';
import ProfileHeader from '@/components/ProfileHeader';
import PersonalInfoCard from '@/components/PersonalInfoCard';
import CourierInfoCard from '@/components/CourierInfoCard';
import { useProfileImage } from '@/hooks/useProfileImage';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile, refreshProfile } = useProfileContext();
  const { showModal } = useAppModal();
  const { pickAvatar, pickDoc, uploadingAvatar, uploadingDoc } = useProfileImage();

  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [roleSwitchLoading, setRoleSwitchLoading] = useState(false);

  const isVerified = profile?.verification_status === 'approved';

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!form.full_name?.trim()) {
      showModal({ title: 'Error', message: 'El nombre es obligatorio.', type: 'info' });
      return;
    }
    try {
      const updates: Partial<Profile> = {
        full_name: form.full_name.trim(),
        address: form.address?.trim() || null,
        avatar_url: form.avatar_url || null,
      };
      if (profile.role === 'courier') {
        if (!isVerified) {
          updates.id_card_number = form.id_card_number?.trim() || null;
        }
        updates.vehicle_type = form.vehicle_type;
        updates.max_package_size = form.max_package_size;
        updates.max_weight_kg = form.max_weight_kg ?? null;
        updates.price_per_km = form.price_per_km ?? null;
      }
      const { error } = await updateProfile(profile.id, updates);
      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      showModal({ title: 'Actualizado', message: 'Perfil guardado correctamente.', type: 'info' });
    } catch (e: any) {
      showModal({ title: 'Error', message: e.message, type: 'info' });
    }
  };

  const executeRoleSwitch = async (targetRole: string) => {
    if (!profile) return;
    setRoleSwitchLoading(true);
    try {
      const updates: Partial<Profile> = { role: targetRole as any };
      if (targetRole === 'courier') {
        updates.verification_status = 'pending';
        updates.is_active = false;
        updates.availability_status = 'offline';
      } else {
        updates.is_active = false;
        updates.availability_status = 'offline';
      }
      await updateProfile(profile.id, updates);
      await refreshProfile();
      showModal({
        title: 'Rol actualizado',
        message: `Ahora eres ${targetRole === 'courier' ? 'Mensajero' : 'Cliente'}.`,
        type: 'info',
      });
    } catch (e: any) {
      showModal({ title: 'Error', message: e.message, type: 'info' });
    } finally {
      setRoleSwitchLoading(false);
    }
  };

  const handleSwitchRole = () => {
    if (!profile) return;
    const target = profile.role === 'customer' ? 'courier' : 'customer';
    if (target === 'courier') {
      showModal({
        title: 'Convertirse en Mensajero',
        message: 'Deberás completar la verificación para empezar a recibir pedidos.',
        type: 'confirm',
        confirmText: 'Continuar',
        cancelText: 'Cancelar',
        onConfirm: () => executeRoleSwitch(target),
      });
    } else {
      supabase
        .from('orders')
        .select('id')
        .eq('courier_id', profile.id)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .then(({ data: active, error }) => {
          if (error) {
            showModal({ title: 'Error', message: 'No se pudo verificar.', type: 'info' });
            return;
          }
          if (active && active.length > 0) {
            showModal({
              title: 'No disponible',
              message: `Tienes ${active.length} pedido(s) activo(s). Finalízalos antes de cambiar.`,
              type: 'info',
            });
          } else {
            showModal({
              title: 'Cambiar a Cliente',
              message: 'Dejarás de recibir pedidos como mensajero.',
              type: 'confirm',
              confirmText: 'Cambiar',
              cancelText: 'Cancelar',
              onConfirm: () => executeRoleSwitch(target),
            });
          }
        });
    }
  };

  const setAvailability = async (status: 'available' | 'busy') => {
    if (!profile) return;
    try {
      await updateProfile(profile.id, { availability_status: status });
      await refreshProfile();
    } catch (e: any) {
      showModal({ title: 'Error', message: e.message, type: 'info' });
    }
  };

  const actionChips = [
    {
      key: 'edit',
      label: isEditing ? 'Cancelar' : 'Editar',
      icon: 'edit-2' as const,
      color: '#F7C925',
      onPress: () => setIsEditing(!isEditing),
    },
    {
      key: 'role',
      label: profile?.role === 'customer' ? 'Ser Mensajero' : 'Ser Cliente',
      icon: (profile?.role === 'customer' ? 'truck' : 'user') as const,
      color: '#3B82F6',
      onPress: handleSwitchRole,
    },
  ];

  if (!profile)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
      >
        <ProfileHeader
          avatarUrl={form.avatar_url}
          fullName={profile.full_name}
          email={user?.email}
          role={profile.role}
          uploading={uploadingAvatar}
          onPressAvatar={() => pickAvatar((url) => setForm((prev) => ({ ...prev, avatar_url: url })))}
        />

        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {actionChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[styles.actionChip, { backgroundColor: chip.color }]}
              onPress={chip.onPress}
              disabled={roleSwitchLoading}
              accessibilityRole="button"
              accessibilityLabel={chip.label}
              accessibilityHint={`Pulsa para ${chip.label.toLowerCase()}`}
            >
              <Feather name={chip.icon} size={16} color="#FFF" />
              <Text style={styles.actionChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <PersonalInfoCard
            isEditing={isEditing}
            fullName={form.full_name ?? ''}
            address={form.address}
            onFullNameChange={(t) => setForm({ ...form, full_name: t })}
            onAddressChange={(t) => setForm({ ...form, address: t })}
            onSave={handleSaveProfile}
            onCancel={() => setIsEditing(false)}
          />
        </View>

        {profile.role === 'courier' && (
          <>
            <View style={styles.section}>
              <CourierInfoCard
                isEditing={isEditing}
                isVerified={isVerified}
                verificationStatus={profile.verification_status}
                idCardNumber={form.id_card_number}
                vehicleType={form.vehicle_type}
                maxPackageSize={form.max_package_size}
                maxWeightKg={form.max_weight_kg}
                pricePerKm={form.price_per_km}
                isActive={profile.is_active}
                uploadingDoc={uploadingDoc}
                idCardFrontUrl={profile.id_card_front_url}
                idCardBackUrl={profile.id_card_back_url}
                onIdCardNumberChange={(t) => setForm({ ...form, id_card_number: t })}
                onVehicleChange={(v) => setForm({ ...form, vehicle_type: v as any })}
                onSizeChange={(s) => setForm({ ...form, max_package_size: s as any })}
                onWeightChange={(t) => setForm({ ...form, max_weight_kg: t ? parseFloat(t) : null })}
                onPriceChange={(t) => setForm({ ...form, price_per_km: t ? parseFloat(t) : null })}
                onPickDoc={(side) => pickDoc(side, (url, col) => setForm((prev) => ({ ...prev, [col]: url })))}
                onToggleActive={() => {}}
              />
            </View>

            {isVerified && (
              <View style={styles.section}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Disponibilidad</Text>
                  <View style={styles.availabilityRow}>
                    <TouchableOpacity
                      style={[styles.availabilityChip, profile.availability_status === 'available' && styles.availabilityChipActive]}
                      onPress={() => setAvailability('available')}
                      accessibilityRole="button"
                      accessibilityLabel="Disponible"
                      accessibilityHint="Pulsa para ponerte disponible y recibir pedidos"
                    >
                      <Text style={[styles.availabilityChipText, profile.availability_status === 'available' && styles.availabilityChipTextActive]}>
                        Disponible
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.availabilityChip, profile.availability_status === 'busy' && styles.availabilityChipActive]}
                      onPress={() => setAvailability('busy')}
                      accessibilityRole="button"
                      accessibilityLabel="Ocupado"
                      accessibilityHint="Pulsa para ponerte ocupado y dejar de recibir pedidos"
                    >
                      <Text style={[styles.availabilityChipText, profile.availability_status === 'busy' && styles.availabilityChipTextActive]}>
                        Ocupado
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.availabilityHint}>
                    {profile.availability_status === 'available' ? 'Estás recibiendo pedidos' : 'No estás recibiendo pedidos nuevos'}
                  </Text>
                </View>
              </View>
            )}

            {!isVerified && (
              <View style={styles.section}>
                <Text style={styles.hint}>Verificación requerida para recibir pedidos.</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.destructiveContainer}>
          <TouchableOpacity
            style={styles.destructiveButton}
            onPress={() => signOut()}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            accessibilityHint="Pulsa para cerrar sesión en la aplicación"
          >
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text style={styles.destructiveText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentScroll: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, gap: 6,
  },
  actionChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A', marginBottom: 12 },
  availabilityRow: { flexDirection: 'row', gap: 12 },
  availabilityChip: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center',
  },
  availabilityChipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  availabilityChipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  availabilityChipTextActive: { color: '#1A1A1A' },
  availabilityHint: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 8, textAlign: 'center',
  },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#F59E0B', textAlign: 'center' },
  destructiveContainer: {
    marginHorizontal: 16, marginTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16,
  },
  destructiveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8,
  },
  destructiveText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#EF4444' },
});