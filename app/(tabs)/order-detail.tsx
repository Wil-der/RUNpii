// app/(tabs)/order-detail.tsx
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import OrderMap from '@/components/OrderMap';
import { useAppModal } from '@/contexts/ModalContext';
import { supabase } from '@/lib/supabase';

export default function OrderDetailScreen() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const router = useRouter();
  const { showModal } = useAppModal();
  const {
    order,
    courierLocation,
    loading,
    actionLoading,
    profile,
    acceptOrder,
    rejectOrder,
    confirmPickup,
    confirmDelivery,
    initiateReturn,
    cancelOrder,
    searchCouriers,
    reload,
  } = useOrderDetail(order_id);

  const [refreshing, setRefreshing] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [hasRated, setHasRated] = useState(false);

  // Estados para la foto de entrega
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [deliveryPhotoBase64, setDeliveryPhotoBase64] = useState<string | null>(null);

  // Verificar si el usuario ya valoró este pedido (para estados finalizados)
  useEffect(() => {
    if (order && ['delivered', 'returned'].includes(order.status) && profile) {
      supabase
        .from('ratings')
        .select('id')
        .eq('order_id', order.id)
        .eq('from_user_id', profile.id)
        .maybeSingle()
        .then(({ data }) => setHasRated(!!data));
    }
  }, [order?.id, order?.status, profile?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const isCustomer = profile?.role === 'customer';
  const isCourier = profile?.role === 'courier';
  const isAssignedToMe = order?.courier_id === profile?.id;
  const status = order?.status;

  // Chips de acción principales (no destructivos)
  const primaryChips: { key: string; label: string; icon: keyof typeof Feather.glyphMap; color: string; onPress: () => void }[] = [];

  if (order) {
    if (isCourier && status === 'awaiting_courier' && isAssignedToMe) {
      primaryChips.push({ key: 'accept', label: 'Aceptar', icon: 'check', color: '#10B981', onPress: acceptOrder });
    }
    if (isCourier && status === 'assigned' && isAssignedToMe) {
      primaryChips.push({ key: 'pickup', label: 'Recoger', icon: 'package', color: '#F7C925', onPress: confirmPickup });
    }
    if (isCourier && ['picked_up', 'in_transit'].includes(status) && isAssignedToMe) {
      primaryChips.push({ key: 'deliver', label: 'Entregar', icon: 'check-circle', color: '#F7C925', onPress: () => setShowDeliveryModal(true) });
      primaryChips.push({ key: 'return', label: 'Devolver', icon: 'rotate-ccw', color: '#F59E0B', onPress: initiateReturn });
    }
    if (isCourier && status === 'delivery_failed' && isAssignedToMe) {
      primaryChips.push({ key: 'return', label: 'Iniciar devolución', icon: 'rotate-ccw', color: '#F59E0B', onPress: initiateReturn });
    }
    if (isCustomer && status === 'pending') {
      primaryChips.push({ key: 'search', label: 'Buscar mensajeros', icon: 'search', color: '#F7C925', onPress: searchCouriers });
    }

    if ((isCustomer || isCourier) && ['assigned', 'picked_up', 'in_transit'].includes(status)) {
      primaryChips.push({
        key: 'chat',
        label: 'Chat',
        icon: 'message-circle',
        color: '#3B82F6',
        onPress: () => router.push({ pathname: '/(tabs)/chat', params: { order_id: order.id } }),
      });
    }

    if ((isCustomer || isCourier) && ['delivered', 'returned'].includes(status) && !hasRated) {
      const otherUserId =
        profile?.id === order.customer_id
          ? order.courier_id
          : order.customer_id;

      primaryChips.push({
        key: 'rate',
        label: 'Valorar',
        icon: 'star',
        color: '#F59E0B',
        onPress: () =>
          router.push({
            pathname: '/(tabs)/rate',
            params: { order_id: order.id, to_user_id: otherUserId },
          }),
      });
    }
  }

  const destructiveActions: { key: string; label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }[] = [];
  if (order) {
    if (isCourier && status === 'awaiting_courier' && isAssignedToMe) {
      destructiveActions.push({ key: 'reject', label: 'Rechazar pedido', icon: 'x', onPress: rejectOrder });
    }
    if (isCustomer && ['pending', 'awaiting_courier', 'assigned'].includes(status)) {
      destructiveActions.push({
        key: 'cancel',
        label: 'Cancelar pedido',
        icon: 'slash',
        onPress: () => {
          showModal({
            title: 'Cancelar pedido',
            message: '¿Seguro que deseas cancelar este pedido?',
            type: 'confirm',
            confirmText: 'Sí, cancelar',
            cancelText: 'No',
            onConfirm: cancelOrder,
          });
        },
      });
    }
  }

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la cámara.', type: 'info' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setDeliveryPhotoUri(uri);

    // Convertir a base64 para enviar a la Edge Function
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    setDeliveryPhotoBase64(base64);
  };

  const handlePickGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la galería.', type: 'info' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setDeliveryPhotoUri(uri);

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    setDeliveryPhotoBase64(base64);
  };

  const handleDelivery = () => {
    if (!verificationCode.trim()) {
      showModal({ title: 'Código requerido', message: 'Ingresa el código de verificación del destinatario.', type: 'info' });
      return;
    }
    if (!deliveryPhotoBase64) {
      showModal({ title: 'Foto requerida', message: 'Debes tomar una foto del comprobante de entrega.', type: 'info' });
      return;
    }
    confirmDelivery(verificationCode, deliveryPhotoBase64);
    setShowDeliveryModal(false);
    setVerificationCode('');
    setDeliveryPhotoUri(null);
    setDeliveryPhotoBase64(null);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Pedido no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OrderMap
        pickupCoords={order.pickup_location}
        deliveryCoords={order.delivery_location}
        courierLocation={courierLocation}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/explore')}>
          <Feather name="arrow-left" size={22} color="#F7C925" />
        </TouchableOpacity>
        <Text style={styles.title}>Pedido</Text>
        <View style={{ width: 22 }} />
      </View>

      {primaryChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionChipsScroll}
          style={{ flexGrow: 0 }}
        >
          {primaryChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              style={[styles.actionChip, { backgroundColor: chip.color }]}
              onPress={chip.onPress}
              disabled={actionLoading !== null}
            >
              <Feather name={chip.icon} size={16} color="#FFFFFF" />
              <Text style={styles.actionChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F7C925" />}
      >
        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => setDetailsExpanded(!detailsExpanded)}
          activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.detailsLine}>Recogida: {order.pickup_address}</Text>
            <Text style={styles.detailsLine}>Entrega: {order.delivery_address}</Text>
          </View>
          <Feather name={detailsExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
        </TouchableOpacity>

        {detailsExpanded && (
          <View style={styles.detailsExpanded}>
            <View style={styles.detailRow}>
              <Feather name="package" size={16} color="#6B7280" />
              <Text style={styles.detailText}>Tamaño: {order.package_size}</Text>
            </View>
            {order.package_weight_kg && (
              <View style={styles.detailRow}>
                <Feather name="anchor" size={16} color="#6B7280" />
                <Text style={styles.detailText}>Peso: {order.package_weight_kg} kg</Text>
              </View>
            )}
            {order.is_fragile && (
              <View style={styles.detailRow}>
                <Feather name="alert-triangle" size={16} color="#EF4444" />
                <Text style={[styles.detailText, { color: '#EF4444' }]}>Frágil</Text>
              </View>
            )}
            {order.package_description && (
              <View style={styles.detailRow}>
                <Feather name="file-text" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{order.package_description}</Text>
              </View>
            )}
            {order.special_instructions && (
              <View style={styles.detailRow}>
                <Feather name="info" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{order.special_instructions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Código de verificación – visible SOLO para el destinatario (y NO para el mensajero del pedido) */}
        {order.recipient_id === profile?.id && order.courier_id !== profile?.id && order.status === 'picked_up' && order.verification_code && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Código de verificación</Text>
            <Text style={styles.codeValue}>{order.verification_code}</Text>
          </View>
        )}

        {order.delivery_photo_url && (
          <View style={styles.photoCard}>
            <Text style={styles.sectionTitle}>Comprobante de entrega</Text>
            <Image source={{ uri: order.delivery_photo_url }} style={styles.deliveryPhoto} />
          </View>
        )}

        {destructiveActions.length > 0 && (
          <View style={styles.destructiveContainer}>
            {destructiveActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.destructiveButton}
                onPress={action.onPress}
                disabled={actionLoading !== null}
              >
                <Feather name={action.icon} size={16} color="#EF4444" />
                <Text style={styles.destructiveText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de entrega mejorado: foto + código */}
      {showDeliveryModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirmar entrega</Text>

            {/* Paso 1: tomar foto */}
            {!deliveryPhotoUri ? (
              <View style={styles.photoStep}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Feather name="camera" size={32} color="#F7C925" />
                  <Text style={styles.photoButtonText}>Tomar foto</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoButton} onPress={handlePickGallery}>
                  <Feather name="image" size={32} color="#F7C925" />
                  <Text style={styles.photoButtonText}>Galería</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoStep}>
                <Image source={{ uri: deliveryPhotoUri }} style={styles.photoPreview} />
                <TouchableOpacity onPress={() => { setDeliveryPhotoUri(null); setDeliveryPhotoBase64(null); }}>
                  <Text style={{ color: '#EF4444', fontFamily: 'Inter_500Medium', marginTop: 8 }}>Eliminar foto</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Paso 2: código de verificación (solo visible si ya hay foto) */}
            {deliveryPhotoUri && (
              <TextInput
                style={styles.codeInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Código de 6 dígitos"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F7C925' }]}
                onPress={handleDelivery}
                disabled={actionLoading !== null || !deliveryPhotoUri}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <Text style={styles.modalButtonText}>Confirmar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' }]}
                onPress={() => {
                  setShowDeliveryModal(false);
                  setDeliveryPhotoUri(null);
                  setDeliveryPhotoBase64(null);
                  setVerificationCode('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#6B7280' }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#EF4444' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  actionChipsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
  },
  actionChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  contentScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsLine: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },
  detailsExpanded: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 1,
  },
  codeCard: {
    backgroundColor: '#F7C92520',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  codeLabel: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1A1A1A' },
  codeValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#F7C925',
    letterSpacing: 8,
    marginTop: 4,
  },
  photoCard: { marginBottom: 12 },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  deliveryPhoto: { width: '100%', height: 200, borderRadius: 12 },
  destructiveContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  destructiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  destructiveText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#EF4444',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  photoStep: { alignItems: 'center', marginBottom: 16 },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  photoButtonText: { fontFamily: 'Inter_500Medium', fontSize: 16, color: '#F7C925' },
  photoPreview: { width: 200, height: 200, borderRadius: 8, marginBottom: 8 },
  codeInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1A1A1A',
    width: '100%',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
  },
});