// app/(tabs)/explore.tsx
import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export default function OrdersScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      // Obtener pedidos donde el usuario es cliente, mensajero o destinatario
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, pickup_address, delivery_address, estimated_price, final_price, created_at, customer_id, courier_id, recipient_id')
        .or(`customer_id.eq.${user.id},courier_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .not('status', 'in', '("cancelled","delivered","returned")')  // solo activos
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error al cargar pedidos:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#FFA50020', text: 'Pendiente' },
      awaiting_courier: { bg: '#F59E0B20', text: 'Esperando mensajero' },
      assigned: { bg: '#3B82F620', text: 'Asignado' },
      picked_up: { bg: '#8B5CF620', text: 'En camino' },
      in_transit: { bg: '#8B5CF620', text: 'En tránsito' },
      delivered: { bg: '#10B98120', text: 'Entregado' },
      delivery_failed: { bg: '#EF444420', text: 'Fallido' },
      returning: { bg: '#F59E0B20', text: 'Devolviendo' },
      returned: { bg: '#6B728020', text: 'Devuelto' },
      cancelled: { bg: '#EF444420', text: 'Cancelado' },
    };
    const style = statusStyles[status] || { bg: '#ccc', text: status };
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>{style.text}</Text>
      </View>
    );
  };

  const renderOrder = ({ item }: { item: any }) => {
    const isCustomer = item.customer_id === user?.id;
    const isCourier = item.courier_id === user?.id;
    const isRecipient = item.recipient_id === user?.id;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push({ pathname: '/(tabs)/order-detail', params: { order_id: item.id } })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderAddress}>
              {item.pickup_address?.substring(0, 30)} → {item.delivery_address?.substring(0, 30)}
            </Text>
            <Text style={styles.orderDate}>
              {new Date(item.created_at).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
          {renderStatusBadge(item.status)}
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.price}>
            ${(item.final_price || item.estimated_price || 0).toFixed(2)}
          </Text>
          <Text style={styles.roleLabel}>
            {isCustomer ? '📤 Enviado' : isCourier ? '🚚 Transportado' : isRecipient ? '📥 Recibido' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
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
      <View style={styles.header}>
        <Text style={styles.title}>Mis pedidos</Text>
        <Text style={styles.count}>{orders.length} pedido{orders.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aún no tienes pedidos</Text>
            <Text style={styles.emptySubtext}>Crea tu primer pedido y encuentra un mensajero cercano</Text>
          </View>
        }
      />

      {/* Botón flotante solo para clientes */}
      {profile?.role === 'customer' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/new-order')}
        >
          <Feather name="plus" size={28} color="#1A1A1A" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
  },
  count: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderAddress: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#1A1A1A',
    width: 220,
  },
  orderDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  roleLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 30,
    backgroundColor: '#F7C925',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
});