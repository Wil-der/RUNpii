// hooks/useSelectCourier.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

export interface OrderMapData {
  id: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  pickup_location: { latitude: number; longitude: number } | null;
  delivery_location: { latitude: number; longitude: number } | null;
}

export interface Courier {
  courier_id: string;
  full_name: string;
  avatar_url: string | null;
  rating_average: number;
  total_ratings: number;
  vehicle_type: string;
  max_package_size: string;
  max_weight_kg: number | null;
  price_per_km: number;
  distance_km: number;
  courier_lat: number;
  courier_lng: number;
  estimated_price?: number;
}

const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function useSelectCourier(orderId: string | undefined) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderMapData | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      // Obtener coordenadas del pedido
      const { data: orderData, error: orderError } = await supabase
        .rpc('get_order_for_map', { p_order_id: orderId });

      if (orderError || !orderData || orderData.length === 0) {
        throw new Error('No se pudo cargar el pedido');
      }

      const info = orderData[0];
      const pickupCoords = {
        latitude: info.pickup_lat,
        longitude: info.pickup_lng,
      };
      const deliveryCoords = {
        latitude: info.delivery_lat,
        longitude: info.delivery_lng,
      };

      setOrder({
        id: info.id,
        pickup_address: info.pickup_address,
        delivery_address: info.delivery_address,
        status: info.status,
        pickup_location: pickupCoords,
        delivery_location: deliveryCoords,
      });

      // Calcular distancia total
      const tripDistance = haversineDistance(
        pickupCoords.latitude, pickupCoords.longitude,
        deliveryCoords.latitude, deliveryCoords.longitude
      );
      setTotalDistance(tripDistance);

      // Obtener mensajeros cercanos
      const { data: couriersData, error: couriersError } = await supabase.rpc('nearby_couriers', {
        pickup_lat: pickupCoords.latitude,
        pickup_lng: pickupCoords.longitude,
        max_distance_km: 50,
        limit_count: 20,
      });

      if (couriersError) throw couriersError;

      // Añadir precio estimado
      const enriched = (couriersData as Courier[]).map((c) => ({
        ...c,
        estimated_price: +(tripDistance * c.price_per_km).toFixed(2),
      }));

      setCouriers(enriched);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      router.back();
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignCourier = async (courierId: string) => {
    setSelecting(courierId);
    try {
      const { error } = await supabase.functions.invoke('select-courier', {
        body: { order_id: orderId, courier_id: courierId },
      });
      if (error) throw new Error(error.message);
      Alert.alert('Asignado', 'El mensajero ha sido notificado. Espera su confirmación.');
      router.replace({ pathname: '/(tabs)/order-detail', params: { order_id: orderId } });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSelecting(null);
    }
  };

  return {
    order,
    couriers,
    loading,
    selecting,
    totalDistance,
    assignCourier,
    reload: loadData,
  };
}