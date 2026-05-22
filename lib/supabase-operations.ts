// lib/supabase-operations.ts
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
  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
};

export const getPublicProfiles = async (filters?: {
  role?: string;
  verification_status?: string;
  is_active?: boolean;
  availability_status?: string;
}) => {
  let query = supabase
    .from('public_profiles')
    .select('*');

  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  if (filters?.verification_status) {
    query = query.eq('verification_status', filters.verification_status);
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }
  if (filters?.availability_status) {
    query = query.eq('availability_status', filters.availability_status);
  }

  return await query;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  return await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
};

export const updateCourierAvailability = async (userId: string, status: Profile['availability_status']) => {
  return await supabase
    .from('profiles')
    .update({ availability_status: status })
    .eq('id', userId)
    .select()
    .single();
};

export const updateCourierLocation = async (courierId: string, location: { latitude: number; longitude: number }) => {
  return await supabase
    .from('courier_locations')
    .insert({
      courier_id: courierId,
      location: `POINT(${location.longitude} ${location.latitude})`,
    })
    .select()
    .single();
};

// Operaciones de orders
export const getMyOrders = async (userId: string) => {
  return await supabase
    .from('orders')
    .select('*')
    .or(`customer_id.eq.${userId},courier_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });
};

export const getOrder = async (orderId: string) => {
  return await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
};

export const createOrder = async (order: Partial<Order>) => {
  return await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
};

export const updateOrderStatus = async (orderId: string, status: Order['status']) => {
  return await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
};

// Operaciones de mensajes
export const getMessages = async (orderId: string) => {
  return await supabase
    .from('messages')
    .select('*, profiles:sender_id(full_name, avatar_url)')
    .eq('order_id', orderId)
    .order('sent_at', { ascending: true });
};

export const sendMessage = async (orderId: string, senderId: string, content: string) => {
  return await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: senderId, content })
    .select()
    .single();
};

// Operaciones de rating
export const rateUser = async (orderId: string, fromUserId: string, toUserId: string, rating: number, comment?: string) => {
  return await supabase
    .from('ratings')
    .insert({ order_id: orderId, from_user_id: fromUserId, to_user_id: toUserId, rating, comment })
    .select()
    .single();
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