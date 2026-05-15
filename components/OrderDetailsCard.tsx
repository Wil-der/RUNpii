// components/OrderDetailsCard.tsx
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  packageSize: string;
  packageWeightKg?: number | null;
  pickupAddress: string;
  deliveryAddress: string;
  isFragile?: boolean;
  description?: string | null;
  specialInstructions?: string | null;
}

const sizeLabels: Record<string, string> = {
  small: '📦 Pequeño',
  medium: '📦 Mediano',
  large: '📦 Grande',
  extra_large: '📦 Extra Grande',
};

export default function OrderDetailsCard({
  packageSize,
  packageWeightKg,
  pickupAddress,
  deliveryAddress,
  isFragile,
  description,
  specialInstructions,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Detalles del pedido</Text>

      <View style={styles.row}>
        <Feather name="package" size={16} color="#6B7280" />
        <Text style={styles.text}>{sizeLabels[packageSize] || packageSize}</Text>
      </View>

      {packageWeightKg != null && (
        <View style={styles.row}>
          <Feather name="anchor" size={16} color="#6B7280" />
          <Text style={styles.text}>Peso: {packageWeightKg} kg</Text>
        </View>
      )}

      {isFragile && (
        <View style={styles.row}>
          <Feather name="alert-triangle" size={16} color="#EF4444" />
          <Text style={[styles.text, { color: '#EF4444' }]}>Frágil</Text>
        </View>
      )}

      <View style={styles.row}>
        <Feather name="map-pin" size={16} color="#6B7280" />
        <Text style={styles.text}>Recogida: {pickupAddress}</Text>
      </View>

      <View style={styles.row}>
        <Feather name="flag" size={16} color="#6B7280" />
        <Text style={styles.text}>Entrega: {deliveryAddress}</Text>
      </View>

      {description && (
        <View style={styles.row}>
          <Feather name="file-text" size={16} color="#6B7280" />
          <Text style={styles.text}>Contenido: {description}</Text>
        </View>
      )}

      {specialInstructions && (
        <View style={styles.row}>
          <Feather name="info" size={16} color="#6B7280" />
          <Text style={styles.text}>Instrucciones: {specialInstructions}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  text: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 1,
  },
});