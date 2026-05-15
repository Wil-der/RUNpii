// components/OrderMap.tsx
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

interface Props {
  pickupCoords: { latitude: number; longitude: number } | null;
  deliveryCoords: { latitude: number; longitude: number } | null;
  courierLocation?: { latitude: number; longitude: number } | null;
}

export default function OrderMap({ pickupCoords, deliveryCoords, courierLocation }: Props) {
  if (!pickupCoords || !deliveryCoords) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Mapa no disponible</Text>
      </View>
    );
  }

  const midLat = (pickupCoords.latitude + deliveryCoords.latitude) / 2;
  const midLng = (pickupCoords.longitude + deliveryCoords.longitude) / 2;
  const latDelta = Math.abs(pickupCoords.latitude - deliveryCoords.latitude) * 2 + 0.05;
  const lngDelta = Math.abs(pickupCoords.longitude - deliveryCoords.longitude) * 2 + 0.05;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        provider={PROVIDER_DEFAULT}
      >
        <Marker coordinate={pickupCoords} title="Recogida" pinColor="red" />
        <Marker coordinate={deliveryCoords} title="Entrega" pinColor="blue" />
        {courierLocation && (
          <Marker coordinate={courierLocation} title="Mensajero" pinColor="green" />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    flex: 1,
  },
  fallback: {
    height: 200,
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fallbackText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
  },
});