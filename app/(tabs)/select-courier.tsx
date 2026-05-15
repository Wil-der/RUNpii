// app/(tabs)/select-courier.tsx
import { useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useSelectCourier, Courier } from '@/hooks/useSelectCourier';
import CourierCard from '@/components/CourierCard';
import CourierModal from '@/components/CourierModal';

export default function SelectCourierScreen() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const { order, couriers, loading, selecting, totalDistance, assignCourier } = useSelectCourier(order_id);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [modalCourier, setModalCourier] = useState<Courier | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<Courier>>(null);

  // Abrir modal desde tarjeta
  const handleCardPress = (courier: Courier) => {
    setModalCourier(courier);
    setModalVisible(true);
    // Centrar mapa en el mensajero
    mapRef.current?.animateToRegion(
      {
        latitude: courier.courier_lat,
        longitude: courier.courier_lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

  // Cerrar modal
  const closeModal = () => {
    setModalVisible(false);
    setModalCourier(null);
  };

  // Seleccionar mensajero desde modal
  const handleSelect = async (courierId: string) => {
    setModalVisible(false);
    await assignCourier(courierId);
  };

  // Al tocar marcador en el mapa
  const handleMarkerPress = (courier: Courier) => {
    const index = couriers.findIndex((c) => c.courier_id === courier.courier_id);
    if (index !== -1) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedId(courier.courier_id);
      setTimeout(() => setHighlightedId(null), 1500);
    }
  };

  // Renderizar tarjeta con resaltado
  const renderItem = useCallback(
    ({ item }: { item: Courier }) => (
      <CourierCard
        item={item}
        isHighlighted={highlightedId === item.courier_id}
        onPress={handleCardPress}
        disabled={selecting !== null}
      />
    ),
    [highlightedId, selecting],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  const pickupCoords = order?.pickup_location;
  const deliveryCoords = order?.delivery_location;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          pickupCoords
            ? {
                latitude: pickupCoords.latitude,
                longitude: pickupCoords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : undefined
        }
        provider={PROVIDER_DEFAULT}
      >
        {pickupCoords && <Marker coordinate={pickupCoords} title="Recogida" pinColor="red" />}
        {deliveryCoords && <Marker coordinate={deliveryCoords} title="Entrega" pinColor="blue" />}
        {couriers.map((c) => (
          <Marker
            key={c.courier_id}
            coordinate={{ latitude: c.courier_lat, longitude: c.courier_lng }}
            title={c.full_name}
            description={`$${c.estimated_price?.toFixed(2)}`}
            pinColor={highlightedId === c.courier_id ? 'purple' : 'green'}
            onPress={() => handleMarkerPress(c)}
          />
        ))}
        {pickupCoords && deliveryCoords && (
          <Polyline
            coordinates={[pickupCoords, deliveryCoords]}
            strokeColor="#F7C925"
            strokeWidth={3}
          />
        )}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Mensajeros disponibles</Text>
        <Text style={styles.subtitle}>Distancia total: {totalDistance.toFixed(1)} km</Text>
      </View>

      <FlatList
        ref={listRef}
        data={couriers}
        renderItem={renderItem}
        keyExtractor={(item) => item.courier_id}
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: true,
          });
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No hay mensajeros disponibles en esta zona</Text>
        }
      />

      <CourierModal
        visible={modalVisible}
        courier={modalCourier}
        totalDistance={totalDistance}
        loading={selecting !== null}
        onSelect={handleSelect}
        onClose={closeModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  map: { height: '40%' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
});