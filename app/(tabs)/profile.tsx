// app/(tabs)/profile.tsx
import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, KeyboardAvoidingView, Platform, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile, Profile } from '@/lib/supabase-operations';
import { supabase } from '@/lib/supabase';
import { useAppModal } from '@/contexts/ModalContext';
import ProfileHeader from '@/components/ProfileHeader';
import PersonalInfoCard from '@/components/PersonalInfoCard';
import CourierInfoCard from '@/components/CourierInfoCard';
import { useProfileImage } from '@/hooks/useProfileImage';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { showModal } = useAppModal();
  const { pickAvatar, pickDoc, uploadingAvatar, uploadingDoc } = useProfileImage();

  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [roleSwitchLoading, setRoleSwitchLoading] = useState(false);

  const isVerified = profile?.verification_status === 'approved';

  useEffect(() => { if (profile) setForm({ full_name: profile.full_name ?? '', address: profile.address ?? '', avatar_url: profile.avatar_url ?? '', id_card_number: profile.id_card_number ?? '', vehicle_type: profile.vehicle_type ?? null, max_package_size: profile.max_package_size ?? null, max_weight_kg: profile.max_weight_kg ?? null, price_per_km: profile.price_per_km ?? null }); }, [profile]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await refreshProfile?.(); setRefreshing(false); }, [refreshProfile]);

  const handleSaveProfile = async () => { /* lógica existente, omitida por brevedad */ };
  const handleSwitchRole = () => { /* lógica existente */ };
  const toggleActive = async () => { /* lógica existente */ };

  const actionChips = [
    { key: 'edit', label: isEditing ? 'Cancelar' : 'Editar', icon: 'edit-2' as const, color: '#F7C925', onPress: () => setIsEditing(!isEditing) },
    { key: 'role', label: profile?.role === 'customer' ? 'Ser Mensajero' : 'Ser Cliente', icon: profile?.role === 'customer' ? 'truck' : 'user' as const, color: '#3B82F6', onPress: handleSwitchRole },
  ];

  if (!profile) return <View style={styles.centered}><ActivityIndicator size="large" color="#F7C925" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}>
        <ProfileHeader avatarUrl={form.avatar_url} fullName={profile.full_name} email={user?.email} role={profile.role} uploading={uploadingAvatar} onPressAvatar={() => pickAvatar((url) => setForm(prev => ({ ...prev, avatar_url: url })))} />
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
          {actionChips.map(chip => (
            <TouchableOpacity key={chip.key} style={[styles.actionChip, { backgroundColor: chip.color }]} onPress={chip.onPress} disabled={roleSwitchLoading}>
              <Feather name={chip.icon} size={16} color="#FFF" />
              <Text style={styles.actionChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.section}>
          <PersonalInfoCard isEditing={isEditing} fullName={form.full_name ?? ''} address={form.address} onFullNameChange={(t) => setForm({...form, full_name: t})} onAddressChange={(t) => setForm({...form, address: t})} onSave={handleSaveProfile} onCancel={() => setIsEditing(false)} />
        </View>
        {profile.role === 'courier' && (
          <>
            <View style={styles.section}>
              <CourierInfoCard isEditing={isEditing} isVerified={isVerified} verificationStatus={profile.verification_status} idCardNumber={form.id_card_number} vehicleType={form.vehicle_type} maxPackageSize={form.max_package_size} maxWeightKg={form.max_weight_kg} pricePerKm={form.price_per_km} isActive={profile.is_active} uploadingDoc={uploadingDoc} idCardFrontUrl={profile.id_card_front_url} idCardBackUrl={profile.id_card_back_url} onIdCardNumberChange={(t) => setForm({...form, id_card_number: t})} onVehicleChange={(v) => setForm({...form, vehicle_type: v as any})} onSizeChange={(s) => setForm({...form, max_package_size: s as any})} onWeightChange={(t) => setForm({...form, max_weight_kg: t ? parseFloat(t) : null})} onPriceChange={(t) => setForm({...form, price_per_km: t ? parseFloat(t) : null})} onPickDoc={(side) => pickDoc(side, (url, col) => setForm(prev => ({ ...prev, [col]: url })))} onToggleActive={toggleActive} />
            </View>
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Estado de servicio</Text>
                <View style={styles.switchRow}>
                  <Text style={styles.infoLabel}>Activo para recibir pedidos</Text>
                  <Switch value={profile.is_active} onValueChange={toggleActive} trackColor={{ false: '#ccc', true: '#F7C925' }} disabled={!isVerified} />
                </View>
                {!isVerified && <Text style={styles.hint}>Verificación requerida para activarse.</Text>}
              </View>
            </View>
          </>
        )}
        <View style={styles.destructiveContainer}>
          <TouchableOpacity style={styles.destructiveButton} onPress={() => signOut()}>
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
  actionChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, gap: 6 },
  actionChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A', marginBottom: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#F59E0B', marginTop: 6 },
  destructiveContainer: { marginHorizontal: 16, marginTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 },
  destructiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  destructiveText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#EF4444' },
});