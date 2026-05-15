// components/OrderStatusBanner.tsx
import { StyleSheet, View, Text } from 'react-native';

interface Props {
  status: string;
  estimatedPrice?: number | null;
}

const statusMap: Record<string, { text: string; color: string }> = {
  pending: { text: 'Pendiente', color: '#FFA500' },
  awaiting_courier: { text: 'Esperando mensajero', color: '#F59E0B' },
  assigned: { text: 'Asignado', color: '#3B82F6' },
  picked_up: { text: 'En camino', color: '#8B5CF6' },
  in_transit: { text: 'En tránsito', color: '#8B5CF6' },
  delivered: { text: 'Entregado', color: '#10B981' },
  delivery_failed: { text: 'Entrega fallida', color: '#EF4444' },
  returning: { text: 'En devolución', color: '#F59E0B' },
  returned: { text: 'Devuelto', color: '#6B7280' },
  cancelled: { text: 'Cancelado', color: '#EF4444' },
};

export default function OrderStatusBanner({ status, estimatedPrice }: Props) {
  const info = statusMap[status] || { text: status, color: '#999' };

  return (
    <View style={[styles.container, { backgroundColor: info.color + '20' }]}>
      <Text style={[styles.statusText, { color: info.color }]}>{info.text}</Text>
      {estimatedPrice != null && (
        <Text style={styles.priceText}>${estimatedPrice.toFixed(2)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  priceText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#1A1A1A',
  },
});