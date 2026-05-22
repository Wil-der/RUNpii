// hooks/useRateLimit.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCKOUT_KEY = '@runpii_lockout';
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 300_000; // 30 segundos

interface LockoutState {
  attempts: number;
  lockedUntil: string | null; // ISO timestamp
}

export function useRateLimit() {
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Cargar estado al montar
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(LOCKOUT_KEY);
        if (stored) {
          const { attempts: storedAttempts, lockedUntil: storedLockedUntil } = JSON.parse(stored) as LockoutState;
          const now = Date.now();
          if (storedLockedUntil && new Date(storedLockedUntil).getTime() > now) {
            // Todavía bloqueado
            setAttempts(storedAttempts);
            setLocked(true);
            setLockedUntil(storedLockedUntil);
          } else {
            // Bloqueo expirado, limpiar
            await AsyncStorage.removeItem(LOCKOUT_KEY);
          }
        }
      } catch {}
    })();
  }, []);

  // Actualizar contador regresivo
  useEffect(() => {
    if (!locked || !lockedUntil) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(lockedUntil).getTime();
      if (now >= end) {
        // Bloqueo terminó
        setLocked(false);
        setLockedUntil(null);
        setAttempts(0);
        AsyncStorage.removeItem(LOCKOUT_KEY).catch(() => {});
        clearInterval(interval);
      } else {
        setRemainingSeconds(Math.ceil((end - now) / 1000));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [locked, lockedUntil]);

  const recordFailedAttempt = async () => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      setLocked(true);
      setLockedUntil(lockUntil);
      const state: LockoutState = { attempts: newAttempts, lockedUntil: lockUntil };
      await AsyncStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    } else {
      const state: LockoutState = { attempts: newAttempts, lockedUntil: null };
      await AsyncStorage.setItem(LOCKOUT_KEY, JSON.stringify(state));
    }
  };

  const resetAttempts = async () => {
    setAttempts(0);
    setLocked(false);
    setLockedUntil(null);
    await AsyncStorage.removeItem(LOCKOUT_KEY);
  };

  return {
    attempts,
    locked,
    remainingSeconds,
    recordFailedAttempt,
    resetAttempts,
  };
}