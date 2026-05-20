// hooks/useSelectCourier.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAppModal } from '@/contexts/ModalContext';

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

export interface CourierFilters {
  vehicleType: string | null;
  maxPrice: number | null;
  minRating: number | null;
  sortBy: 'price' | 'distance' | 'rating';
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
  const { showModal } = useAppModal();

  const [order, setOrder] = useState<OrderMapData | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [filters, setFilters] = useState<CourierFilters>({
    vehicleType: null,
    maxPrice: null,
    minRating: null,
    sortBy: 'distance',
  });

  const loadData = useCallback(async () => {
    if (!orderId) {
      console.warn('⚠️ useSelectCourier: no orderId');
      return;
    }
    setLoading(true);
    console.log('⏳ loadData iniciado, orderId:', orderId);
    try {
      // 1. Obtener coordenadas del pedido
      console.log('📡 Llamando a get_order_for_map...');
      const { data: orderData, error: orderError } = await supabase
        .rpc('get_order_for_map', { p_order_id: orderId });
      console.log('📡 get_order_for_map respuesta:', { data: orderData, error: orderError });

      if (orderError) throw new Error('Error en get_order_for_map: ' + orderError.message);
      if (!orderData || orderData.length === 0) {
        throw new Error('get_order_for_map no devolvió datos para el pedido');
      }

      const info = orderData[0];
      console.log('📍 Datos del pedido recibidos:', {
        pickup_lat: info.pickup_lat,
        pickup_lng: info.pickup_lng,
        delivery_lat: info.delivery_lat,
        delivery_lng: info.delivery_lng,
      });

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

      const tripDistance = haversineDistance(
        pickupCoords.latitude, pickupCoords.longitude,
        deliveryCoords.latitude, deliveryCoords.longitude
      );
      setTotalDistance(tripDistance);
      console.log('📏 Distancia total calculada:', tripDistance);

      // 2. Obtener mensajeros cercanos
      console.log('📡 Llamando a nearby_couriers con:', {
        lat: pickupCoords.latitude,
        lng: pickupCoords.longitude,
      });
      const { data: couriersData, error: couriersError } = await supabase.rpc('nearby_couriers', {
        pickup_lat: pickupCoords.latitude,
        pickup_lng: pickupCoords.longitude,
        max_distance_km: 50,
        limit_count: 20,
      });
      console.log('📡 nearby_couriers respuesta:', {
        data: couriersData,
        error: couriersError,
        length: couriersData?.length,
      });

      if (couriersError) throw new Error('Error en nearby_couriers: ' + couriersError.message);
      if (!couriersData || couriersData.length === 0) {
        console.warn('⚠️ No se encontraron mensajeros cercanos (array vacío).');
      }

      const enriched = (couriersData as Courier[]).map((c) => ({
        ...c,
        estimated_price: +(tripDistance * c.price_per_km).toFixed(2),
      }));

      console.log('✅ Mensajeros enriquecidos:', enriched.length);
      setCouriers(enriched);

      // Limpiar filtros al cargar nuevos datos
      setFilters({
        vehicleType: null,
        maxPrice: null,
        minRating: null,
        sortBy: 'distance',
      });
    } catch (error: any) {
      console.error('❌ Error en loadData:', error.message);
      showModal({
        title: 'Error',
        message: error.message,
        type: 'info',
      });
      router.back();
    } finally {
      setLoading(false);
      console.log('✅ loadData finalizado');
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCouriers = useMemo(() => {
    let result = [...couriers];

    if (filters.vehicleType) {
      result = result.filter((c) => c.vehicle_type === filters.vehicleType);
    }
    if (filters.maxPrice !== null) {
      result = result.filter((c) => (c.estimated_price ?? 0) <= filters.maxPrice!);
    }
    if (filters.minRating !== null) {
      result = result.filter((c) => (c.rating_average ?? 0) >= filters.minRating!);
    }

    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price':
          return (a.estimated_price ?? 0) - (b.estimated_price ?? 0);
        case 'rating':
          return (b.rating_average ?? 0) - (a.rating_average ?? 0);
        case 'distance':
        default:
          return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      }
    });

    return result;
  }, [couriers, filters]);

  const assignCourier = async (courierId: string) => {
    setSelecting(courierId);
    try {
      const { error } = await supabase.functions.invoke('select-courier', {
        body: { order_id: orderId, courier_id: courierId },
      });
      if (error) throw new Error(error.message);
      showModal({
        title: 'Asignado',
        message: 'El mensajero ha sido notificado. Espera su confirmación.',
        type: 'info',
      });
      router.replace({ pathname: '/(tabs)/order-detail', params: { order_id: orderId } });
    } catch (error: any) {
      showModal({
        title: 'Error',
        message: error.message,
        type: 'info',
      });
    } finally {
      setSelecting(null);
    }
  };

  return {
    order,
    couriers,
    filteredCouriers,
    loading,
    selecting,
    totalDistance,
    filters,
    setFilters,
    assignCourier,
    reload: loadData,
  };
}