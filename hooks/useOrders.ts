// hooks/useOrders.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export function useOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // `silent` evita mostrar el indicador de carga global
  const loadOrders = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const query = supabase
        .from('orders')
        .select('id, status, pickup_address, delivery_address, estimated_price, final_price, created_at, customer_id, courier_id, recipient_id')
        .or(`customer_id.eq.${user.id},courier_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (showHistory) {
        query.in('status', ['delivered', 'cancelled', 'returned']);
      } else {
        query.not('status', 'in', '("cancelled","delivered","returned")');
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error('Error al cargar pedidos:', error.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, showHistory]);

  useEffect(() => {
    loadOrders(); // carga inicial con loading
  }, [loadOrders]);

  // Suscripción en tiempo real con recarga silenciosa
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('orders-list')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          loadOrders(true); // recarga silenciosa, sin parpadeo
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadOrders]);

  return { orders, loading, showHistory, setShowHistory, reload: () => loadOrders() };
}