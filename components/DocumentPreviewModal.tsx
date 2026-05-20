// components/DocumentPreviewModal.tsx
import { Modal, StyleSheet, View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  frontUrl: string | null;
  backUrl: string | null;
  onClose: () => void;
}

export default function DocumentPreviewModal({ visible, frontUrl, backUrl, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Documentos del mensajero</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>Carnet frontal</Text>
            {frontUrl ? (
              <Image source={{ uri: frontUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.empty}>No disponible</Text>
            )}

            <Text style={styles.label}>Carnet trasero</Text>
            {backUrl ? (
              <Image source={{ uri: backUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <Text style={styles.empty}>No disponible</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  container: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, width: '100%', maxWidth: 500, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#1A1A1A' },
  content: { gap: 16 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1A1A1A' },
  image: { width: '100%', height: 250, borderRadius: 8, backgroundColor: '#F9FAFB' },
  empty: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 40 },
});