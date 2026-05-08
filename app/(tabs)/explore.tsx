import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, FlatList, Text, View, ActivityIndicator } from 'react-native';

import { Collapsible } from '@/components/ui/collapsible';
import { ExternalLink } from '@/components/external-link';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { getPosts, createPost, Post } from '@/lib/supabase-operations';

export default function ExploreScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    const { data } = await getPosts();
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;
    setSubmitting(true);
    const { error } = await createPost(user.id, newPost.trim());
    setSubmitting(false);
    if (!error) {
      setNewPost('');
      loadPosts();
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <ThemedText type="defaultSemiBold">{item.profiles?.username || 'Anónimo'}</ThemedText>
      <ThemedText>{item.content}</ThemedText>
      <Text style={styles.date}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{ fontFamily: Fonts.rounded }}>
          Explore
        </ThemedText>
      </ThemedView>

      <ThemedText>Publica algo con Supabase:</ThemedText>

      <View style={styles.newPostContainer}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué estás pensando?"
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />
        <Pressable style={styles.postButton} onPress={handleCreatePost} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>Publicar</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}

      <Collapsible title="Configuración de Supabase">
        <ThemedText>
          Conectado a: <ThemedText type="defaultSemiBold">zudoikaztozmhhbvaipf.supabase.co</ThemedText>
        </ThemedText>
        <ExternalLink href="https://supabase.com/dashboard">
          <ThemedText type="link">Ir al Dashboard</ThemedText>
        </ExternalLink>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: { color: '#808080', bottom: -90, left: -35, position: 'absolute' },
  titleContainer: { flexDirection: 'row', gap: 8 },
  newPostContainer: { marginVertical: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  postButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  postButtonText: { color: '#fff', fontWeight: 'bold' },
  postCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  date: { fontSize: 12, marginTop: 5 },
});
