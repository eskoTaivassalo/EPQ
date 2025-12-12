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
      
      // Store support message under sender's document
      const senderCollection = (user.role || role) === 'teacher' ? 'teachers' : 'parents';
      await addDoc(collection(db, 'serviceTypes', 'education', senderCollection, user.uid, 'messages'), {
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
    
    const timestamp = item.createdAt?.toDate ? item.createdAt.toDate() : new Date();
    const timeString = timestamp.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={[styles.messageContainer, mine ? styles.messageContainerMine : styles.messageContainerTheir]}>
        <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleTheir]}>
          <Text style={[styles.messageText, mine ? styles.messageTextMine : styles.messageTextTheir]}>
            {item.text || item.content}
          </Text>
          <Text style={[styles.messageTime, mine ? styles.messageTimeMine : styles.messageTimeTheir]}>
            {timeString}
          </Text>
        </View>
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
          contentContainerStyle={{ padding: 16, paddingBottom: 8, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 16, 
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backBtn: { 
    padding: 8,
    borderRadius: 8,
  },
  headerTextContainer: { 
    flex: 1, 
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: { 
    color: colors.white, 
    fontSize: 18, 
    fontWeight: '700',
  },
  headerSubtitle: { 
    color: colors.white, 
    fontSize: 13, 
    opacity: 0.9, 
    marginTop: 2,
  },
  headerCategory: { 
    color: colors.white, 
    fontSize: 11, 
    opacity: 0.85, 
    marginTop: 2, 
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  messageContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  messageContainerMine: {
    alignItems: 'flex-end',
  },
  messageContainerTheir: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleTheir: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextMine: {
    color: colors.white,
  },
  messageTextTheir: {
    color: colors.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  messageTimeMine: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  messageTimeTheir: {
    color: colors.textSecondary,
    textAlign: 'right',
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    padding: 12, 
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1, 
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  input: { 
    flex: 1, 
    backgroundColor: colors.white,
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    paddingTop: 10,
    marginRight: 10, 
    maxHeight: 100, 
    minHeight: 44,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});
