// app/(tabs)/admin.tsx
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import AdminMetricsCards from '@/components/AdminMetricsCards';
import AdminCourierCard from '@/components/AdminCourierCard';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';

const FILTERS: { key: 'pending' | 'approved' | 'rejected'; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
];

export default function AdminScreen() {
  const { metrics, couriers, loading, filter, actionLoading, changeFilter, verifyCourier, reload } = useAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [docModal, setDocModal] = useState<{ visible: boolean; front: string | null; back: string | null }>({
    visible: false, front: null, back: null,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera */}
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administración</Text>
      </View>

      <FlatList
        data={couriers}
        renderItem={({ item }) => (
          <AdminCourierCard
            courier={item}
            loading={actionLoading === item.id}
            onViewDocuments={() => setDocModal({ visible: true, front: item.id_card_front_url, back: item.id_card_back_url })}
            onApprove={() => verifyCourier(item.id, true)}
            onReject={() => verifyCourier(item.id, false)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
        ListHeaderComponent={
          <>
            {/* Métricas */}
            <AdminMetricsCards metrics={metrics} />

            {/* Filtros */}
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                  onPress={() => changeFilter(f.key)}
                >
                  <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No hay mensajeros en esta categoría</Text>
          </View>
        }
      />

      {/* Modal de documentos */}
      <DocumentPreviewModal
        visible={docModal.visible}
        frontUrl={docModal.front}
        backUrl={docModal.back}
        onClose={() => setDocModal({ visible: false, front: null, back: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  filterChipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  filterChipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  filterChipTextActive: { color: '#1A1A1A' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', marginTop: 8 },
});