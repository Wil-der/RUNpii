// hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useAppModal } from '@/contexts/ModalContext';
import { humanizeError } from '@/utils/humanizeError';

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  sent_at: string;
  attachment_url?: string | null;
}

interface SenderProfile {
  id: string;
  full_name: string | null;
}

const PAGE_SIZE = 50;

export function useChat(orderId: string | undefined) {
  const { profile } = useAuth();
  const { showModal } = useAppModal();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const nameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    nameCache.current.clear();
    pageRef.current = 1;
    setHasMore(true);
  }, [orderId]);

  const getNameForSender = useCallback(async (senderId: string): Promise<string> => {
    const cached = nameCache.current.get(senderId);
    if (cached) return cached;
    const { data: pd } = await supabase.from('public_profiles').select('full_name').eq('id', senderId).single();
    const name = pd?.full_name || 'Usuario';
    nameCache.current.set(senderId, name);
    return name;
  }, []);

  const loadMessages = useCallback(async (reset = false) => {
    if (!orderId) return;
    if (reset) {
      pageRef.current = 1;
      setHasMore(true);
    }
    setLoading(true);
    setError(null);
    const from = (pageRef.current - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('sent_at', { ascending: true })
      .range(from, to);

    if (error) {
      const friendly = humanizeError(error);
      if (__DEV__) console.error('Error al cargar mensajes:', error.message);
      setError(friendly);
      showModal({ title: 'Error', message: friendly, type: 'info' });
      setLoading(false);
      return;
    }

    if (data) {
      const typedMessages = data as ChatMessage[];
      const senderIds = [...new Set(typedMessages.map(m => m.sender_id))];
      await Promise.all(senderIds.map(id => getNameForSender(id)));

      const enriched = typedMessages.map(m => ({
        ...m,
        sender_name: nameCache.current.get(m.sender_id) || 'Usuario',
      }));

      if (reset) {
        setMessages(enriched);
      } else {
        setMessages(prev => [...enriched, ...prev]);
      }
      setHasMore(typedMessages.length === PAGE_SIZE);
      if (typedMessages.length === PAGE_SIZE) pageRef.current += 1;
    }
    setLoading(false);
  }, [orderId, getNameForSender]);

  useEffect(() => {
    loadMessages(true);
    if (!orderId) return;
    const subscription = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, async (payload) => {
        const newMsg = payload.new as ChatMessage;
        const name = await getNameForSender(newMsg.sender_id);
        newMsg.sender_name = name;
        setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [orderId, loadMessages, getNameForSender]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadMessages(false);
  }, [loading, hasMore, loadMessages]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || !profile) return false;
    const { error } = await supabase.from('messages').insert({ order_id: orderId, sender_id: profile.id, content: text.trim() });
    if (error) {
      if (__DEV__) console.error('Error al enviar mensaje:', error.message);
      showModal({ title: 'Error', message: humanizeError(error), type: 'info' });
    }
    return !error;
  }, [orderId, profile]);

  const sendImage = useCallback(async (imageUri: string) => {
    if (!profile || !orderId) return false;
    try {
      const blob = await (await fetch(imageUri)).blob();
      const arr = await blob.arrayBuffer();
      const path = `chat/${orderId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('chat-attachments').upload(path, arr, { contentType: 'image/jpeg' });
      if (upErr) {
        if (__DEV__) console.error('Error al subir imagen:', upErr.message);
        showModal({ title: 'Error', message: humanizeError(upErr), type: 'info' });
        return false;
      }
      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || '';
      const { error: insertErr } = await supabase.from('messages').insert({ order_id: orderId, sender_id: profile.id, content: '', attachment_url: publicUrl });
      if (insertErr) {
        if (__DEV__) console.error('Error al guardar mensaje con imagen:', insertErr.message);
        showModal({ title: 'Error', message: humanizeError(insertErr), type: 'info' });
      }
      return !insertErr;
    } catch (error: unknown) {
      if (__DEV__) console.error('Error al enviar imagen:', error);
      showModal({ title: 'Error', message: 'No se pudo enviar la imagen.', type: 'info' });
      return false;
    }
  }, [orderId, profile]);

  return { messages, loading, error, sendText, sendImage, loadMore, hasMore };
}