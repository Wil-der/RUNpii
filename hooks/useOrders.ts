// hooks/useOrders.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useAppModal } from '@/contexts/ModalContext';
import { humanizeError } from '@/utils/humanizeError';

interface OrderRecord {
  id: string;
  status: string;
  pickup_address: string;
  delivery_address: string;
  estimated_price: number | null;
  final_price: number | null;
  created_at: string;
  customer_id: string;
  courier_id: string | null;
  recipient_id: string;
}

const PAGE_SIZE = 20;

export function useOrders() {
  const { user } = useAuth();
  const { showModal } = useAppModal();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadOrders = useCallback(async (silent = false, reset = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    if (reset) {
      setPage(0);
      setHasMore(true);
    }
    const currentPage = reset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const query = supabase
        .from('orders')
        .select('id, status, pickup_address, delivery_address, estimated_price, final_price, created_at, customer_id, courier_id, recipient_id')
        .or(`customer_id.eq.${user.id},courier_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (showHistory) {
        query.in('status', ['delivered', 'cancelled', 'returned']);
      } else {
        query.not('status', 'in', '("cancelled","delivered","returned")');
      }

      const { data, error } = await query;
      if (error) throw error;

      const newOrders = (data as OrderRecord[]) || [];
      if (reset) {
        setOrders(newOrders);
      } else {
        setOrders(prev => [...prev, ...newOrders]);
      }
      setHasMore(newOrders.length === PAGE_SIZE);
      setPage(currentPage + 1);
    } catch (error: unknown) {
      const friendly = humanizeError(error instanceof Error ? error : 'Error desconocido al cargar pedidos.');
      if (__DEV__) console.error('Error al cargar pedidos:', error);
      setError(friendly);
      if (!silent) showModal({ title: 'Error', message: friendly, type: 'info' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, showHistory, page]);

  useEffect(() => {
    loadOrders(false, true);
  }, [showHistory]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadOrders(true);
    }
  }, [loading, hasMore, loadOrders]);

  useEffect(() => {
    if (!user) return;
    const userFilter = `customer_id=eq.${user.id},courier_id=eq.${user.id},recipient_id=eq.${user.id}`;
    const channel = supabase
      .channel('orders-list')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: userFilter }, () => {
        loadOrders(false, true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadOrders]);

  return { orders, loading, error, showHistory, setShowHistory, reload: () => loadOrders(false, true), loadMore, hasMore };
}