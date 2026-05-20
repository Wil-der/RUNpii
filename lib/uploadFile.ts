// lib/uploadFile.ts
import { supabase } from './supabase';

export async function uploadFile(bucket: string, path: string, uri: string, contentType: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('No se pudo obtener la URL pública');
  return data.publicUrl;
}