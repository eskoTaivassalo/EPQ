import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToConversation, subscribeToSupportConversation, sendMessage } from '../../services/communicationService';

export default function ConversationThreadScreen({ navigation, route }) {
  const { teacherId: teacherIdParam, parentId: parentIdParam, recipientName, isSupportConversation, userId1, userId2, senderId, recipientId, category, subject } = route.params || {};
  const { user } = useAuth();
  const role = (user?.userType || user?.type) === 'teacher' ? 'teacher' : 'parent';
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  // Handle both old params (teacherId/parentId) and new params (recipientId)
  // If recipientId is provided, determine teacherId/parentId based on user role
  const teacherId = teacherIdParam || (role === 'parent' ? recipientId : null) || (role === 'teacher' ? user.uid : null);
  const parentId = parentIdParam || (role === 'teacher' ? recipientId : null) || (role === 'parent' ? user.uid : null);

  useEffect(() => {
    if (isSupportConversation && userId1 && userId2) {
      // Support conversation (new params)
      const unsub = subscribeToSupportConversation(userId1, userId2, setMessages);
      return () => unsub && unsub();
    } else if (isSupportConversation && senderId && recipientId) {
      // Support conversation (old params - backward compatibility)
      const unsub = subscribeToSupportConversation(senderId, recipientId, setMessages);
      return () => unsub && unsub();
    } else if (teacherId && parentId) {
      // Regular teacher<->parent conversation
      const unsub = subscribeToConversation(teacherId, parentId, setMessages);
      return () => unsub && unsub();
    }
  }, [isSupportConversation, userId1, userId2, senderId, recipientId, teacherId, parentId]);

  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      setTimeout(() => listRef.current.scrollToEnd({ animated: true }), 50);
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    if (isSupportConversation) {
      // Send support message
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebaseConfig');
      
      // Determine recipient: if using new params (userId1/userId2), recipient is the other user
      const recipientUserId = userId1 && userId2 
        ? (userId1 === user.uid ? userId2 : userId1)
        : (senderId === user.uid ? recipientId : senderId);
      
      await addDoc(collection(db, 'serviceTypes', 'education', 'messages'), {
        senderId: user.uid,
        recipientId: recipientUserId,
        senderRole: user.role || role || 'guest',
        recipientRole: 'admin', // Assuming support messages go to admin
        type: 'support',
        category: category || 'general',
        subject: subject || 'Re: Support Request',
        text: trimmed,
        read: false,
        createdAt: serverTimestamp(),
      });
    } else {
      // Regular message
      await sendMessage({
        teacherId,
        parentId,
        senderType: role,
        text: trimmed,
      });
    }
    
    setText('');
  };

  const renderItem = ({ item }) => {
    let mine = false;
    
    if (isSupportConversation) {
      // In support conversation, mine = message sent by current user
      mine = item.senderId === user.uid;
    } else {
      // In regular conversation, check senderType
      mine = (role === 'teacher' && item.senderType === 'teacher') || (role === 'parent' && item.senderType === 'parent');
    }
    
    return (
      <View style={[styles.message, mine ? styles.mine : styles.their]}> 
        <Text style={styles.messageText}>{item.text || item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{recipientName || 'Conversation'}</Text>
          {isSupportConversation && subject && (
            <Text style={styles.headerSubtitle}>{subject}</Text>
          )}
          {isSupportConversation && category && (
            <Text style={styles.headerCategory}>📩 {category.toUpperCase()}</Text>
          )}
          {!isSupportConversation && recipientName && (
            <Text style={styles.headerSubtitle}>Message</Text>
          )}
        </View>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
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
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: colors.white, fontSize: 12, opacity: 0.9, marginTop: 2 },
  headerCategory: { color: colors.white, fontSize: 10, opacity: 0.8, marginTop: 2, fontWeight: '600' },
  message: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  their: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  messageText: { color: colors.white },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, maxHeight: 100, minHeight: 40 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary },
});
