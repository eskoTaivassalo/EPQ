import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  FlatList,
  Alert,
  TouchableOpacity,
  Animated,
  Image,
} from "react-native";
import { auth, db } from "../services/firebaseConfig";
import {
  collection,
  query,
  where,
  addDoc,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";

export default function ViewInvitesScreen({ navigation }) {
  const [invites, setInvites] = useState([]); // Pending invites
  const [acceptedInvites, setAcceptedInvites] = useState([]); // Accepted invites
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(auth.currentUser.uid); // Store the current user ID

  // Animation for the "ukkeli" image
  const bounceAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchInvites = async () => {
      try {
        // Get current user's categories
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data();
        const userCategories = userData.interests || [];

        // Fetch pending invites (status="pending", same category, creatorId != this user)
        const invitesQuery = query(
          collection(db, "invites"),
          where("category", "in", userCategories),
          where("status", "==", "pending"),
          where("creatorId", "!=", auth.currentUser.uid),
          orderBy("creatorId"),
          orderBy("timestamp", "desc")
        );

        // Fetch accepted invites (status="accepted", participants contains this user)
        const acceptedInvitesQuery = query(
          collection(db, "invites"),
          where("status", "==", "accepted"),
          where("participants", "array-contains", auth.currentUser.uid),
          orderBy("timestamp", "desc")
        );

        const unsubscribeInvites = onSnapshot(invitesQuery, (snapshot) => {
          const fetchedInvites = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setInvites(fetchedInvites);
          setLoading(false);
        });

        const unsubscribeAcceptedInvites = onSnapshot(
          acceptedInvitesQuery,
          (snapshot) => {
            const fetchedAcceptedInvites = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setAcceptedInvites(fetchedAcceptedInvites);
          }
        );

        return () => {
          unsubscribeInvites();
          unsubscribeAcceptedInvites();
        };
      } catch (error) {
        console.error("Error fetching invites:", error);
        setLoading(false);
        Alert.alert("Virhe", "Kutsujen haku epäonnistui.");
      }
    };

    fetchInvites();
  }, []);

  // --- Hyväksytään kutsu (luodaan chat ja päivitetään Firestore) ---
  const handleAcceptInvite = async (inviteId, invite) => {
    try {
      if (!invite || !invite.creatorId) {
        Alert.alert("Virhe", "Kutsu ei ole kelvollinen (puuttuva creatorId).");
        return;
      }

      const acceptorEmail = auth.currentUser.email || "tuntematon@xyz.com";

      // 1. Luodaan chat-dokumentti
      const chatDocRef = await addDoc(collection(db, "chats"), {
        participants: [auth.currentUser.uid, invite.creatorId],
        inviteId: inviteId,
        timestamp: new Date(),
        lastMessage: "",
      });

      // 2. Päivitetään kutsun dokumentti
      await updateDoc(doc(db, "invites", inviteId), {
        status: "accepted",
        acceptedBy: auth.currentUser.uid,
        acceptedByEmail: acceptorEmail,
        participants: [invite.creatorId, auth.currentUser.uid],
        chatId: chatDocRef.id,
        acceptedAt: new Date(),
      });

      // Poistetaan pending-listalta paikallisesti
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));

      // Siirrytään suoraan chattiin
      navigation.navigate("Chat", { chatId: chatDocRef.id });
    } catch (error) {
      console.error("Virhe kutsun hyväksynnässä:", error);
      Alert.alert("Virhe", "Kutsun hyväksyminen epäonnistui.");
    }
  };

  // --- Piirretään yksi pending-kutsu (klikataan hyväksymiseen) ---
  const renderPendingInvite = ({ item }) => (
    <TouchableOpacity
      style={styles.pendingInviteCard}
      onPress={() => handleAcceptInvite(item.id, item)}
    >
      <View style={styles.rowContainer}>
        {item.creatorId !== userId && (
          <View style={styles.characterContainer}>
            <Animated.Image
              source={require("../assets/groupcharacter.png")}
              style={[styles.characterImage, { transform: [{ translateY: bounceAnim }] }]}
              resizeMode="contain"
            />
          </View>
        )}
        <Text style={styles.inviteTitle}>{item.category}</Text>
      </View>
      <Text style={styles.inviteDescription}>
        Kuvaus: {item.content || "Ei kuvausta"}
      </Text>
      <Text style={styles.inviteDetails}>
        Lähettäjä: {item.creatorEmail || "Tuntematon"}
      </Text>
      <Text style={styles.inviteDetails}>
        Ajankohta:{" "}
        {item.timestamp
          ? new Date(item.timestamp.seconds * 1000).toLocaleString()
          : "Tuntematon"}
      </Text>
    </TouchableOpacity>
  );
  
  
  // --- Piirretään yksi accepted-kutsu (klikataan -> avataan chat) ---
  const renderAcceptedInvite = ({ item }) => (
    <TouchableOpacity
      style={styles.acceptedInviteCard}
      onPress={() => handleOpenChat(item)}
    >
      <Text style={styles.inviteTitle}>{item.category}</Text>
      <Text style={styles.inviteDescription}>
        Kuvaus: {item.content || "Ei kuvausta"}
      </Text>
      <Text style={styles.inviteDetails}>
        Hyväksytty: {item.acceptedByEmail || "Tuntematon"}
      </Text>
      <Text style={styles.inviteDetails}>
        Aika:{" "}
        {item.acceptedAt
          ? new Date(item.acceptedAt.seconds * 1000).toLocaleString()
          : "Tuntematon"}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Pending -lista */}
      {invites.length > 0 && (
        <>
          <Text style={styles.header}>Saapuneet kutsut</Text>
          <FlatList
            data={invites}
            renderItem={renderPendingInvite}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </>
      )}

      {/* Accepted -lista */}
      {acceptedInvites.length > 0 && (
        <>
          <Text style={styles.header}>Hyväksytyt kutsut</Text>
          <FlatList
            data={acceptedInvites}
            renderItem={renderAcceptedInvite}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </>
      )}

      {/* Jos kumpikaan lista ei tuottanut mitään */}
      {invites.length === 0 && acceptedInvites.length === 0 && (
        <Text style={styles.noInvitesText}>Ei kutsuja näytettäväksi.</Text>
      )}
    </View>
  );
}

// --- Tyylit ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  pendingInviteCard: {
    backgroundColor: "#f2f2f2",
    padding: 5,
    borderRadius: 10,
    marginBottom: 15,
  },
  acceptedInviteCard: {
    backgroundColor: "#d4edda",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "flex-end", // Sijoitetaan oikealle
    textAlign: "right",    // Tekstin tasaus oikealle
  },
  
  inviteDescription: {
    fontSize: 16,
    alignSelf: "flex-end", // Sijoitetaan oikealle
    textAlign: "right",    // Tekstin tasaus oikealle
  },
  inviteDetails: {
    fontSize: 14,
    color: "#555",
    alignSelf: "flex-end", // Sijoitetaan oikealle
    textAlign: "right",    // Tekstin tasaus oikealle
  },
  noInvitesText: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  characterContainer: {
    margin: 10,
    width: 50,
    height: 50,
    borderRadius: 25, // Ympyrämuoto
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0", // Taustaväri korostamaan hahmoa
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10, // Tilaa hahmon ja otsikon väliin
    flex: 1, // Otsikko käyttää jäljellä olevan tilan
    textAlign: "right", // Tasaus vasemmalle
  },
  
  characterImage: {
    
    width: 40,
    height: 40,
  },
  rowContainer: {
    flexDirection: "row", // Sijoitetaan elementit vaakatasoon
    alignItems: "center", // Kohdistetaan pystysuunnassa keskelle
    justifyContent: "space-between", // Tilaa otsikko ja kuva
  },
  
});
