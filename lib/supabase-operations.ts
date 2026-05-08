import { supabase } from './supabase';
import { Tables } from '@/types/supabase';

// Tipos de datos basados en el esquema real
export type Profile = Tables<'profiles'>['Row'];
export type Order = Tables<'orders'>['Row'];
export type Message = Tables<'messages'>['Row'];
export type CourierLocation = Tables<'courier_locations'>['Row'];
export type Rating = Tables<'ratings'>['Row'];

// Operaciones de profiles
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const updateCourierAvailability = async (userId: string, status: Profile['availability_status']) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ availability_status: status })
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const updateCourierLocation = async (courierId: string, location: { latitude: number; longitude: number }) => {
  const { data, error } = await supabase
    .from('courier_locations')
    .insert({
      courier_id: courierId,
      location: `POINT(${location.longitude} ${location.latitude})`,
    })
    .select()
    .single();
  return { data, error };
};

// Operaciones de orders
export const getMyOrders = async (userId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .or(`customer_id.eq.${userId},courier_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getOrder = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  return { data, error };
};

export const createOrder = async (order: Partial<Order>) => {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  return { data, error };
};

export const updateOrderStatus = async (orderId: string, status: Order['status']) => {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
  return { data, error };
};

// Operaciones de mensajes
export const getMessages = async (orderId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles:sender_id(full_name, avatar_url)')
    .eq('order_id', orderId)
    .order('sent_at', { ascending: true });
  return { data, error };
};

export const sendMessage = async (orderId: string, senderId: string, content: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, content })
    .select()
    .single();
  return { data, error };
};

// Operaciones de rating
export const rateUser = async (orderId: string, fromUserId: string, toUserId: string, rating: number, comment?: string) => {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ order_id: orderId, from_user_id: fromUserId, to_user_id: toUserId, rating, comment })
    .select()
    .single();
  return { data, error };
};

// Suscripciones en tiempo real
export const subscribeToMessages = (orderId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${orderId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` }, (payload) => {
      callback(payload.new as Message);
    })
    .subscribe();
};

export const subscribeToOrderStatus = (orderId: string, callback: (order: Order) => void) => {
  return supabase
    .channel(`orders:${orderId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
      callback(payload.new as Order);
    })
    .subscribe();
};