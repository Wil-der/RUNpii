// components/ImagePickerButton.tsx
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Feather } from '@expo/vector-icons';
import { useAppModal } from '@/contexts/ModalContext';

interface Props {
  uploading: boolean;
  onUploadStart: () => void;
  onImagePicked: (uri: string) => void;
  onError: (msg: string) => void;
  onComplete: () => void;
}

export default function ImagePickerButton({ uploading, onUploadStart, onImagePicked, onError, onComplete }: Props) {
  const { showModal } = useAppModal();

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la galería.', type: 'info' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;

    onUploadStart();
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      onImagePicked(compressed.uri);
    } catch {
      onError('No se pudo comprimir la imagen.');
    } finally {
      onComplete();
    }
  };

  return (
    <TouchableOpacity style={{ padding: 4 }} onPress={pick} disabled={uploading}>
      {uploading ? (
        <ActivityIndicator size="small" color="#F7C925" />
      ) : (
        <Feather name="camera" size={22} color="#6B7280" />
      )}
    </TouchableOpacity>
  );
}