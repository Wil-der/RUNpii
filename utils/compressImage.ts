// utils/compressImage.ts
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string, options: { maxWidth: number; quality: number }): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: options.maxWidth } }],
    { compress: options.quality, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}