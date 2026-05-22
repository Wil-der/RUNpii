// app/(tabs)/explore.tsx
import { useState } from 'react';
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
import { useOrders } from '@/hooks/useOrders';
import OrderListItem from '@/components/OrderListItem';
import { useAuth } from '@/hooks/use-auth';

export default function OrdersScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { orders, loading, showHistory, setShowHistory, reload } = useOrders();
  const [refreshing, setRefreshing] = useState(false);

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
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{showHistory ? 'Historial' : 'Mis pedidos'}</Text>
          <Text style={styles.count}>{orders.length} pedido{orders.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistory(!showHistory)}
          accessibilityRole="button"
          accessibilityLabel={showHistory ? 'Ver activos' : 'Ver historial'}
        >
          <Text style={styles.historyButtonText}>{showHistory ? 'Ver activos' : 'Historial'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        renderItem={({ item }) => <OrderListItem item={item} showHistory={showHistory} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={orders.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={10}
        removeClippedSubviews={true}
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
          accessibilityRole="button"
          accessibilityLabel="Nuevo pedido"
          accessibilityHint="Pulsa para crear un nuevo pedido"
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  historyButton: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  historyButtonText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6B7280' },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  empty: { alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#1A1A1A' },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 40, right: 30,
    backgroundColor: '#F7C925', width: 60, height: 60, borderRadius: 30,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
});