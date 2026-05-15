// components/CourierCard.tsx
import { StyleSheet, TouchableOpacity, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Courier } from '@/hooks/useSelectCourier';

interface Props {
  item: Courier;
  isHighlighted: boolean;
  onPress: (courier: Courier) => void;
  disabled: boolean;
}

export default function CourierCard({ item, isHighlighted, onPress, disabled }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, isHighlighted && styles.cardHighlighted]}
      onPress={() => onPress(item)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.info}>
        <Feather name="user" size={24} color="#F7C925" />
        <View style={styles.infoText}>
          <Text style={styles.name}>{item.full_name}</Text>
          <Text style={styles.details}>
            ⭐ {item.rating_average?.toFixed(1) ?? '—'} ({item.total_ratings}) · {item.vehicle_type}
          </Text>
          <Text style={styles.details}>
            Tamaño máx: {item.max_package_size} · Peso máx: {item.max_weight_kg ? `${item.max_weight_kg} kg` : '—'}
          </Text>
        </View>
      </View>
      <View style={styles.priceBox}>
        <Text style={styles.priceLabel}>Total</Text>
        <Text style={styles.priceValue}>${item.estimated_price?.toFixed(2) ?? '—'}</Text>
        <Text style={styles.priceDistance}>{(item.distance_km ?? 0).toFixed(1)} km de ti</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cardHighlighted: {
    borderColor: '#F7C925',
    backgroundColor: '#F7C92515',
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 12 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  details: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#6B7280', marginTop: 2 },
  priceBox: { alignItems: 'flex-end' },
  priceLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280' },
  priceValue: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#1A1A1A' },
  priceDistance: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280' },
});