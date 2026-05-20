// app/(tabs)/active-chats.tsx
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

interface ActiveChat {
  order_id: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  other_participant: string;
}

export default function ActiveChatsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<ActiveChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChats = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, pickup_address, delivery_address, status, customer_id, courier_id, recipient_id')
        .or(`customer_id.eq.${user.id},courier_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .in('status', ['assigned', 'picked_up', 'in_transit'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((order) => ({
        order_id: order.id,
        pickup_address: order.pickup_address,
        delivery_address: order.delivery_address,
        status: order.status,
        other_participant: getOtherParticipant(order),
      }));

      setChats(formatted);
    } catch (error: any) {
      console.error('Error al cargar chats:', error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Suscripción en tiempo real a cambios en orders (recarga silenciosa)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('active-chats-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          loadChats(true); // recarga silenciosa, sin parpadeo
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadChats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChats();
    setRefreshing(false);
  };

  const getOtherParticipant = (order: any) => {
    if (order.customer_id === user?.id) {
      return order.courier_id ? 'Mensajero' : 'Destinatario';
    }
    if (order.courier_id === user?.id) return 'Cliente';
    if (order.recipient_id === user?.id) return 'Cliente';
    return 'Desconocido';
  };

  const renderChat = ({ item }: { item: ActiveChat }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => router.push({ pathname: '/(tabs)/chat', params: { order_id: item.order_id } })}
      activeOpacity={0.7}
    >
      <View style={styles.chatInfo}>
        <View style={styles.chatIconContainer}>
          <Feather name="message-circle" size={24} color="#F7C925" />
        </View>
        <View style={styles.chatTextContainer}>
          <Text style={styles.chatParticipant} numberOfLines={1}>
            {item.other_participant}
          </Text>
          <Text style={styles.chatRoute} numberOfLines={1}>
            {item.pickup_address?.substring(0, 25)} → {item.delivery_address?.substring(0, 25)}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color="#6B7280" />
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
        <Text style={styles.title}>Chats activos</Text>
        <Text style={styles.count}>{chats.length} conversación{chats.length !== 1 ? 'es' : ''}</Text>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Sin chats activos</Text>
            <Text style={styles.emptySubtext}>Cuando un mensajero acepte tu pedido, aparecerá aquí</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  count: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16 },
  chatCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatInfo: { flexDirection: 'row', alignItems: 'center' },
  chatIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chatTextContainer: { flex: 1, marginLeft: 12 },
  chatParticipant: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  chatRoute: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  empty: { alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#1A1A1A' },
  emptySubtext: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
});