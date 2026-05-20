// hooks/useAdminCouriers.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useAppModal } from '@/contexts/ModalContext';

export interface AdminCourier {
  id: string;
  full_name: string;
  email: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  id_card_front_url: string | null;
  id_card_back_url: string | null;
  verified_at: string | null;
  created_at: string;
}

type FilterType = 'pending' | 'approved' | 'rejected';

export function useAdminCouriers() {
  const { profile } = useAuth();
  const { showModal } = useAppModal();
  const [couriers, setCouriers] = useState<AdminCourier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadCouriers = useCallback(async () => {
    if (!profile || profile.role !== 'admin') return;
    
    setLoading(true);
    try {
      // Obtener la lista de usuarios auth con sus perfiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          verification_status,
          id_card_front_url,
          id_card_back_url,
          verified_at,
          created_at
        `)
        .eq('role', 'courier')
        .eq('verification_status', filter)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener los emails desde auth.users (requiere función RPC)
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_by_ids', { user_ids: data?.map(c => c.id) || [] });

      if (!usersError && usersData) {
        const emailMap = (usersData as any[]).reduce((acc, u) => {
          acc[u.id] = u.email;
          return acc;
        }, {} as Record<string, string>);

        setCouriers(data?.map(c => ({
          ...c,
          email: emailMap[c.id] || 'Sin email'
        })) || []);
      } else {
        setCouriers(data || []);
      }
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      setLoading(false);
    }
  }, [profile, filter]);

  useEffect(() => {
    loadCouriers();
  }, [loadCouriers]);

  const handleVerify = useCallback(async (courierId: string, status: 'approved' | 'rejected') => {
    if (!profile || profile.role !== 'admin') return;
    
    setActionLoading(courierId);
    try {
      const updates: any = {
        verification_status: status,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', courierId);

      if (error) throw error;

      showModal({
        title: status === 'approved' ? 'Aprobado' : 'Rechazado',
        message: `El mensajero ha sido ${status === 'approved' ? 'aprobado' : 'rechazado'} correctamente.`,
        type: 'info',
      });

      // Recargar la lista
      await loadCouriers();
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      setActionLoading(null);
    }
  }, [profile, loadCouriers]);

  return {
    couriers,
    loading,
    filter,
    setFilter,
    actionLoading,
    handleVerify,
    reload: loadCouriers,
  };
}