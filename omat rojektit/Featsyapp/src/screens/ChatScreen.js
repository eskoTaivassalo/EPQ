import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  Platform,
  Keyboard,
  TouchableOpacity,
} from "react-native";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import moment from "moment";

export default function ChatScreen({ route }) {
  const { chatId } = route.params;

  const [chat, setChat] = useState(null);     // Täältä luetaan eventTitle, eventDescription...
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  const flatListRef = useRef(null);

  useEffect(() => {
    // 1. Haetaan chat-dokumentti
    const chatRef = doc(db, "chats", chatId);
    const unsubscribeChat = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        setChat({ id: snapshot.id, ...snapshot.data() });
      }
      setLoadingChat(false);
    });

    // 2. Haetaan viestit
    const msgsQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribeMsgs = onSnapshot(msgsQuery, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(fetched);
      setLoadingMsgs(false);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMsgs();
    };
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: auth.currentUser.uid,
        text: newMessage.trim(),
        timestamp: new Date(),
      });
      setNewMessage("");
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId === auth.currentUser.uid;
    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestamp}>
          {moment(item.timestamp.toDate()).format("HH:mm")}
        </Text>
      </View>
    );
  };

  const scrollToEnd = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  if (loadingChat || loadingMsgs) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f2f2f2" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>

          {/* Näytetään chatin/eventin tiedot yläosassa */}
          {chat && (
            <View style={styles.eventInfoContainer}>
              <Text style={styles.eventTitle}>
                Otsikko: {chat.eventTitle || "Ei otsikkoa"}
              </Text>
              <Text style={styles.eventDescription}>
                Kuvaus: {chat.eventDescription || "Ei kuvausta"}
              </Text>
              {chat.location && (
                <Text style={styles.locationText}>
                  Sijainti: {chat.location.latitude}, {chat.location.longitude}
                </Text>
              )}
              <Text style={styles.creatorEmail}>
                Luoja: {chat.creatorEmail || "Tuntematon"}
              </Text>
            </View>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
          />

          {/* Syöttökenttä */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Kirjoita viesti..."
              multiline
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
              <Text style={styles.sendButtonText}>Lähetä</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  eventInfoContainer: {
    backgroundColor: "#fff",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  creatorEmail: {
    fontSize: 14,
    color: "#666",
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: "80%",
    borderRadius: 8,
    marginVertical: 5,
    padding: 8,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
    marginLeft: 40,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#ECE5DD",
    marginRight: 40,
  },
  messageText: {
    fontSize: 15,
    color: "#000",
  },
  timestamp: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
