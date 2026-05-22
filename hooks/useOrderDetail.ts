// hooks/useOrderDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import { useAppModal } from '@/contexts/ModalContext';
import { humanizeError } from '@/utils/humanizeError';

export interface OrderCoords {
  latitude: number;
  longitude: number;
}

export interface OrderData {
  id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  pickup_location: OrderCoords | null;
  delivery_location: OrderCoords | null;
  estimated_price: number | null;
  courier_id: string | null;
  recipient_id: string;
  customer_id: string;
  verification_code: string | null;
  delivery_photo_url: string | null;
  package_size: string;
  package_weight_kg: number | null;
  is_fragile?: boolean;
  package_description?: string | null;
  special_instructions?: string | null;
}

export function useOrderDetail(orderId: string | undefined) {
  const { profile } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [courierLocation, setCourierLocation] = useState<OrderCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) throw new Error('No se pudo cargar el pedido');

      const { data: coordsData } = await supabase
        .rpc('get_order_for_map', { p_order_id: orderId });

      let pickupCoords: OrderCoords | null = null;
      let deliveryCoords: OrderCoords | null = null;

      if (coordsData && coordsData.length > 0) {
        pickupCoords = {
          latitude: coordsData[0].pickup_lat,
          longitude: coordsData[0].pickup_lng,
        };
        deliveryCoords = {
          latitude: coordsData[0].delivery_lat,
          longitude: coordsData[0].delivery_lng,
        };
      }

      const orderData: OrderData = {
        id: data.id,
        status: data.status,
        pickup_address: data.pickup_address,
        delivery_address: data.delivery_address,
        pickup_location: pickupCoords,
        delivery_location: deliveryCoords,
        estimated_price: data.estimated_price,
        courier_id: data.courier_id,
        recipient_id: data.recipient_id,
        customer_id: data.customer_id,
        verification_code: data.verification_code,
        delivery_photo_url: data.delivery_photo_url,
        package_size: data.package_size,
        package_weight_kg: data.package_weight_kg,
        is_fragile: data.is_fragile,
        package_description: data.package_description,
        special_instructions: data.special_instructions,
      };

      setOrder(orderData);

      if (data.courier_id && ['assigned', 'picked_up', 'in_transit'].includes(data.status)) {
        const { data: locData, error: locError } = await supabase
          .rpc('get_courier_location', { p_courier_id: data.courier_id });

        if (!locError && locData && locData.length > 0) {
          setCourierLocation({
            latitude: locData[0].courier_lat,
            longitude: locData[0].courier_lng,
          });
        } else {
          setCourierLocation(null);
        }
      } else {
        setCourierLocation(null);
      }
    } catch (error: any) {
      showModal({ title: 'Error', message: humanizeError(error), type: 'info' });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    loadOrder();

    const subscription = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [orderId, loadOrder]);

  const handleAction = async (action: string, extraBody?: any) => {
    setActionLoading(action);
    try {
      const { error } = await supabase.functions.invoke(action, {
        body: { order_id: orderId, ...extraBody },
      });
      if (error) throw new Error(error.message);
      await loadOrder();
    } catch (error: any) {
      showModal({ title: 'Error', message: humanizeError(error), type: 'info' });
    } finally {
      setActionLoading(null);
    }
  };

  const acceptOrder = () => handleAction('accept-order');
  const rejectOrder = () => handleAction('reject-order');
  const confirmPickup = () => handleAction('confirm-pickup');

  const confirmDelivery = (code: string, photoBase64?: string) => {
    if (!code.trim()) {
      showModal({
        title: 'Código requerido',
        message: 'Ingresa el código de verificación del destinatario.',
        type: 'info',
      });
      return;
    }
    if (!photoBase64) {
      showModal({
        title: 'Foto requerida',
        message: 'Debes tomar una foto del comprobante de entrega.',
        type: 'info',
      });
      return;
    }
    handleAction('confirm-delivery', {
      verification_code: code.trim(),
      photo_base64: photoBase64,
    });
  };

  const initiateReturn = () =>
    handleAction('initiate-return', { reason: 'No se pudo entregar' });

  const cancelOrder = () => {
    showModal({
      title: 'Cancelar pedido',
      message: '¿Seguro que deseas cancelar este pedido?',
      type: 'confirm',
      confirmText: 'Sí, cancelar',
      cancelText: 'No',
      onConfirm: () => handleAction('cancel-order', { cancel_reason: 'Cancelado por el cliente' }),
    });
  };

  const searchCouriers = useCallback(() => {
    if (orderId) {
      router.push({ pathname: '/(tabs)/select-courier', params: { order_id: orderId } });
    }
  }, [orderId, router]);

  return {
    order,
    courierLocation,
    loading,
    actionLoading,
    profile,
    acceptOrder,
    rejectOrder,
    confirmPickup,
    confirmDelivery,
    initiateReturn,
    cancelOrder,
    searchCouriers,
    reload: loadOrder,
  };
}