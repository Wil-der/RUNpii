// components/AdminMetricsCards.tsx
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AdminMetrics } from '@/hooks/useAdminDashboard';

interface Props {
  metrics: AdminMetrics | null;
}

export default function AdminMetricsCards({ metrics }: Props) {
  if (!metrics) return null;

  const cards = [
    { icon: 'package', label: 'Total pedidos', value: metrics.totalOrders, color: '#3B82F6' },
    { icon: 'clock', label: 'Pedidos activos', value: metrics.activeOrders, color: '#F59E0B' },
    { icon: 'users', label: 'Mensajeros activos', value: metrics.activeCouriers, color: '#10B981' },
    { icon: 'user-check', label: 'Pendientes verificación', value: metrics.pendingVerifications, color: '#EF4444' },
    { icon: 'dollar-sign', label: 'Ingresos est. (10%)', value: `$${metrics.estimatedRevenue}`, color: '#8B5CF6' },
    { icon: 'star', label: 'Valoración media', value: metrics.averageRating.toFixed(1), color: '#F7C925' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {cards.map((card) => (
        <View key={card.label} style={styles.card}>
          <Feather name={card.icon as any} size={24} color={card.color} />
          <Text style={styles.value}>{card.value}</Text>
          <Text style={styles.label}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  value: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A', marginTop: 8 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});