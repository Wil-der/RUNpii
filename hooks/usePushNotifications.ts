// hooks/usePushNotifications.ts
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    registerAndSaveToken().then(async (token) => {
      if (!token) return;
      setFcmToken(token);

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: token,
        p256dh_key: 'fcm',
        auth_key: 'fcm',
        device_type: Platform.OS,
      });

      if (error) {
        console.error('Error al guardar el token FCM:', error);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notificación recibida:', notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navegación manejada en _layout.tsx
    });

    return () => {
      // Eliminar suscripciones correctamente
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  return fcmToken;
}

async function registerAndSaveToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Las notificaciones solo funcionan en dispositivos físicos');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('Permiso denegado para notificaciones');
    return null;
  }

  try {
    const devicePushToken = (await Notifications.getDevicePushTokenAsync()).data;
    console.log('Token FCM nativo:', devicePushToken);
    return devicePushToken;
  } catch (error) {
    console.warn('Error al obtener el token FCM:', error);
    return null;
  }
}