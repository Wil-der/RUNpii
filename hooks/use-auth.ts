// hooks/useAuth.ts
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile, getProfile, updateProfile } from '@/lib/supabase-operations';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false); // ← NUEVO

  const previousAvailability = useRef<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await getProfile(session.user.id);
          setProfile(data);
          if (data?.role === 'courier') {
            previousAvailability.current = data.availability_status;
          }
        }
      } catch (err) {
        if (__DEV__) console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await getProfile(session.user.id);
          setProfile(data);
          if (data?.role === 'courier') {
            previousAvailability.current = data.availability_status;
          }
        } else {
          setProfile(null);
          previousAvailability.current = null;
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile || profile.role !== 'courier') return;

    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      // Actualizar estado offline global
      setIsOffline(!state.isConnected);
      handleConnectivityChange(state.isConnected);
    });

    const subscriptionAppState = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        NetInfo.fetch().then((state) => {
          setIsOffline(!state.isConnected);
          handleConnectivityChange(state.isConnected);
        });
      }
      appState.current = nextAppState;
    });

    return () => {
      unsubscribeNetInfo();
      subscriptionAppState.remove();
    };
  }, [profile?.id, profile?.role, profile?.availability_status, profile?.is_active]);

  // Para usuarios no mensajeros, también queremos el banner offline
  useEffect(() => {
    if (profile && profile.role === 'courier') return; // ya lo maneja el efecto anterior

    const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOffline(!state.isConnected);
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, [profile?.role]);

  const handleConnectivityChange = async (isConnected: boolean | null) => {
    if (!profile || profile.role !== 'courier' || !profile.is_active) return;
    if (isConnected === null) return;

    try {
      if (!isConnected) {
        if (profile.availability_status === 'available' || profile.availability_status === 'busy') {
          previousAvailability.current = profile.availability_status;
          await updateProfile(profile.id, { availability_status: 'offline' });
          setProfile((prev) => prev ? { ...prev, availability_status: 'offline' } : null);
        }
      } else {
        if (profile.availability_status === 'offline' && previousAvailability.current) {
          const newStatus = previousAvailability.current;
          await updateProfile(profile.id, { availability_status: newStatus });
          setProfile((prev) => prev ? { ...prev, availability_status: newStatus } : null);
          previousAvailability.current = null;
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error al actualizar disponibilidad por conectividad:', error);
    }
  };

  // Heartbeat: actualizar last_seen cada 60 segundos si está como mensajero y activo
  useEffect(() => {
    if (!profile || profile.role !== 'courier' || !profile.is_active) return;
    if (profile.availability_status !== 'available' && profile.availability_status !== 'busy') return;

    const interval = setInterval(async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', profile.id);

        if (error && __DEV__) {
          console.warn('⚠️ Heartbeat falló (last_seen):', error.message);
        }
      } catch (err) {
        if (__DEV__) console.warn('⚠️ Heartbeat excepción:', err);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [profile?.id, profile?.role, profile?.is_active, profile?.availability_status]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, role?: 'customer' | 'courier') => {
    const options = role ? { data: { role } } : undefined;
    const { error } = await supabase.auth.signUp({ email, password, options });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setProfile(null);
      previousAvailability.current = null;
    }
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'runpiiapp://auth-callback' },
    });
    return { error };
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const { data } = await getProfile(session.user.id);
      setProfile(data);
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    isOffline, // ← NUEVO
    signIn,
    signUp,
    signOut,
    refreshProfile,
    signInWithGoogle,
    isEmailConfirmed: !!user?.email_confirmed_at,
  };
}