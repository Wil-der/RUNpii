// components/CourierModal.tsx
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Courier } from '@/hooks/useSelectCourier';

interface Props {
  visible: boolean;
  courier: Courier | null;
  totalDistance: number;
  loading: boolean;
  onSelect: (courierId: string) => void;
  onClose: () => void;
}

export default function CourierModal({ visible, courier, totalDistance, loading, onSelect, onClose }: Props) {
  if (!courier) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Feather name="user" size={48} color="#F7C925" />
              <Text style={styles.name}>{courier.full_name}</Text>
              <Text style={styles.rating}>
                {courier.rating_average?.toFixed(1)} ({courier.total_ratings}) · {courier.vehicle_type}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.row}>
                <Feather name="package" size={16} color="#6B7280" />
                <Text style={styles.detailText}>Tamaño máx: {courier.max_package_size}</Text>
              </View>
              {courier.max_weight_kg && (
                <View style={styles.row}>
                  <Feather name="anchor" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>Peso máx: {courier.max_weight_kg} kg</Text>
                </View>
              )}
              <View style={styles.row}>
                <Feather name="dollar-sign" size={16} color="#6B7280" />
                <Text style={styles.detailText}>Tarifa: ${courier.price_per_km?.toFixed(2)}/km</Text>
              </View>
              <View style={styles.row}>
                <Feather name="map" size={16} color="#6B7280" />
                <Text style={styles.detailText}>Distancia a ti: {courier.distance_km?.toFixed(1)} km</Text>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.priceLabel}>Precio total estimado</Text>
              <Text style={styles.priceValue}>${courier.estimated_price?.toFixed(2)}</Text>
              <Text style={styles.priceCalc}>
                ({totalDistance.toFixed(1)} km × ${courier.price_per_km?.toFixed(2)}/km)
              </Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.selectButton, loading && styles.buttonDisabled]}
                onPress={() => onSelect(courier.courier_id)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <Text style={styles.selectButtonText}>Seleccionar mensajero</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Volver</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    padding: 16,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1A1A1A',
    marginTop: 12,
    textAlign: 'center',
  },
  rating: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  details: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  detailText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B7280',
    flexShrink: 1,
  },
  priceSection: {
    backgroundColor: '#F7C92515',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1A1A1A',
  },
  priceValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#F7C925',
    marginTop: 4,
  },
  priceCalc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  selectButton: {
    backgroundColor: '#F7C925',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  selectButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  cancelButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#6B7280',
  },
});