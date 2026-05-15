import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Intentar obtener variables desde process.env (web, Expo con .env)
// o desde Constants.expoConfig.extra (nativo con app.json extra)
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  Constants.expoConfig?.extra?.SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

console.log('[Supabase] URL:', supabaseUrl ? 'set' : 'MISSING');
console.log('[Supabase] Key:', supabaseAnonKey ? 'set' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing environment variables.');
  console.error('  Checked: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, app.json extra, process.env');
  throw new Error('Supabase credentials not found. Configure .env (web) or app.json (native).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});