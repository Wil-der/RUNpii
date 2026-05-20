// app/(tabs)/index.tsx
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Cabecera integrada */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={28} color="#999" />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.greeting}>
            {profile?.full_name?.split(' ')[0] || 'Usuario'}
          </Text>
          <Text style={styles.subtitle}>
            {profile?.role === 'courier' ? 'Mensajero' : 'Cliente'}
          </Text>
        </View>
      </View>

      {/* Accesos rápidos */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/explore')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Feather name="package" size={28} color="#F7C925" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Pedidos</Text>
            <Text style={styles.actionDesc}>
              {profile?.role === 'courier'
                ? 'Gestiona tus entregas activas'
                : 'Historial y estado de envíos'}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#6B7280" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          <View style={styles.actionIconContainer}>
            <Feather name="settings" size={28} color="#F7C925" />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Perfil</Text>
            <Text style={styles.actionDesc}>
              {profile?.role === 'courier'
                ? 'Disponibilidad y documentos'
                : 'Información personal'}
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F7C925',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  headerInfo: {
    marginLeft: 14,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1A1A1A',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  quickActions: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  actionDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});