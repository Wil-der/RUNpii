// components/CourierInfoCard.tsx
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Switch } from 'react-native';
import { Feather } from '@expo/vector-icons';
import InfoRow from './InfoRow';

interface Props {
  isEditing: boolean;
  isVerified: boolean;
  verificationStatus: string;
  idCardNumber?: string | null;
  vehicleType?: string | null;
  maxPackageSize?: string | null;
  maxWeightKg?: number | null;
  pricePerKm?: number | null;
  isActive: boolean;
  uploadingDoc: 'front' | 'back' | null;
  idCardFrontUrl?: string | null;
  idCardBackUrl?: string | null;
  onIdCardNumberChange: (text: string) => void;
  onVehicleChange: (vehicle: string) => void;
  onSizeChange: (size: string) => void;
  onWeightChange: (text: string) => void;
  onPriceChange: (text: string) => void;
  onPickDoc: (side: 'front' | 'back') => void;
  onToggleActive: () => void;
}

const vehicleOptions = ['bicycle', 'motorcycle', 'car', 'van', 'truck'];
const sizeOptions = ['small', 'medium', 'large', 'extra_large'];

export default function CourierInfoCard(props: Props) {
  // Para simplificar, solo mostramos el cuerpo completo cuando isEditing = true o cuando se muestran los documentos
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Verificación de identidad</Text>
      <Text style={styles.verificationStatus}>Estado: {props.verificationStatus}</Text>
      {props.isVerified && (
        <Text style={styles.docVerifiedHint}>Documentos verificados – no editables. Contacta al administrador para cambios.</Text>
      )}
      <View style={styles.docRow}>
        <TouchableOpacity
          style={[styles.docButton, props.isVerified && styles.docButtonDisabled]}
          onPress={() => props.onPickDoc('front')}
          disabled={props.uploadingDoc !== null || props.isVerified}
        >
          {props.idCardFrontUrl ? <Image source={{ uri: props.idCardFrontUrl }} style={styles.docImage} /> : <Feather name="camera" size={32} color={props.isVerified ? '#ccc' : '#999'} />}
          <Text style={[styles.docLabel, props.isVerified && styles.docLabelDisabled]}>Frontal</Text>
          {props.uploadingDoc === 'front' && <ActivityIndicator />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.docButton, props.isVerified && styles.docButtonDisabled]}
          onPress={() => props.onPickDoc('back')}
          disabled={props.uploadingDoc !== null || props.isVerified}
        >
          {props.idCardBackUrl ? <Image source={{ uri: props.idCardBackUrl }} style={styles.docImage} /> : <Feather name="camera" size={32} color={props.isVerified ? '#ccc' : '#999'} />}
          <Text style={[styles.docLabel, props.isVerified && styles.docLabelDisabled]}>Trasero</Text>
          {props.uploadingDoc === 'back' && <ActivityIndicator />}
        </TouchableOpacity>
      </View>
      {/* Si está editando se muestran campos extras; aquí por brevedad se delega al componente padre o se puede expandir */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A', marginBottom: 12 },
  verificationStatus: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#1A1A1A', marginBottom: 14 },
  docVerifiedHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginBottom: 12, fontStyle: 'italic' },
  docRow: { flexDirection: 'row', justifyContent: 'space-around' },
  docButton: { width: 100, height: 100, backgroundColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  docButtonDisabled: { backgroundColor: '#f0f0f0', opacity: 0.7 },
  docImage: { width: 100, height: 100, borderRadius: 8 },
  docLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#6B7280', marginTop: 4 },
  docLabelDisabled: { color: '#ccc' },
});