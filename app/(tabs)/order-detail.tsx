// app/(tabs)/order-detail.tsx
import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useOrderDetail } from '@/hooks/useOrderDetail'; // <-- export con nombre
import OrderStatusBanner from '@/components/OrderStatusBanner';
import OrderMap from '@/components/OrderMap';
import OrderDetailsCard from '@/components/OrderDetailsCard';
import OrderVerificationCode from '@/components/OrderVerificationCode';
import OrderDeliveryPhoto from '@/components/OrderDeliveryPhoto';
import OrderActions from '@/components/OrderActions';

export default function OrderDetailScreen() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const {
    order,
    courierLocation,
    loading,
    actionLoading,
    profile,            // <- el hook ya devuelve profile
    acceptOrder,
    rejectOrder,
    confirmPickup,
    confirmDelivery,
    initiateReturn,
    cancelOrder,
  } = useOrderDetail(order_id);

  if (loading || !order) {
    return null; // El hook ya maneja los indicadores de carga y error
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <OrderStatusBanner status={order.status} estimatedPrice={order.estimated_price} />

      <OrderMap
        pickupCoords={order.pickup_location}
        deliveryCoords={order.delivery_location}
        courierLocation={courierLocation}
      />

      <OrderDetailsCard
        packageSize={order.package_size}
        packageWeightKg={order.package_weight_kg}
        pickupAddress={order.pickup_address}
        deliveryAddress={order.delivery_address}
        isFragile={order.is_fragile}
        description={order.package_description}
        specialInstructions={order.special_instructions}
      />

      <OrderVerificationCode
        code={order.verification_code || ''}
        visible={
          (profile?.role === 'courier' || order.recipient_id === profile?.id) &&
          order.status === 'picked_up'
        }
      />

      <OrderDeliveryPhoto photoUrl={order.delivery_photo_url} />

      <OrderActions
        orderId={order.id}
        status={order.status}
        role={profile?.role}
        courierId={order.courier_id}
        currentUserId={profile?.id}
        onAccept={acceptOrder}
        onReject={rejectOrder}
        onConfirmPickup={confirmPickup}
        onConfirmDelivery={confirmDelivery}
        onInitiateReturn={initiateReturn}
        onCancel={cancelOrder}
        loading={actionLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 40 },
});