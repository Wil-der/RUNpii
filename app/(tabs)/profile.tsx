import { StyleSheet, Pressable, View, Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { updateCourierAvailability } from '@/lib/supabase-operations';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, signOut, profile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  const toggleAvailability = async () => {
    if (!user) return;
    setSaving(true);
    const newStatus = profile?.availability_status === 'available' ? 'offline' : 'available';
    const { error } = await updateCourierAvailability(user.id, newStatus);
    setSaving(false);
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Perfil</ThemedText>

      <View style={styles.card}>
        <ThemedText type="subtitle">Información del usuario</ThemedText>
        <ThemedText>Email: {user?.email}</ThemedText>
        <ThemedText>Rol: {profile?.role || 'customer'}</ThemedText>
        <ThemedText>
          Creado: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </ThemedText>
      </View>

      {profile?.role === 'courier' && (
        <View style={styles.card}>
          <ThemedText type="subtitle">Panel de Mensajero</ThemedText>
          <ThemedText>Estado: {profile.availability_status}</ThemedText>
          <ThemedText>Rating: {profile.rating_average} ({profile.total_ratings} valoraciones)</ThemedText>
          <Pressable style={styles.availabilityButton} onPress={toggleAvailability} disabled={saving}>
            <ThemedText style={styles.availabilityText}>
              {profile.availability_status === 'available' ? 'Desconectarme' : 'Conectarme'}
            </ThemedText>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginVertical: 20,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  availabilityButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  availabilityText: { color: '#fff' },
});