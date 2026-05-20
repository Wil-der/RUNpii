// hooks/useProfileImage.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAppModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/use-auth';
import { updateProfile } from '@/lib/supabase-operations';
import { compressImage } from '@/utils/compressImage';
import { uploadFile } from '@/lib/uploadFile';

export function useProfileImage() {
  const { profile, refreshProfile } = useAuth();
  const { showModal } = useAppModal();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'front' | 'back' | null>(null);

  const pickAvatar = async (onSuccess?: (url: string) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showModal({ title: 'Permiso denegado', message: 'Se necesita acceso a la galería.', type: 'info' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0] || !profile) return;
    setUploadingAvatar(true);
    try {
      const compressedUri = await compressImage(result.assets[0].uri, { maxWidth: 512, quality: 0.7 });
      const path = `${profile.id}/avatar.jpg`;
      const publicUrl = await uploadFile('avatars', path, compressedUri, 'image/jpeg');
      onSuccess?.(publicUrl);
      await updateProfile(profile.id, { avatar_url: publicUrl });
      await refreshProfile?.();
    } catch (e: any) {
      showModal({ title: 'Error', message: 'No se pudo subir la imagen.', type: 'info' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const pickDoc = async (side: 'front' | 'back', onSuccess?: (url: string, column: string) => void) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      showModal({ title: 'Permiso denegado', message: 'Se requiere acceso a la cámara.', type: 'info' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0] || !profile) return;
    setUploadingDoc(side);
    try {
      const compressedUri = await compressImage(result.assets[0].uri, { maxWidth: 2048, quality: 0.8 });
      const path = `${profile.id}/id_${side}.jpg`;
      const publicUrl = await uploadFile('id_docs', path, compressedUri, 'image/jpeg');
      const column = side === 'front' ? 'id_card_front_url' : 'id_card_back_url';
      onSuccess?.(publicUrl, column);
      await updateProfile(profile.id, { [column]: publicUrl });
      await refreshProfile?.();
      showModal({ title: 'Documento subido', message: `Foto ${side === 'front' ? 'frontal' : 'trasera'} guardada.`, type: 'info' });
    } catch (e: any) {
      showModal({ title: 'Error', message: 'No se pudo subir el documento.', type: 'info' });
    } finally {
      setUploadingDoc(null);
    }
  };

  return { pickAvatar, pickDoc, uploadingAvatar, uploadingDoc };
}