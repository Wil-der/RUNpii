// components/AdminCourierCard.tsx
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CourierForAdmin } from '@/hooks/useAdminDashboard';

interface Props {
  courier: CourierForAdmin;
  loading: boolean;
  onViewDocuments: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function AdminCourierCard({ courier, loading, onViewDocuments, onApprove, onReject }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{courier.full_name || 'Sin nombre'}</Text>
        <Text style={styles.detail}>Carnet: {courier.id_card_number || '—'}</Text>
        <Text style={styles.detail}>Vehículo: {courier.vehicle_type || '—'}</Text>
        <Text style={styles.detail}>
          Valoración: {courier.rating_average?.toFixed(1) || '—'} ({courier.total_ratings || 0})
        </Text>
      </View>

      <TouchableOpacity style={styles.docButton} onPress={onViewDocuments}>
        <Feather name="file-text" size={16} color="#3B82F6" />
        <Text style={styles.docButtonText}>Ver documentos</Text>
      </TouchableOpacity>

      {courier.verification_status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={onApprove}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="check" size={16} color="#FFF" />
                <Text style={styles.actionText}>Aprobar</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={onReject}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Feather name="x" size={16} color="#FFF" />
                <Text style={styles.actionText}>Rechazar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  info: { marginBottom: 12 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', marginTop: 4 },
  docButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12,
  },
  docButtonText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#3B82F6' },
  actions: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#FFFFFF' },
});