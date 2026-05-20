// components/FilterPanel.tsx
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { CourierFilters } from '@/hooks/useSelectCourier';

interface Props {
  filters: CourierFilters;
  onApply: (filters: CourierFilters) => void;
  onClose: () => void;
}

const VEHICLE_TYPES = ['bicycle', 'motorcycle', 'car', 'van', 'truck'];
const SORT_OPTIONS: { value: CourierFilters['sortBy']; label: string }[] = [
  { value: 'distance', label: 'Distancia' },
  { value: 'price', label: 'Precio' },
  { value: 'rating', label: 'Valoración' },
];

export default function FilterPanel({ filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<CourierFilters>(filters);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Filtrar mensajeros</Text>

      <Text style={styles.label}>Tipo de vehículo</Text>
      <View style={styles.chipRow}>
        {VEHICLE_TYPES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, local.vehicleType === v && styles.chipActive]}
            onPress={() =>
              setLocal({ ...local, vehicleType: local.vehicleType === v ? null : v })
            }
          >
            <Text style={[styles.chipText, local.vehicleType === v && styles.chipTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Precio máximo ($)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={local.maxPrice?.toString() ?? ''}
        onChangeText={(t) =>
          setLocal({ ...local, maxPrice: t ? parseFloat(t) : null })
        }
        placeholder="Sin límite"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Valoración mínima</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={local.minRating?.toString() ?? ''}
        onChangeText={(t) =>
          setLocal({ ...local, minRating: t ? parseFloat(t) : null })
        }
        placeholder="0 – 5"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>Ordenar por</Text>
      <View style={styles.chipRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, local.sortBy === opt.value && styles.chipActive]}
            onPress={() => setLocal({ ...local, sortBy: opt.value })}
          >
            <Text style={[styles.chipText, local.sortBy === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => {
            onApply(local);
            onClose();
          }}
        >
          <Text style={styles.applyButtonText}>Aplicar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            onApply({
              vehicleType: null,
              maxPrice: null,
              minRating: null,
              sortBy: 'distance',
            });
            onClose();
          }}
        >
          <Text style={styles.clearButtonText}>Limpiar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#F7C925',
    borderColor: '#F7C925',
  },
  chipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#1A1A1A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#F7C925',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#6B7280',
  },
});