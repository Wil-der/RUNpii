import { StyleSheet, Pressable, View } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Perfil</ThemedText>

      <View style={styles.card}>
        <ThemedText type="subtitle">Información del usuario</ThemedText>
        <ThemedText>Email: {user?.email}</ThemedText>
        <ThemedText>
          Creado: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </ThemedText>
      </View>

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
});
