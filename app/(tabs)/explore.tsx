import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { getMyOrders, Order } from '@/lib/supabase-operations';

export default function ExploreScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await getMyOrders(user.id);
    if (data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <ThemedText type="defaultSemiBold">
        {item.pickup_address} → {item.delivery_address}
      </ThemedText>
      <ThemedText>Estado: {item.status}</ThemedText>
      <ThemedText>Precio: ${item.final_price || item.estimated_price || 0}</ThemedText>
    </View>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{ fontFamily: Fonts.rounded }}>
          Mis Pedidos
        </ThemedText>
      </ThemedView>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}

      <Collapsible title="Configuración de Supabase">
        <ThemedText>
          Conectado a: <ThemedText type="defaultSemiBold">zudoikaztozmhhbvaipf.supabase.co</ThemedText>
        </ThemedText>
        <ExternalLink href="https://supabase.com/dashboard">
          <ThemedText type="link">Ir al Dashboard</ThemedText>
        </ExternalLink>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: { color: '#808080', bottom: -90, left: -35, position: 'absolute' },
  titleContainer: { flexDirection: 'row', gap: 8 },
  orderCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
});