// app/(tabs)/new-order.tsx
import { useState, useEffect } from 'react';
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'expo-router';
import { useAppModal } from '@/contexts/ModalContext';

// ---- Geocodificación alternativa con Nominatim (OpenStreetMap) ----
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
  const [mapRegion, setMapRegion] = useState<any>(null);

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
      setPickupCoords({ latitude, longitude });
      setMapRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      const addr = await getAddressFromCoords(latitude, longitude, 'Ubicación actual');
      setPickupAddress(addr);
    })();
  }, []);

  const handleMapPress = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setDeliveryCoords(coords);
    const addr = await getAddressFromCoords(coords.latitude, coords.longitude, 'Punto de entrega');
    setDeliveryAddress(addr);
  };

  const handlePickupDrag = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setPickupCoords(coords);
    const addr = await getAddressFromCoords(coords.latitude, coords.longitude, 'Ubicación actual');
    setPickupAddress(addr);
  };

  const handleCreateOrder = async () => {
    if (!pickupCoords || !deliveryCoords) {
      showModal({ title: 'Error', message: 'Selecciona los puntos de recogida y entrega.', type: 'info' });
      return;
    }
    if (!recipientEmail.trim()) {
      showModal({ title: 'Error', message: 'El email del destinatario es obligatorio.', type: 'info' });
      return;
    }

    setIsLoading(true);
    try {
      const rpcPromise = supabase.rpc('get_user_id_by_email', { user_email: recipientEmail.trim().toLowerCase() });
      const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 10000));
      const result = await Promise.race([rpcPromise, timeoutPromise]);

      if (!result || !result.data) {
        showModal({ title: 'Error', message: 'Email no encontrado o no verificado.', type: 'info' });
        setIsLoading(false);
        return;
      }
      const recipientId = result.data;

      const { data: recipientProfile, error: profileError } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('id', recipientId)
        .single();
      if (profileError || !recipientProfile) {
        showModal({ title: 'Error', message: 'El destinatario no tiene perfil.', type: 'info' });
        setIsLoading(false);
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

      if (createError) {
        showModal({ title: 'Error', message: 'No se pudo crear el pedido: ' + createError.message, type: 'info' });
        setIsLoading(false);
        return;
      }

      router.replace({ pathname: '/(tabs)/select-courier', params: { order_id: orderId } });
    } catch (error: any) {
      showModal({ title: 'Error', message: 'Ocurrió un problema al crear el pedido.', type: 'info' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        {/* Cabecera fija */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#F7C925" />
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo pedido</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Mapa fijo al 30% */}
        <View style={styles.mapContainer}>
          {mapRegion ? (
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              provider={PROVIDER_DEFAULT}
            >
              {pickupCoords && (
                <Marker coordinate={pickupCoords} title="Recogida" pinColor="red" draggable onDragEnd={handlePickupDrag} />
              )}
              {deliveryCoords && (
                <Marker coordinate={deliveryCoords} title="Entrega" pinColor="blue" />
              )}
            </MapView>
          ) : (
            <ActivityIndicator style={styles.mapLoader} size="large" color="#F7C925" />
          )}
        </View>

        {/* Formulario con scroll */}
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
                <TouchableOpacity key={size} style={[styles.chip, packageSize === size && styles.chipActive]} onPress={() => setPackageSize(size)}>
                  <Text style={[styles.chipText, packageSize === size && styles.chipTextActive]}>{packageSizeLabels[size]}</Text>
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
  mapLoader: { flex: 1, justifyContent: 'center' },
  contentScroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
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
  createButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
});