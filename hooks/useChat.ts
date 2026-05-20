// hooks/useChat.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  sent_at: string;
  attachment_url?: string | null;
}

export function useChat(orderId: string | undefined) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('sent_at', { ascending: true });

    if (!error && data) {
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach((p: any) => (profileMap[p.id] = p.full_name || 'Usuario'));

      setMessages(
        data.map((m: any) => ({
          ...m,
          sender_name: profileMap[m.sender_id] || 'Usuario',
        }))
      );
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    loadMessages();

    if (!orderId) return;
    const subscription = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const { data: pd } = await supabase
            .from('public_profiles')
            .select('full_name')
            .eq('id', newMsg.sender_id)
            .single();
          newMsg.sender_name = pd?.full_name || 'Usuario';
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [orderId, loadMessages]);

  const sendText = useCallback(
    async (text: string) => {
      if (!text.trim() || !profile) return false;
      const { error } = await supabase.from('messages').insert({
        order_id: orderId,
        sender_id: profile.id,
        content: text.trim(),
      });
      return !error;
    },
    [orderId, profile]
  );

  const sendImage = useCallback(
    async (imageUri: string) => {
      if (!profile || !orderId) return false;
      const blob = await (await fetch(imageUri)).blob();
      const arr = await blob.arrayBuffer();
      const path = `chat/${orderId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('chat-attachments')
        .upload(path, arr, { contentType: 'image/jpeg' });
      if (upErr) return false;

      const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || '';
      const { error: insertErr } = await supabase.from('messages').insert({
        order_id: orderId,
        sender_id: profile.id,
        content: '',
        attachment_url: publicUrl,
      });
      return !insertErr;
    },
    [orderId, profile]
  );

  return { messages, loading, sendText, sendImage };
}