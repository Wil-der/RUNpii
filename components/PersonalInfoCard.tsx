// components/PersonalInfoCard.tsx
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import InfoRow from './InfoRow';

interface Props {
  isEditing: boolean;
  fullName: string;
  address?: string | null;
  onFullNameChange: (text: string) => void;
  onAddressChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function PersonalInfoCard({ isEditing, fullName, address, onFullNameChange, onAddressChange, onSave, onCancel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Información personal</Text>
      {isEditing ? (
        <>
          <TextInput style={styles.input} value={fullName} onChangeText={onFullNameChange} placeholder="Nombre completo" />
          <TextInput style={styles.input} value={address ?? ''} onChangeText={onAddressChange} placeholder="Dirección" multiline />
          <TouchableOpacity style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveButtonText}>Guardar cambios</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <InfoRow label="Nombre" value={fullName} />
          <InfoRow label="Dirección" value={address || '—'} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A', marginBottom: 12 },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8,
    padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 10, color: '#1A1A1A',
  },
  saveButton: { backgroundColor: '#F7C925', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
});