// app/(tabs)/chat.tsx
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ImagePickerButton from '@/components/ImagePickerButton';
import { useAppModal } from '@/contexts/ModalContext';
import { Image } from 'react-native';
import { useAuth } from '@/hooks/use-auth';

export default function ChatScreen() {
  const { order_id } = useLocalSearchParams<{ order_id: string }>();
  const router = useRouter();
  const { showModal } = useAppModal();
  const { messages, loading, sendText, sendImage } = useChat(order_id);
  const { profile } = useAuth();

  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const ok = await sendText(newMessage);
    if (ok) setNewMessage('');
  };

  const handleImagePicked = async (uri: string) => {
    const ok = await sendImage(uri);
    if (!ok) showModal({ title: 'Error', message: 'No se pudo enviar la imagen.', type: 'info' });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Cabecera */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#F7C925" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Contenido flexible (lista + barra) */}
      <View style={styles.content}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => (
            <ChatMessage
              item={item}
              isMine={item.sender_id === profile?.id}
              onImagePress={setFullscreenImage}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          windowSize={10}
          maxToRenderPerBatch={10}
          initialNumToRender={15}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="message-circle" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Sin mensajes aún</Text>
            </View>
          }
        />

        {/* Barra de entrada */}
        <View style={styles.inputBar}>
          <ImagePickerButton
            uploading={uploading}
            onUploadStart={() => setUploading(true)}
            onImagePicked={handleImagePicked}
            onError={(msg) => showModal({ title: 'Error', message: msg, type: 'info' })}
            onComplete={() => setUploading(false)}
          />
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim()}
          >
            <Feather name="send" size={18} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Visor de imagen */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          onPress={() => setFullscreenImage(null)}
        >
          <Image source={{ uri: fullscreenImage }} style={styles.fullscreenImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#1A1A1A' },
  content: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#6B7280', marginTop: 8 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 8,
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#1A1A1A', maxHeight: 100,
  },
  sendButton: { backgroundColor: '#F7C925', borderRadius: 10, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.4 },
  fullscreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '80%' },
});