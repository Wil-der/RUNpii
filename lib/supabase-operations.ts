import { supabase } from './supabase';
import { Tables, Database } from '@/types/supabase';

// Tipos de datos
export type Profile = Tables<'profiles'>['Row'];
export type Post = Tables<'posts'>['Row'] & { profiles?: { username: string } };

// operaciones de profiles
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
};

export const createProfile = async (userId: string, username: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username })
    .select()
    .single();
  return { data, error };
};

// Operaciones de posts
export const getPosts = async () => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (username)
    `)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const createPost = async (authorId: string, content: string) => {
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: authorId, content })
    .select()
    .single();
  return { data, error };
};

export const deletePost = async (postId: string, userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', userId)
    .select();
  return { data, error };
};
