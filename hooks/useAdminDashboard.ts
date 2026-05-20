// hooks/useAdminDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppModal } from '@/contexts/ModalContext';

export interface AdminMetrics {
  totalOrders: number;
  activeOrders: number;
  activeCouriers: number;
  pendingVerifications: number;
  estimatedRevenue: number;
  averageRating: number;
}

export interface CourierForAdmin {
  id: string;
  full_name: string;
  email: string;
  verification_status: string;
  id_card_number: string | null;
  id_card_front_url: string | null;
  id_card_back_url: string | null;
  vehicle_type: string | null;
  created_at: string;
  rating_average: number;
  total_ratings: number;
}

export function useAdminDashboard() {
  const { showModal } = useAppModal();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [couriers, setCouriers] = useState<CourierForAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Obtener métricas con una sola consulta por métrica (simple y eficiente)
      const [
        { count: totalOrders },
        { count: activeOrders },
        { count: activeCouriers },
        { count: pendingVerifications },
        { data: revenueData },
        { data: ratingData },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'awaiting_courier', 'assigned', 'picked_up', 'in_transit']),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'courier').eq('is_active', true).eq('availability_status', 'available'),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'courier').eq('verification_status', 'pending'),
        supabase.from('orders').select('estimated_price')
          .in('status', ['delivered', 'returned']),
        supabase.from('profiles').select('rating_average')
          .eq('role', 'courier').gt('total_ratings', 0),
      ]);

      const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.estimated_price || 0), 0) || 0;
      const avgRating = ratingData && ratingData.length > 0
        ? ratingData.reduce((sum, p) => sum + (p.rating_average || 0), 0) / ratingData.length
        : 0;

      setMetrics({
        totalOrders: totalOrders || 0,
        activeOrders: activeOrders || 0,
        activeCouriers: activeCouriers || 0,
        pendingVerifications: pendingVerifications || 0,
        estimatedRevenue: +(totalRevenue * 0.1).toFixed(2), // 10% comisión
        averageRating: +avgRating.toFixed(1),
      });

      // Cargar mensajeros según filtro
      await loadCouriers(filter, true);
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filter]);

  const loadCouriers = useCallback(async (statusFilter: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Obtener mensajeros con el filtro de verificación
      const { data: couriersData, error } = await supabase
        .from('profiles')
        .select('id, full_name, verification_status, id_card_number, id_card_front_url, id_card_back_url, vehicle_type, created_at, rating_average, total_ratings')
        .eq('role', 'courier')
        .eq('verification_status', statusFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCouriers(couriersData || []);
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const changeFilter = (newFilter: 'pending' | 'approved' | 'rejected') => {
    setFilter(newFilter);
    loadCouriers(newFilter);
  };

  const verifyCourier = async (courierId: string, approved: boolean) => {
    setActionLoading(courierId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: approved ? 'approved' : 'rejected',
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          verified_at: new Date().toISOString(),
          is_active: approved ? true : false,
          availability_status: approved ? 'available' : 'offline',
        })
        .eq('id', courierId);

      if (error) throw error;

      showModal({
        title: approved ? 'Mensajero aprobado' : 'Mensajero rechazado',
        message: approved
          ? 'El mensajero ya puede recibir pedidos.'
          : 'El mensajero ha sido rechazado.',
        type: 'info',
      });

      // Recargar datos
      await loadDashboard(true);
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      setActionLoading(null);
    }
  };

  return {
    metrics,
    couriers,
    loading,
    filter,
    actionLoading,
    changeFilter,
    verifyCourier,
    reload: loadDashboard,
  };
}