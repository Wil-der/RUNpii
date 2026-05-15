// components/OrderDeliveryPhoto.tsx
import { StyleSheet, View, Text, Image } from 'react-native';

interface Props {
  photoUrl: string | null;
}

export default function OrderDeliveryPhoto({ photoUrl }: Props) {
  if (!photoUrl) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Comprobante de entrega</Text>
      <Image source={{ uri: photoUrl }} style={styles.image} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
});