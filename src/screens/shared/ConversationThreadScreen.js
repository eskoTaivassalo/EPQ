import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToConversation, sendMessage } from '../../services/communicationService';

export default function ConversationThreadScreen({ navigation, route }) {
  const { teacherId, parentId } = route.params || {};
  const { user } = useAuth();
  const role = (user?.userType || user?.type) === 'teacher' ? 'teacher' : 'parent';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (!teacherId || !parentId) return;
    const unsub = subscribeToConversation(teacherId, parentId, setMessages);
    return () => unsub && unsub();
  }, [teacherId, parentId]);

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => listRef.current.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await sendMessage({
      teacherId,
      parentId,
      senderType: role,
      text: trimmed,
    });
    setText('');
  };

  const renderItem = ({ item }) => {
    const mine = (role === 'teacher' && item.senderType === 'teacher') || (role === 'parent' && item.senderType === 'parent');
    return (
      <View style={[styles.message, mine ? styles.mine : styles.their]}> 
        <Text style={styles.messageText}>{item.text || item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Conversation</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            value={text}
            onChangeText={setText}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.secondary },
  backBtn: { padding: 6 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  message: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  their: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  messageText: { color: colors.white },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
});
