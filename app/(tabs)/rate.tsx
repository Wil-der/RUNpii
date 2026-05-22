// app/(tabs)/rate.tsx
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useAppModal } from '@/contexts/ModalContext';

const PREDEFINED_TAGS = ['Puntual', 'Cuidadoso', 'Amable', 'Rápido', 'Buena comunicación'];

export default function RateScreen() {
  const { order_id, to_user_id } = useLocalSearchParams<{ order_id: string; to_user_id: string }>();
  const { profile } = useAuth();
  const router = useRouter();
  const { showModal } = useAppModal();

  const [ratedUser, setRatedUser] = useState<{ full_name: string } | null>(null);
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false); // nuevo estado para controlar la validación

  // Validar que el usuario a valorar es realmente participante del pedido
  useEffect(() => {
    if (!order_id || !to_user_id) return;

    (async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('customer_id, courier_id, status')
        .eq('id', order_id)
        .single();

      if (error || !data) {
        showModal({ title: 'Error', message: 'Pedido no encontrado.', type: 'info' });
        router.back();
        return;
      }

      if (!['delivered', 'returned'].includes(data.status)) {
        showModal({ title: 'Error', message: 'Este pedido aún no puede ser valorado.', type: 'info' });
        router.back();
        return;
      }

      if (data.customer_id !== to_user_id && data.courier_id !== to_user_id) {
        showModal({ title: 'Error', message: 'El usuario no participó en este pedido.', type: 'info' });
        router.back();
        return;
      }

      setValid(true);

      // Obtener nombre del evaluado desde la vista pública
      const { data: userData } = await supabase
        .from('public_profiles')
        .select('full_name')
        .eq('id', to_user_id)
        .single();
      if (userData) setRatedUser(userData);
      setLoading(false);
    })();
  }, [order_id, to_user_id]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const submitRating = async () => {
    if (rating === 0) {
      showModal({ title: 'Selecciona una puntuación', message: 'Debes elegir al menos 1 estrella.', type: 'info' });
      return;
    }
    if (!profile || !order_id || !to_user_id) return;

    setSending(true);
    try {
      const { error } = await supabase.from('ratings').insert({
        order_id,
        from_user_id: profile.id,
        to_user_id,
        rating,
        tags: selectedTags.length > 0 ? selectedTags : null,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      showModal({ title: 'Valoración enviada', message: 'Gracias por tu valoración.', type: 'info' });
      router.back();
    } catch (error: any) {
      showModal({ title: 'Error', message: error.message, type: 'info' });
    } finally {
      setSending(false);
    }
  };

  if (loading || !valid) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F7C925" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#F7C925" />
        </TouchableOpacity>
        <Text style={styles.title}>Valorar</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.subtitle}>
          ¿Cómo fue tu experiencia con {ratedUser?.full_name || 'el otro usuario'}?
        </Text>

        {/* Estrellas */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Feather
                name={star <= rating ? 'star' : 'star'}
                size={36}
                color={star <= rating ? '#F7C925' : '#E5E7EB'}
                style={{ marginHorizontal: 4 }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Etiquetas */}
        <View style={styles.tagsRow}>
          {PREDEFINED_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comentario */}
        <Text style={styles.label}>Comentario (opcional)</Text>
        <TextInput
          style={styles.commentInput}
          value={comment}
          onChangeText={setComment}
          placeholder="Escribe algo sobre tu experiencia..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          maxLength={300}
        />

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={submitRating}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={styles.sendButtonText}>Enviar valoración</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  card: { paddingHorizontal: 16, paddingTop: 20 },
  subtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  tagActive: { backgroundColor: '#F7C925', borderColor: '#F7C925' },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6B7280' },
  tagTextActive: { color: '#1A1A1A' },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#1A1A1A', marginBottom: 8 },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#1A1A1A',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  sendButton: { backgroundColor: '#F7C925', borderRadius: 12, padding: 16, alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#1A1A1A' },
});