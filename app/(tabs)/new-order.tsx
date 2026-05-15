// app/(tabs)/new-order.tsx
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
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

  // Solo clientes pueden crear pedidos
  useEffect(() => {
    if (profile && profile.role !== 'customer') {
      Alert.alert('Solo clientes', 'Debes iniciar sesión como cliente para crear un pedido.');
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
    small: '📦 Pequeño',
    medium: '📦 Mediano',
    large: '📦 Grande',
    extra_large: '📦 Extra Grande',
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la ubicación para establecer el punto de recogida.');
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
      Alert.alert('Error', 'Selecciona el punto de recogida y el de entrega en el mapa.');
      return;
    }
    if (!recipientEmail.trim()) {
      Alert.alert('Error', 'El email del destinatario es obligatorio.');
      return;
    }

    setIsLoading(true);

    try {
      // Buscar destinatario con timeout
      const rpcPromise = supabase.rpc('get_user_id_by_email', {
        user_email: recipientEmail.trim().toLowerCase(),
      });
      const timeoutPromise = new Promise<null>(r => setTimeout(() => r(null), 10000));
      const result = await Promise.race([rpcPromise, timeoutPromise]);

      if (!result || !result.data) {
        Alert.alert('Error', 'No se encontró un usuario con ese email o el email no está verificado.');
        setIsLoading(false);
        return;
      }
      const recipientId = result.data;

      // Verificar perfil del destinatario
      const { data: recipientProfile, error: profileError } = await supabase
        .from('public_profiles')
        .select('id')
        .eq('id', recipientId)
        .single();

      if (profileError || !recipientProfile) {
        Alert.alert('Error', 'El usuario no tiene perfil. Debe completar su registro en RUNpii.');
        setIsLoading(false);
        return;
      }

      // Crear pedido con la función RPC
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
        Alert.alert('Error', 'No se pudo crear el pedido: ' + createError.message);
        setIsLoading(false);
        return;
      }

      router.replace({
        pathname: '/(tabs)/select-courier',
        params: { order_id: orderId },
      });
    } catch (error: any) {
      Alert.alert('Error', 'Ocurrió un problema al crear el pedido. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nuevo pedido</Text>

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

        <Text style={styles.label}>Destinatario (email registrado)</Text>
        <TextInput style={styles.input} value={recipientEmail} onChangeText={setRecipientEmail} placeholder="usuario@runpii.com" autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Tamaño del paquete</Text>
        <View style={styles.chipRow}>
          {packageSizes.map(size => (
            <TouchableOpacity key={size} style={[styles.chip, packageSize === size && styles.chipActive]} onPress={() => setPackageSize(size)}>
              <Text style={[styles.chipText, packageSize === size && styles.chipTextActive]}>{packageSizeLabels[size]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Peso (kg, opcional)</Text>
        <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="Ej: 2.5" />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Frágil</Text>
          <Switch value={isFragile} onValueChange={setIsFragile} trackColor={{ false: '#ccc', true: '#F7C925' }} />
        </View>

        <Text style={styles.label}>Descripción del contenido (opcional)</Text>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Ej: Documentos, ropa..." />

        <Text style={styles.label}>Instrucciones especiales (opcional)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={specialInstructions} onChangeText={setSpecialInstructions} placeholder="Ej: tocar timbre 3B" multiline numberOfLines={3} />

        <TouchableOpacity style={[styles.createButton, isLoading && styles.disabledButton]} onPress={handleCreateOrder} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#1A1A1A" /> : <Text style={styles.createButtonText}>Crear pedido</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: '#1A1A1A', marginBottom: 20 },
  mapContainer: { height: 250, borderRadius: 12, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  map: { flex: 1 },
  mapLoader: { flex: 1, justifyContent: 'center' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1A1A1A', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#1A1A1A' },
  multiline: { minHeight: 80 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  chipTextActive: { color: '#1A1A1A' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  createButton: { backgroundColor: '#F7C925', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 30 },
  disabledButton: { opacity: 0.6 },
  createButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
});