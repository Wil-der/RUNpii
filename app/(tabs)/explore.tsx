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
  const [showHistory, setShowHistory] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const statusFilter = showHistory
        ? 'in'   // historial: entregados, cancelados, devueltos
        : 'not'; // activos: todos menos esos tres

      const query = supabase
        .from('orders')
        .select('id, status, pickup_address, delivery_address, estimated_price, final_price, created_at, customer_id, courier_id, recipient_id')
        .or(`customer_id.eq.${user.id},courier_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (showHistory) {
        query.in('status', ['delivered', 'cancelled', 'returned']);
      } else {
        query.not('status', 'in', '("cancelled","delivered","returned")');
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error al cargar pedidos:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, showHistory]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const canChat = (status: string) =>
    !showHistory && ['assigned', 'picked_up', 'in_transit'].includes(status);

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
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
    const s = map[status] || { bg: '#ccc', text: '#999', label: status };
    return (
      <View style={[styles.badge, { backgroundColor: s.bg }]}>
        <Text style={[styles.badgeText, { color: s.text }]} numberOfLines={1} ellipsizeMode="tail">
          {s.label}
        </Text>
      </View>
    );
  };

  const roleLabel = (item: any) => {
    if (item.customer_id === user?.id) return 'Enviado';
    if (item.courier_id === user?.id) return 'Transportado';
    if (item.recipient_id === user?.id) return 'Recibido';
    return '';
  };

  const renderOrder = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => router.push({ pathname: '/(tabs)/order-detail', params: { order_id: item.id } })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.addressContainer}>
          <Text style={styles.orderAddress} numberOfLines={1} ellipsizeMode="tail">
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
        <View style={styles.badgeWrapper}>
          {statusBadge(item.status)}
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.price} numberOfLines={1}>
          ${(item.final_price || item.estimated_price || 0).toFixed(2)}
        </Text>
        <View style={styles.footerRight}>
          <Text style={styles.roleLabel} numberOfLines={1}>
            {roleLabel(item)}
          </Text>
          {canChat(item.status) && (
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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{showHistory ? 'Historial' : 'Mis pedidos'}</Text>
          <Text style={styles.count}>{orders.length} pedido{orders.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Text style={styles.historyButtonText}>
            {showHistory ? 'Ver activos' : 'Historial'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {showHistory ? 'No tienes pedidos finalizados' : 'Aún no tienes pedidos'}
            </Text>
            <Text style={styles.emptySubtext}>
              {showHistory
                ? 'Los pedidos entregados, cancelados o devueltos aparecerán aquí'
                : 'Crea tu primer pedido y encuentra un mensajero cercano'}
            </Text>
          </View>
        }
      />

      {!showHistory && profile?.role === 'customer' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/new-order')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={28} color="#1A1A1A" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  historyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#6B7280',
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  addressContainer: { flex: 1, marginRight: 10 },
  orderAddress: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#1A1A1A' },
  orderDate: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 4 },
  badgeWrapper: { flexShrink: 0, maxWidth: 120 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  empty: { alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#1A1A1A' },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
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