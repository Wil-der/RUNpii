// components/OrderMap.tsx
import { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { supabase } from '@/lib/supabase';
import { MAP_STYLE } from '@/lib/mapConfig';

MapLibreGL.setAccessToken(null);

interface Coords { latitude: number; longitude: number }

interface Props {
  pickupCoords: Coords | null;
  deliveryCoords: Coords | null;
  courierLocation?: Coords | null;
  onRouteLoaded?: (distanceKm: number, durationMin: number) => void;
}

export default function OrderMap({
  pickupCoords,
  deliveryCoords,
  courierLocation,
  onRouteLoaded,
}: Props) {
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [courierRouteGeoJSON, setCourierRouteGeoJSON] = useState<any>(null);

  // Ruta principal recogida → entrega
  useEffect(() => {
    if (!pickupCoords || !deliveryCoords) return;

    const fetchRoute = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-route', {
          body: {
            start: [pickupCoords.longitude, pickupCoords.latitude],
            end: [deliveryCoords.longitude, deliveryCoords.latitude],
          },
        });

        if (!error && data?.polyline) {
          onRouteLoaded?.(data.distance_km, data.duration_min);
          setRouteGeoJSON({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: data.polyline.map((p: Coords) => [p.longitude, p.latitude]),
            },
            properties: {},
          });
        }
      } catch {
        // Fallback línea recta
        setRouteGeoJSON({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [pickupCoords.longitude, pickupCoords.latitude],
              [deliveryCoords.longitude, deliveryCoords.latitude],
            ],
          },
          properties: {},
        });
      }
    };

    fetchRoute();
  }, [pickupCoords?.latitude, pickupCoords?.longitude,
      deliveryCoords?.latitude, deliveryCoords?.longitude]);

  // Ruta mensajero → recogida
  useEffect(() => {
    if (!courierLocation || !pickupCoords) {
      setCourierRouteGeoJSON(null);
      return;
    }

    const fetchCourierRoute = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-route', {
          body: {
            start: [courierLocation.longitude, courierLocation.latitude],
            end: [pickupCoords.longitude, pickupCoords.latitude],
          },
        });

        if (!error && data?.polyline) {
          setCourierRouteGeoJSON({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: data.polyline.map((p: Coords) => [p.longitude, p.latitude]),
            },
            properties: {},
          });
        }
      } catch {
        setCourierRouteGeoJSON(null);
      }
    };

    fetchCourierRoute();
  }, [courierLocation?.latitude, courierLocation?.longitude]);

  // Ajustar cámara
  useEffect(() => {
    if (!pickupCoords || !deliveryCoords) return;

    const points = [
      [pickupCoords.longitude, pickupCoords.latitude],
      [deliveryCoords.longitude, deliveryCoords.latitude],
    ];
    if (courierLocation) {
      points.push([courierLocation.longitude, courierLocation.latitude]);
    }

    const lngs = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);

    cameraRef.current?.fitBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
      [60, 40, 40, 40],
      800
    );
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
      <MapLibreGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera ref={cameraRef} />

        {/* Ruta principal — amarilla */}
        {routeGeoJSON && (
          <MapLibreGL.ShapeSource id="route" shape={routeGeoJSON}>
            <MapLibreGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#F7C925',
                lineWidth: 4,
                lineJoin: 'round',
                lineCap: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Ruta mensajero → recogida — azul punteada */}
        {courierRouteGeoJSON && (
          <MapLibreGL.ShapeSource id="courierRoute" shape={courierRouteGeoJSON}>
            <MapLibreGL.LineLayer
              id="courierRouteLine"
              style={{
                lineColor: '#3B82F6',
                lineWidth: 3,
                lineDasharray: [2, 2],
                lineJoin: 'round',
              }}
            />
          </MapLibreGL.ShapeSource>
        )}

        {/* Marcador recogida */}
        <MapLibreGL.PointAnnotation
          id="pickup"
          coordinate={[pickupCoords.longitude, pickupCoords.latitude]}
          title="Recogida"
        >
          <View style={[styles.marker, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.markerText}>R</Text>
          </View>
        </MapLibreGL.PointAnnotation>

        {/* Marcador entrega */}
        <MapLibreGL.PointAnnotation
          id="delivery"
          coordinate={[deliveryCoords.longitude, deliveryCoords.latitude]}
          title="Entrega"
        >
          <View style={[styles.marker, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.markerText}>E</Text>
          </View>
        </MapLibreGL.PointAnnotation>

        {/* Marcador mensajero */}
        {courierLocation && (
          <MapLibreGL.PointAnnotation
            id="courier"
            coordinate={[courierLocation.longitude, courierLocation.latitude]}
            title="Mensajero"
          >
            <View style={[styles.marker, { backgroundColor: '#10B981' }]}>
              <Text style={styles.markerText}>M</Text>
            </View>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: '30%' },
  map: { flex: 1 },
  fallback: {
    height: '30%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280' },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});