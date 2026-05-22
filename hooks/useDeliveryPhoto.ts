// hooks/useDeliveryPhoto.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAppModal } from '@/contexts/ModalContext';

export function useDeliveryPhoto() {
  const { showModal } = useAppModal();

  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState<string | null>(null);
  const [deliveryPhotoBase64, setDeliveryPhotoBase64] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  const takePhoto = async () => {
    setIsTakingPhoto(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la cámara.', type: 'info' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      setDeliveryPhotoUri(uri);
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setDeliveryPhotoBase64(base64);
    } catch (error) {
      showModal({ title: 'Error', message: 'No se pudo tomar la foto.', type: 'info' });
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const pickFromGallery = async () => {
    setIsTakingPhoto(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la galería.', type: 'info' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      setDeliveryPhotoUri(uri);
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setDeliveryPhotoBase64(base64);
    } catch (error) {
      showModal({ title: 'Error', message: 'No se pudo seleccionar la imagen.', type: 'info' });
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const clearPhoto = () => {
    setDeliveryPhotoUri(null);
    setDeliveryPhotoBase64(null);
  };

  const hasPhoto = !!deliveryPhotoUri;

  return {
    deliveryPhotoUri,
    deliveryPhotoBase64,
    isTakingPhoto,
    hasPhoto,
    takePhoto,
    pickFromGallery,
    clearPhoto,
  };
}