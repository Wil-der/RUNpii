// app/(tabs)/select-courier.tsx
import { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelectCourier, Courier, CourierFilters } from '@/hooks/useSelectCourier';
import CourierCard from '@/components/CourierCard';
import CourierModal from '@/components/CourierModal';
import { MAP_STYLE } from '@/lib/mapConfig';

MapLibreGL.setAccessToken(null);

const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'car', 'van', 'truck'] as const;
const SORT_OPTIONS: { value: CourierFilters['sortBy']; label: string }[] = [
  { value: 'distance', label: 'Distancia' },
  { value: 'price', label: 'Precio' },
  { value: 'rating', label: 'Valoración' },
];

export default function SelectCourierScreen() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const router = useRouter();
  const {
    order,
    filteredCouriers,
    loading,
    selecting,
    totalDistance,
    filters,
    setFilters,
    assignCourier,
    reload,
  } = useSelectCourier(order_id);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [modalCourier, setModalCourier] = useState<Courier | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showPriceRating, setShowPriceRating] = useState(false);

  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const listRef = useRef<FlatList<Courier>>(null);

  const openCourierModal = (courier: Courier) => {
    setModalCourier(courier);
    setModalVisible(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [courier.courier_lng, courier.courier_lat],
      zoomLevel: 14,
      animationDuration: 500,
    });
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalCourier(null);
  };

  const handleSelect = async (courierId: string) => {
    setModalVisible(false);
    await assignCourier(courierId);
  };

  const handleMarkerPress = (courier: Courier) => {
    const index = filteredCouriers.findIndex((c) => c.courier_id === courier.courier_id);
    if (index !== -1) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedId(courier.courier_id);
      setTimeout(() => setHighlightedId(null), 1500);
    }
  };

  const fitMapToElements = () => {
    if (!order?.pickup_location || !order?.delivery_location) return;

    const allPoints = [
      [order.pickup_location.longitude, order.pickup_location.latitude],
      [order.delivery_location.longitude, order.delivery_location.latitude],
      ...filteredCouriers.map((c) => [c.courier_lng, c.courier_lat]),
    ];

    const lngs = allPoints.map((p) => p[0]);
    const lats = allPoints.map((p) => p[1]);

    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
      [50, 50, 50, 50],
      800
    );
  };

  const renderItem = useCallback(
    ({ item }: { item: Courier }) => (
      <CourierCard
        item={item}
        isHighlighted={highlightedId === item.courier_id}
        onPress={openCourierModal}
        disabled={selecting !== null}
      />
    ),
    [highlightedId, selecting],
  );

  const routeLineGeoJSON = order?.pickup_location && order?.delivery_location
    ? {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [order.pickup_location.longitude, order.pickup_location.latitude],
            [order.delivery_location.longitude, order.delivery_location.latitude],
          ],
        },
        properties: {},
      }
    : null;

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
      <View style={styles.mapContainer}>
        <MapLibreGL.MapView
          style={styles.map}
          styleURL={MAP_STYLE}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapLibreGL.Camera
            ref={cameraRef}
            defaultSettings={
              pickupCoords
                ? { centerCoordinate: [pickupCoords.longitude, pickupCoords.latitude], zoomLevel: 12 }
                : undefined
            }
          />

          {routeLineGeoJSON && (
            <MapLibreGL.ShapeSource id="routeLine" shape={routeLineGeoJSON}>
              <MapLibreGL.LineLayer
                id="routeLineLayer"
                style={{
                  lineColor: '#F7C925',
                  lineWidth: 3,
                  lineDasharray: [2, 2],
                  lineJoin: 'round',
                }}
              />
            </MapLibreGL.ShapeSource>
          )}

          {pickupCoords && (
            <MapLibreGL.PointAnnotation
              id="pickup"
              coordinate={[pickupCoords.longitude, pickupCoords.latitude]}
              title="Recogida"
            >
              <View style={[styles.marker, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.markerText}>R</Text>
              </View>
            </MapLibreGL.PointAnnotation>
          )}

          {deliveryCoords && (
            <MapLibreGL.PointAnnotation
              id="delivery"
              coordinate={[deliveryCoords.longitude, deliveryCoords.latitude]}
              title="Entrega"
            >
              <View style={[styles.marker, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.markerText}>E</Text>
              </View>
            </MapLibreGL.PointAnnotation>
          )}

          {filteredCouriers.map((c) => (
            <MapLibreGL.PointAnnotation
              key={c.courier_id}
              id={`courier-${c.courier_id}`}
              coordinate={[c.courier_lng, c.courier_lat]}
              title={c.full_name}
              onSelected={() => handleMarkerPress(c)}
            >
              <View
                style={[
                  styles.marker,
                  {
                    backgroundColor: highlightedId === c.courier_id ? '#8B5CF6' : '#10B981',
                    transform: [{ scale: highlightedId === c.courier_id ? 1.2 : 1 }],
                  },
                ]}
              >
                <Text style={styles.markerText}>M</Text>
              </View>
            </MapLibreGL.PointAnnotation>
          ))}
        </MapLibreGL.MapView>

        <TouchableOpacity
          style={styles.fitButton}
          onPress={fitMapToElements}
          accessibilityRole="button"
          accessibilityLabel="Ajustar vista"
          accessibilityHint="Ajusta el mapa para mostrar todos los puntos"
        >
          <Feather name="maximize" size={18} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.replace({ pathname: '/(tabs)/order-detail', params: { order_id } })}
            accessibilityRole="button"
            accessibilityLabel="Volver al pedido"
          >
            <Feather name="arrow-left" size={22} color="#F7C925" />
          </TouchableOpacity>
          <Text style={styles.title}>Mensajeros</Text>
          <TouchableOpacity
            onPress={reload}
            accessibilityRole="button"
            accessibilityLabel="Actualizar lista"
          >
            <Feather name="refresh-cw" size={20} color="#F7C925" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          {totalDistance.toFixed(1)} km total · {filteredCouriers.length} disponibles
        </Text>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {VEHICLE_TYPES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.chip, filters.vehicleType === v && styles.chipActive]}
              onPress={() => setFilters({ ...filters, vehicleType: filters.vehicleType === v ? null : v })}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${v}`}
            >
              <Text style={[styles.chipText, filters.vehicleType === v && styles.chipTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.separator} />

          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, filters.sortBy === opt.value && styles.chipActive]}
              onPress={() => setFilters({ ...filters, sortBy: opt.value })}
              accessibilityRole="button"
              accessibilityLabel={`Ordenar por ${opt.label}`}
            >
              <Text style={[styles.chipText, filters.sortBy === opt.value && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.chip, showPriceRating && styles.chipActive]}
            onPress={() => setShowPriceRating(!showPriceRating)}
            accessibilityRole="button"
            accessibilityLabel="Ajustar precio y valoración"
          >
            <Feather name="dollar-sign" size={15} color={showPriceRating ? '#1A1A1A' : '#6B7280'} />
            <Text style={[styles.chipText, showPriceRating && styles.chipTextActive]}>Precio / Rating</Text>
          </TouchableOpacity>
        </ScrollView>

        {showPriceRating && (
          <View style={styles.priceRatingRow}>
            <TextInput
              style={styles.numericInput}
              keyboardType="numeric"
              placeholder="Precio máx"
              placeholderTextColor="#9CA3AF"
              value={filters.maxPrice?.toString() ?? ''}
              onChangeText={(t) => setFilters({ ...filters, maxPrice: t ? parseFloat(t) : null })}
              accessibilityLabel="Precio máximo"
            />
            <TextInput
              style={styles.numericInput}
              keyboardType="numeric"
              placeholder="Rating mín"
              placeholderTextColor="#9CA3AF"
              value={filters.minRating?.toString() ?? ''}
              onChangeText={(t) => setFilters({ ...filters, minRating: t ? parseFloat(t) : null })}
              accessibilityLabel="Valoración mínima"
            />
            <TouchableOpacity
              onPress={() => setFilters({ ...filters, maxPrice: null, minRating: null })}
              accessibilityRole="button"
              accessibilityLabel="Limpiar filtros de precio y rating"
            >
              <Feather name="x-circle" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={filteredCouriers}
        renderItem={renderItem}
        keyExtractor={(item) => item.courier_id}
        contentContainerStyle={styles.list}
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor="#F7C925" />}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }}
        ListEmptyComponent={<Text style={styles.empty}>No hay mensajeros con los filtros actuales</Text>}
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
  mapContainer: { height: '30%', position: 'relative' },
  map: { flex: 1 },
  fitButton: {
    position: 'absolute',
    right: 12, bottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 32, height: 32,
    justifyContent: 'center', alignItems: 'center',
    elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 1 }, shadowRadius: 3,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  filtersContainer: { minHeight: 48, justifyContent: 'center' },
  filterScroll: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', gap: 4,
  },
  chipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  chipTextActive: { color: '#1A1A1A' },
  separator: { width: 1, height: 22, backgroundColor: '#E5E7EB' },
  priceRatingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 8, marginBottom: 6,
  },
  numericInput: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 10,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1A1A1A',
  },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  marker: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  markerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});