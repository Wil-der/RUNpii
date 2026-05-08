export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'customer' | 'courier' | 'admin';
          full_name: string | null;
          avatar_url: string | null;
          address: string | null;
          id_card_number: string | null;
          id_card_front_url: string | null;
          id_card_back_url: string | null;
          verification_status: 'pending' | 'approved' | 'rejected';
          verified_by: string | null;
          verified_at: string | null;
          is_active: boolean;
          vehicle_type: 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck' | null;
          max_package_size: 'small' | 'medium' | 'large' | 'extra_large' | null;
          max_weight_kg: number | null;
          service_zone: unknown | null;
          price_per_km: number | null;
          availability_status: 'available' | 'pending_acceptance' | 'busy' | 'offline';
          rating_average: number;
          total_ratings: number;
          preferred_language: string;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          role?: 'customer' | 'courier' | 'admin';
          full_name?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          id_card_number?: string | null;
          id_card_front_url?: string | null;
          id_card_back_url?: string | null;
          verification_status?: 'pending' | 'approved' | 'rejected';
          verified_by?: string | null;
          verified_at?: string | null;
          is_active?: boolean;
          vehicle_type?: 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck' | null;
          max_package_size?: 'small' | 'medium' | 'large' | 'extra_large' | null;
          max_weight_kg?: number | null;
          service_zone?: unknown | null;
          price_per_km?: number | null;
          availability_status?: 'available' | 'pending_acceptance' | 'busy' | 'offline';
          rating_average?: number;
          total_ratings?: number;
          preferred_language?: string;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          role?: 'customer' | 'courier' | 'admin';
          full_name?: string | null;
          avatar_url?: string | null;
          address?: string | null;
          id_card_number?: string | null;
          id_card_front_url?: string | null;
          id_card_back_url?: string | null;
          verification_status?: 'pending' | 'approved' | 'rejected';
          verified_by?: string | null;
          verified_at?: string | null;
          is_active?: boolean;
          vehicle_type?: 'bicycle' | 'motorcycle' | 'car' | 'van' | 'truck' | null;
          max_package_size?: 'small' | 'medium' | 'large' | 'extra_large' | null;
          max_weight_kg?: number | null;
          service_zone?: unknown | null;
          price_per_km?: number | null;
          availability_status?: 'available' | 'pending_acceptance' | 'busy' | 'offline';
          rating_average?: number;
          total_ratings?: number;
          preferred_language?: string;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          recipient_id: string;
          courier_id: string | null;
          pickup_location: unknown | null;
          delivery_location: unknown | null;
          pickup_address: string;
          delivery_address: string;
          package_size: 'small' | 'medium' | 'large' | 'extra_large';
          package_weight_kg: number | null;
          is_fragile: boolean;
          package_description: string | null;
          special_instructions: string | null;
          contactless_delivery: boolean;
          signature_required: boolean;
          estimated_price: number | null;
          final_price: number | null;
          currency: string;
          payment_method: 'cash' | 'card' | 'wallet' | null;
          payment_status: 'unpaid' | 'paid' | 'refunded';
          platform_fee_percent: number;
          status: 'pending' | 'awaiting_courier' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'delivery_failed' | 'returning' | 'returned' | 'cancelled';
          assignment_expires_at: string | null;
          verification_code: string | null;
          verification_attempts: number;
          delivery_photo_url: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          cancelled_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id: string;
          recipient_id: string;
          courier_id?: string | null;
          pickup_location?: unknown | null;
          delivery_location?: unknown | null;
          pickup_address: string;
          delivery_address: string;
          package_size: 'small' | 'medium' | 'large' | 'extra_large';
          package_weight_kg?: number | null;
          is_fragile?: boolean;
          package_description?: string | null;
          special_instructions?: string | null;
          contactless_delivery?: boolean;
          signature_required?: boolean;
          estimated_price?: number | null;
          final_price?: number | null;
          currency?: string;
          payment_method?: 'cash' | 'card' | 'wallet' | null;
          payment_status?: 'unpaid' | 'paid' | 'refunded';
          platform_fee_percent?: number;
          status?: 'pending' | 'awaiting_courier' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'delivery_failed' | 'returning' | 'returned' | 'cancelled';
          assignment_expires_at?: string | null;
          verification_code?: string | null;
          verification_attempts?: number;
          delivery_photo_url?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string;
          recipient_id?: string;
          courier_id?: string | null;
          pickup_location?: unknown | null;
          delivery_location?: unknown | null;
          pickup_address?: string;
          delivery_address?: string;
          package_size?: 'small' | 'medium' | 'large' | 'extra_large';
          package_weight_kg?: number | null;
          is_fragile?: boolean;
          package_description?: string | null;
          special_instructions?: string | null;
          contactless_delivery?: boolean;
          signature_required?: boolean;
          estimated_price?: number | null;
          final_price?: number | null;
          currency?: string;
          payment_method?: 'cash' | 'card' | 'wallet' | null;
          payment_status?: 'unpaid' | 'paid' | 'refunded';
          platform_fee_percent?: number;
          status?: 'pending' | 'awaiting_courier' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'delivery_failed' | 'returning' | 'returned' | 'cancelled';
          assignment_expires_at?: string | null;
          verification_code?: string | null;
          verification_attempts?: number;
          delivery_photo_url?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          order_id: string;
          sender_id: string;
          content: string;
          attachment_url: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          sender_id: string;
          content: string;
          attachment_url?: string | null;
          sent_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          sender_id?: string;
          content?: string;
          attachment_url?: string | null;
          sent_at?: string;
        };
      };
      courier_locations: {
        Row: {
          id: string;
          courier_id: string;
          location: unknown;
          accuracy_meters: number | null;
          speed_kmh: number | null;
          heading: number | null;
          battery_level: number | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          courier_id: string;
          location: unknown;
          accuracy_meters?: number | null;
          speed_kmh?: number | null;
          heading?: number | null;
          battery_level?: number | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          courier_id?: string;
          location?: unknown;
          accuracy_meters?: number | null;
          speed_kmh?: number | null;
          heading?: number | null;
          battery_level?: number | null;
          timestamp?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          order_id: string;
          from_user_id: string;
          to_user_id: string;
          rating: number;
          tags: string[] | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          from_user_id: string;
          to_user_id: string;
          rating: number;
          tags?: string[] | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          from_user_id?: string;
          to_user_id?: string;
          rating?: number;
          tags?: string[] | null;
          comment?: string | null;
          created_at?: string;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];