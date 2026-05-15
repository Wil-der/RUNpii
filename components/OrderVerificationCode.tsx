// components/OrderVerificationCode.tsx
import { StyleSheet, View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  code: string;
  visible: boolean;
}

export default function OrderVerificationCode({ code, visible }: Props) {
  if (!visible || !code) return null;

  return (
    <View style={styles.container}>
      <Feather name="shield" size={24} color="#F7C925" style={styles.icon} />
      <Text style={styles.label}>Código de verificación</Text>
      <Text style={styles.code}>{code}</Text>
      <Text style={styles.hint}>Comparte este código con el mensajero al recibir el paquete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7C92520',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#1A1A1A',
  },
  code: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    color: '#F7C925',
    letterSpacing: 8,
    marginTop: 4,
  },
  hint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});