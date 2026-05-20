// components/ProfileHeader.tsx
import { StyleSheet, View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  avatarUrl?: string | null;
  fullName?: string;
  email?: string;
  role: string;
  uploading: boolean;
  onPressAvatar: () => void;
}

export default function ProfileHeader({ avatarUrl, fullName, email, role, uploading, onPressAvatar }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onPressAvatar} disabled={uploading}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <Feather name="user" size={28} color="#999" />
          )}
          {uploading && <ActivityIndicator style={styles.avatarLoader} color="#F7C925" />}
        </View>
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.name}>{fullName || 'Sin nombre'}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{role}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#F7C925',
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarLoader: { position: 'absolute' },
  headerInfo: { flex: 1, marginLeft: 14 },
  name: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  email: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge: {
    alignSelf: 'flex-start', backgroundColor: '#F7C925', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10, marginTop: 6,
  },
  roleText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#1A1A1A' },
});