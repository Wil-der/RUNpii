// app/(tabs)/index.tsx
import { StyleSheet, View, Pressable, Text, Image } from 'react-native';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';

export default function HomeScreen() {
  const { user, profile } = useAuth();

  return (
    <View style={styles.container}>
      {/* Cabecera con saludo */}
      <View style={styles.header}>
        <View>
          <Feather name="package" size={28} color="#F7C925" style={{ marginBottom: 8 }} />
          <Text style={styles.greeting}>
            ¡Hola{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!
          </Text>
          <Text style={styles.subtitle}>
            {profile?.role === 'courier' ? 'Gestiona tus entregas' : 'Envía o recibe paquetes fácilmente'}
          </Text>
        </View>
        {/* Avatar pequeño (opcional) */}
        {profile?.avatar_url && (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        )}
      </View>

      {/* Accesos rápidos */}
      <View style={styles.quickActions}>
        <Link href="/(tabs)/explore" asChild>
          <Pressable style={styles.actionCard}>
            <Feather name="package" size={32} color="#F7C925" />
            <Text style={styles.actionTitle}>Mis Pedidos</Text>
            <Text style={styles.actionDesc}>
              {profile?.role === 'courier'
                ? 'Ver pedidos activos y pendientes'
                : 'Historial de envíos y estado actual'}
            </Text>
          </Pressable>
        </Link>

        <Link href="/(tabs)/profile" asChild>
          <Pressable style={styles.actionCard}>
            <Feather name="user" size={32} color="#F7C925" />
            <Text style={styles.actionTitle}>Mi Perfil</Text>
            <Text style={styles.actionDesc}>
              {profile?.role === 'courier'
                ? 'Gestiona tu disponibilidad y datos'
                : 'Administra tu información personal'}
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#6B7280',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  quickActions: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 4,
  },
  actionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  // Faltaba el import de Text e Image, lo agrego
});