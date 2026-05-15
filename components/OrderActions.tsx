// components/OrderActions.tsx
import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  orderId: string;
  status: string;
  role: 'customer' | 'courier' | 'admin' | undefined;
  courierId: string | null;
  currentUserId: string | undefined;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onConfirmPickup: () => Promise<void>;
  onConfirmDelivery: (code: string) => Promise<void>;
  onInitiateReturn: () => Promise<void>;
  onCancel: () => Promise<void>;
  loading: string | null;
}

export default function OrderActions({
  orderId,
  status,
  role,
  courierId,
  currentUserId,
  onAccept,
  onReject,
  onConfirmPickup,
  onConfirmDelivery,
  onInitiateReturn,
  onCancel,
  loading,
}: Props) {
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState('');

  const isCourier = role === 'courier';
  const isCustomer = role === 'customer';
  const isAssignedToMe = courierId === currentUserId;

  const handleDelivery = async () => {
    if (!code.trim()) {
      Alert.alert('Código requerido', 'Ingresa el código de verificación del destinatario');
      return;
    }
    await onConfirmDelivery(code.trim());
    setCode('');
    setShowCodeInput(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mensajero: awaiting_courier → aceptar / rechazar */}
      {isCourier && status === 'awaiting_courier' && isAssignedToMe && (
        <>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={onAccept}
            disabled={loading !== null}
          >
            <Feather name="check" size={20} color="#FFF" />
            <Text style={styles.buttonTextWhite}>Aceptar pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={onReject}
            disabled={loading !== null}
          >
            <Feather name="x" size={20} color="#FFF" />
            <Text style={styles.buttonTextWhite}>Rechazar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Mensajero: assigned → confirmar recogida */}
      {isCourier && status === 'assigned' && isAssignedToMe && (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onConfirmPickup}
          disabled={loading !== null}
        >
          <Feather name="package" size={20} color="#1A1A1A" />
          <Text style={styles.buttonTextDark}>Confirmar recogida</Text>
        </TouchableOpacity>
      )}

      {/* Mensajero: picked_up / in_transit → confirmar entrega o iniciar devolución */}
      {isCourier && ['picked_up', 'in_transit'].includes(status) && isAssignedToMe && (
        <>
          {!showCodeInput ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setShowCodeInput(true)}
            >
              <Feather name="check-circle" size={20} color="#1A1A1A" />
              <Text style={styles.buttonTextDark}>Confirmar entrega</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.codeRow}>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={setCode}
                placeholder="Código de 6 dígitos"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { flex: 1 }]}
                onPress={handleDelivery}
              >
                <Text style={styles.buttonTextDark}>Enviar</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, styles.warnButton]}
            onPress={onInitiateReturn}
            disabled={loading !== null}
          >
            <Feather name="rotate-ccw" size={20} color="#FFF" />
            <Text style={styles.buttonTextWhite}>No se pudo entregar</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Mensajero: delivery_failed → iniciar devolución */}
      {isCourier && status === 'delivery_failed' && isAssignedToMe && (
        <TouchableOpacity
          style={[styles.button, styles.warnButton]}
          onPress={onInitiateReturn}
          disabled={loading !== null}
        >
          <Feather name="rotate-ccw" size={20} color="#FFF" />
          <Text style={styles.buttonTextWhite}>Iniciar devolución</Text>
        </TouchableOpacity>
      )}

      {/* Cliente: cancelar en estados tempranos */}
      {isCustomer && ['pending', 'awaiting_courier', 'assigned'].includes(status) && (
        <TouchableOpacity
          style={[styles.button, styles.rejectButton]}
          onPress={onCancel}
          disabled={loading !== null}
        >
          <Feather name="slash" size={20} color="#FFF" />
          <Text style={styles.buttonTextWhite}>Cancelar pedido</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButton: { backgroundColor: '#F7C925' },
  acceptButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  warnButton: { backgroundColor: '#F59E0B' },
  buttonTextWhite: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  buttonTextDark: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codeInput: {
    flex: 2,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1A1A1A',
  },
});