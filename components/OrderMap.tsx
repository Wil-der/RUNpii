// components/OrderMap.tsx
import { useRef, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';

interface Props {
  pickupCoords: { latitude: number; longitude: number } | null;
  deliveryCoords: { latitude: number; longitude: number } | null;
  courierLocation?: { latitude: number; longitude: number } | null;
}

export default function OrderMap({ pickupCoords, deliveryCoords, courierLocation }: Props) {
  const mapRef = useRef<MapView>(null);

  // Ajustar el mapa automáticamente cuando cambia la ubicación del mensajero
  useEffect(() => {
    if (!pickupCoords || !deliveryCoords) return;
    const points = [pickupCoords, deliveryCoords];
    if (courierLocation) points.push(courierLocation);
    mapRef.current?.fitToCoordinates(points, {
      edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
      animated: true,
    });
  }, [pickupCoords, deliveryCoords, courierLocation]);

  if (!pickupCoords || !deliveryCoords) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Mapa no disponible</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: (pickupCoords.latitude + deliveryCoords.latitude) / 2,
          longitude: (pickupCoords.longitude + deliveryCoords.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
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
  container: { height: '30%', position: 'relative' },
  map: { flex: 1 },
  fallback: {
    height: '30%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
});