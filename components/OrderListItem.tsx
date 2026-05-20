// components/OrderListItem.tsx
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  item: any;
  showHistory: boolean;
}

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#FFA50020', text: '#FFA500', label: 'Pendiente' },
  awaiting_courier: { bg: '#F59E0B20', text: '#F59E0B', label: 'Esperando mens.' },
  assigned: { bg: '#3B82F620', text: '#3B82F6', label: 'Asignado' },
  picked_up: { bg: '#8B5CF620', text: '#8B5CF6', label: 'En camino' },
  in_transit: { bg: '#8B5CF620', text: '#8B5CF6', label: 'En tránsito' },
  delivered: { bg: '#10B98120', text: '#10B981', label: 'Entregado' },
  delivery_failed: { bg: '#EF444420', text: '#EF4444', label: 'Fallido' },
  returning: { bg: '#F59E0B20', text: '#F59E0B', label: 'Devolviendo' },
  returned: { bg: '#6B728020', text: '#6B7280', label: 'Devuelto' },
  cancelled: { bg: '#EF444420', text: '#EF4444', label: 'Cancelado' },
};

export default function OrderListItem({ item, showHistory }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const statusBadge = (status: string) => {
    const s = STATUS_MAP[status] || { bg: '#ccc', text: '#999', label: status };
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]} numberOfLines={1} ellipsizeMode="tail">
          {s.label}
        </Text>
      </View>
    );
  };

  const roleLabel = () => {
    if (item.customer_id === user?.id) return 'Enviado';
    if (item.courier_id === user?.id) return 'Transportado';
    if (item.recipient_id === user?.id) return 'Recibido';
    return '';
  };

  const canChat = !showHistory && ['assigned', 'picked_up', 'in_transit'].includes(item.status);
  const price = item.final_price ?? item.estimated_price;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/order-detail', params: { order_id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.addressContainer}>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">
            {item.pickup_address?.substring(0, 30)} → {item.delivery_address?.substring(0, 30)}
          </Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <View style={styles.badgeWrapper}>{statusBadge(item.status)}</View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.price} numberOfLines={1}>
          {price != null ? `$${price.toFixed(2)}` : '—'}
        </Text>
        <View style={styles.footerRight}>
          <Text style={styles.roleLabel} numberOfLines={1}>
            {roleLabel()}
          </Text>
          {canChat && (
            <TouchableOpacity
              style={styles.chatChip}
              onPress={() => router.push({ pathname: '/(tabs)/chat', params: { order_id: item.id } })}
            >
              <Feather name="message-circle" size={14} color="#FFFFFF" />
              <Text style={styles.chatChipText}>Chat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  addressContainer: { flex: 1, marginRight: 10 },
  address: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1A1A1A' },
  date: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 4 },
  badgeWrapper: { flexShrink: 0, maxWidth: 120 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#1A1A1A' },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280' },
  chatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  chatChipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#FFFFFF' },
});