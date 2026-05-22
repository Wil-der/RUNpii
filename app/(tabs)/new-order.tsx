// app/(tabs)/new-order.tsx
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import { useAppModal } from '@/contexts/ModalContext';
import { MAP_STYLE } from '@/lib/mapConfig';
import { API_TIMEOUTS } from '@/constants/api';  // ← añadir

MapLibreGL.setAccessToken(null);

// ---- Geocodificación con Nominatim (OpenStreetMap) ----
const nominatimReverse = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=es`,
      { signal: controller.signal, headers: { 'User-Agent': 'RUNpiiApp/1.0' } }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
};

const getAddressFromCoords = async (lat: number, lng: number, fallback: string): Promise<string> => {
  try {
    const [addr] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (addr) {
      const formatted = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
      if (formatted) return formatted;
    }
  } catch {}
  const nominatim = await nominatimReverse(lat, lng);
  return nominatim || fallback;
};

export default function NewOrderScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();
  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const mountedRef = useRef(true); // ← para evitar updates sobre componente desmontado

  // Marcar como desmontado al salir
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (profile && profile.role !== 'customer') {
      showModal({ title: 'Solo clientes', message: 'Debes iniciar sesión como cliente para crear un pedido.', type: 'info' });
      router.back();
    }
  }, [profile]);

  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packageSize, setPackageSize] = useState('small');
  const [weight, setWeight] = useState('');
  const [isFragile, setIsFragile] = useState(false);
  const [description, setDescription] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const packageSizes = ['small', 'medium', 'large', 'extra_large'] as const;
  const packageSizeLabels: Record<string, string> = {
    small: 'Pequeño',
    medium: 'Mediano',
    large: 'Grande',
    extra_large: 'Extra grande',
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la ubicación.', type: 'info' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      if (!mountedRef.current) return;
      setPickupCoords({ latitude, longitude });
      const addr = await getAddressFromCoords(latitude, longitude, 'Ubicación actual');
      if (!mountedRef.current) return;
      setPickupAddress(addr);
    })();
  }, []);

  // Mover cámara cuando tengamos la ubicación
  useEffect(() => {
    if (!pickupCoords || !mapReady) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [pickupCoords.longitude, pickupCoords.latitude],
      zoomLevel: 14,
      animationDuration: 500,
    });
  }, [pickupCoords, mapReady]);

  const handleMapPress = async (e: any) => {
    const [longitude, latitude] = e.geometry.coordinates;
    if (!mountedRef.current) return;
    setDeliveryCoords({ latitude, longitude });
    const addr = await getAddressFromCoords(latitude, longitude, 'Punto de entrega');
    if (!mountedRef.current) return;
    setDeliveryAddress(addr);
  };

  const handleCreateOrder = async () => {
    if (!pickupCoords || !deliveryCoords) {
      showModal({ title: 'Error', message: 'Selecciona los puntos de recogida y entrega en el mapa.', type: 'info' });
      return;
    }
    if (!recipientEmail.trim()) {
      showModal({ title: 'Error', message: 'El email del destinatario es obligatorio.', type: 'info' });
      return;
    }

    if (!mountedRef.current) return;
    setIsLoading(true);

    // AbortController para cancelar la petición si el componente se desmonta
    const abortController = new AbortController();

    try {
      // Envolver la petición RPC con un timeout que distinga el motivo del fallo
      const timeoutMs = API_TIMEOUTS.FIND_RECIPIENT;  // ← reemplazar 10000;
      const rpcPromise = supabase.rpc('get_user_id_by_email', {
        user_email: recipientEmail.trim().toLowerCase(),
      });

      const { result, timedOut } = await promiseWithTimeout(rpcPromise, timeoutMs, abortController.signal);

      if (!mountedRef.current) return;

      if (timedOut) {
        showModal({ title: 'Tiempo agotado', message: 'La búsqueda del destinatario tardó demasiado. Verifica tu conexión e inténtalo de nuevo.', type: 'info' });
        return;
      }

      if (!result || !result.data) {
        showModal({ title: 'Error', message: 'Email no encontrado o no verificado.', type: 'info' });
        return;
      }

      const recipientId = result.data;

      const { data: recipientProfile, error: profileError } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('id', recipientId)
        .single();

      if (!mountedRef.current) return;

      if (profileError || !recipientProfile) {
        showModal({ title: 'Error', message: 'El destinatario no tiene perfil.', type: 'info' });
        return;
      }

      const { data: orderId, error: createError } = await supabase.rpc('create_order', {
        p_customer_id: profile.id,
        p_recipient_id: recipientId,
        p_pickup_lat: pickupCoords.latitude,
        p_pickup_lng: pickupCoords.longitude,
        p_delivery_lat: deliveryCoords.latitude,
        p_delivery_lng: deliveryCoords.longitude,
        p_pickup_address: pickupAddress || 'Ubicación actual',
        p_delivery_address: deliveryAddress || 'Punto de entrega',
        p_package_size: packageSize,
        p_package_weight_kg: weight ? parseFloat(weight) : null,
        p_is_fragile: isFragile,
        p_package_description: description,
        p_special_instructions: specialInstructions,
      });

      if (!mountedRef.current) return;

      if (createError) {
        showModal({ title: 'Error', message: 'No se pudo crear el pedido: ' + createError.message, type: 'info' });
        return;
      }

      router.replace({ pathname: '/(tabs)/select-courier', params: { order_id: orderId } });
    } catch (error: any) {
      if (!mountedRef.current) return;
      if (error.name === 'AbortError') return; // el componente se desmontó, no hacer nada
      showModal({ title: 'Error', message: 'Ocurrió un problema al crear el pedido.', type: 'info' });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#F7C925" />
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo pedido</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Mapa */}
        <View style={styles.mapContainer}>
          <MapLibreGL.MapView
            style={styles.map}
            styleURL={MAP_STYLE}
            logoEnabled={false}
            attributionEnabled={false}
            onDidFinishLoadingMap={() => { if (mountedRef.current) setMapReady(true); }}
            onPress={handleMapPress}
          >
            <MapLibreGL.Camera ref={cameraRef} />

            {/* Marcador recogida */}
            {pickupCoords && (
              <MapLibreGL.PointAnnotation
                id="pickup"
                coordinate={[pickupCoords.longitude, pickupCoords.latitude]}
                title="Recogida"
                draggable
                onDragEnd={async (e: any) => {
                  const [longitude, latitude] = e.geometry.coordinates;
                  if (!mountedRef.current) return;
                  setPickupCoords({ latitude, longitude });
                  const addr = await getAddressFromCoords(latitude, longitude, 'Ubicación actual');
                  if (!mountedRef.current) return;
                  setPickupAddress(addr);
                }}
              >
                <View style={[styles.marker, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.markerText}>R</Text>
                </View>
              </MapLibreGL.PointAnnotation>
            )}

            {/* Marcador entrega */}
            {deliveryCoords && (
              <MapLibreGL.PointAnnotation
                id="delivery"
                coordinate={[deliveryCoords.longitude, deliveryCoords.latitude]}
                title="Entrega"
              >
                <View style={[styles.marker, { backgroundColor: '#3B82F6' }]}>
                  <Text style={styles.markerText}>E</Text>
                </View>
              </MapLibreGL.PointAnnotation>
            )}
          </MapLibreGL.MapView>

          {/* Hint para el usuario */}
          {!deliveryCoords && (
            <View style={styles.mapHint}>
              <Text style={styles.mapHintText}>Toca el mapa para marcar el punto de entrega</Text>
            </View>
          )}
        </View>

        {/* Direcciones detectadas */}
        <View style={styles.addressRow}>
          <View style={styles.addressItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.addressText} numberOfLines={1}>{pickupAddress || 'Obteniendo ubicación...'}</Text>
          </View>
          {deliveryAddress ? (
            <View style={styles.addressItem}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.addressText} numberOfLines={1}>{deliveryAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* Formulario */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.contentScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Destinatario</Text>
            <TextInput
              style={styles.input}
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              placeholder="Email registrado en RUNpii"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.sectionTitle}>Tamaño del paquete</Text>
            <View style={styles.chipRow}>
              {packageSizes.map(size => (
                <TouchableOpacity
                  key={size}
                  style={[styles.chip, packageSize === size && styles.chipActive]}
                  onPress={() => setPackageSize(size)}
                >
                  <Text style={[styles.chipText, packageSize === size && styles.chipTextActive]}>
                    {packageSizeLabels[size]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Peso (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="2.5"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={{ justifyContent: 'center', marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Frágil</Text>
                <Switch
                  value={isFragile}
                  onValueChange={setIsFragile}
                  trackColor={{ false: '#ccc', true: '#F7C925' }}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="Documentos, ropa..."
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.sectionTitle}>Instrucciones especiales</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={specialInstructions}
              onChangeText={setSpecialInstructions}
              placeholder="Tocar timbre 3B..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.disabledButton]}
              onPress={handleCreateOrder}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#1A1A1A" />
              ) : (
                <Text style={styles.createButtonText}>Crear pedido</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// Función auxiliar para timeout con distinción del motivo
async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<{ result: T | null; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<{ result: null; timedOut: true }>(resolve => {
    timer = setTimeout(() => resolve({ result: null, timedOut: true }), timeoutMs);
  });

  // Si se aborta desde fuera (componente desmontado), resolvemos con timeout falso
  const abortPromise = signal
    ? new Promise<{ result: null; timedOut: false }>((resolve) => {
        signal.addEventListener('abort', () => resolve({ result: null, timedOut: false }));
      })
    : undefined;

  try {
    const winner = await Promise.race([
      promise.then(result => ({ result, timedOut: false })),
      timeoutPromise,
      ...(abortPromise ? [abortPromise] : []),
    ]);

    clearTimeout(timer!);
    return winner;
  } catch {
    clearTimeout(timer!);
    return { result: null, timedOut: false };
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  mapContainer: { height: '30%', position: 'relative' },
  map: { flex: 1 },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapHintText: { color: '#FFFFFF', fontFamily: 'Inter_400Regular', fontSize: 12 },
  addressRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  addressItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  addressText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', flex: 1 },
  contentScroll: { flexGrow: 1, paddingBottom: 40 },
  form: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#1A1A1A',
  },
  multiline: { minHeight: 80 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  chipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  chipTextActive: { color: '#1A1A1A' },
  createButton: {
    backgroundColor: '#F7C925',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
  },
  disabledButton: { opacity: 0.6 },
  createButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
});