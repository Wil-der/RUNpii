// components/ChatMessage.tsx
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { ChatMessage as MessageType } from '@/hooks/useChat';

interface Props {
  item: MessageType;
  isMine: boolean;
  onImagePress: (url: string) => void;
}

export default function ChatMessage({ item, isMine, onImagePress }: Props) {
  return (
    <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
      {!isMine && <Text style={styles.sender}>{item.sender_name}</Text>}
      {item.content ? <Text style={styles.text}>{item.content}</Text> : null}
      {item.attachment_url ? (
        <TouchableOpacity onPress={() => onImagePress(item.attachment_url!)}>
          <Image source={{ uri: item.attachment_url }} style={styles.attachment} />
        </TouchableOpacity>
      ) : null}
      <Text style={styles.time}>
        {new Date(item.sent_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#F7C925' },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  sender: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#6B7280', marginBottom: 4 },
  text: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#1A1A1A' },
  attachment: { width: 200, height: 200, borderRadius: 8, marginTop: 4 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#6B7280', marginTop: 4, alignSelf: 'flex-end' },
});