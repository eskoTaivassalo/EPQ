import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Dimensions,
  Image,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../services/firebaseConfig";
import { collection, query, where, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function HomeScreen() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [receivedInvitesCount, setReceivedInvitesCount] = useState(0);
  const [hasActiveInvite, setHasActiveInvite] = useState(false);
  const [userActiveInvite, setUserActiveInvite] = useState(null);
  const [hasSentInvite, setHasSentInvite] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <Ionicons
              name="person-circle-outline"
              size={30}
              color="#007AFF"
              style={{ marginRight: 15 }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
            <Ionicons name="menu" size={30} color="#007AFF" style={{ marginRight: 10 }} />
          </TouchableOpacity>
          {menuVisible && (
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate("SettingsScreen");
                }}
              >
                <Text style={styles.menuText}>Asetukset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  alert("Tietoa sovelluksesta");
                }}
              >
                <Text style={styles.menuText}>Tietoa sovelluksesta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  alert("Tilin poistaminen ei ole vielä käytettävissä.");
                }}
              >
                <Text style={styles.menuText}>Poista tili</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ),
    });
  }, [navigation, menuVisible]);

  useEffect(() => {
    let unsubscribeInvitesCount = null;
    let unsubscribeActiveInvite = null;

    const fetchData = async () => {
      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        const userData = userDocSnap.data();
        const userCategories = userData.interests || [];

        const now = new Date();

        const invitesQuery = query(
          collection(db, "invites"),
          where("category", "in", userCategories),
          where("status", "==", "pending"),
          where("expirationTime", ">", now),
          where("creatorId", "!=", auth.currentUser.uid)
        );

        unsubscribeInvitesCount = onSnapshot(invitesQuery, (snapshot) => {
          setReceivedInvitesCount(snapshot.size);
        });

        const userInviteQuery = query(
          collection(db, "invites"),
          where("creatorId", "==", auth.currentUser.uid),
          where("status", "==", "pending"),
          where("expirationTime", ">", now)
        );

        unsubscribeActiveInvite = onSnapshot(userInviteQuery, (snapshot) => {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setHasActiveInvite(true);
            setUserActiveInvite({ id: docSnap.id, ...docSnap.data() });
          } else {
            setHasActiveInvite(false);
            setUserActiveInvite(null);
          }
        });

        const sentInvitesQuery = query(
          collection(db, "invites"),
          where("creatorId", "==", auth.currentUser.uid)
        );
        const sentInvitesSnap = await getDocs(sentInvitesQuery);
        setHasSentInvite(!sentInvitesSnap.empty);
      } catch (error) {
        console.error("Error fetching invites:", error);
        Alert.alert("Virhe", "Kutsujen haku epäonnistui.");
      }
    };

    fetchData();

    return () => {
      if (unsubscribeInvitesCount) unsubscribeInvitesCount();
      if (unsubscribeActiveInvite) unsubscribeActiveInvite();
    };
  }, []);

  const handleCreateOrEditInvite = () => {
    // Tarkistetaan, onko käyttäjällä voimassa olevaa kutsua
    if (hasActiveInvite) {
      navigation.navigate("EditInvite", { invite: userActiveInvite });
    } else {
      navigation.navigate("CreateInvite");
    }
  };

  const handleViewInvites = () => {
    navigation.navigate("ViewInvites");
  };

  return (
    <View style={styles.container}>
      <View style={styles.scrollContainer}>
        {/* Taustakuva ilman animaatiota */}
        <Image
          source={require("../assets/tori.jpg")} // Taustakuva
          style={styles.image}
          resizeMode="cover"
        />

        {/* Renderoi aktiivinen kutsu */}
        {hasActiveInvite && (
          <View style={styles.activeInviteContainer}>
            <Text style={styles.inviteTitle}>Aktiivinen kutsu:</Text>
            <Text style={styles.inviteDetails}>Kategoria: {userActiveInvite.category}</Text>
            <Text style={styles.inviteDetails}>Viimeinen päivä: {userActiveInvite.expirationTime.toDate().toLocaleDateString()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.createInviteButton}
        onPress={handleCreateOrEditInvite}
      >
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.createInviteText}>
          {hasActiveInvite ? "Muokkaa kutsua" : "Luo kutsu"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.readInvitesButton}
        onPress={handleViewInvites}
      >
        <Ionicons name="mail-unread-outline" size={24} color="#ffffff" />
        <Text style={styles.readInvitesText}>Lue kutsut</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  menuText: {
    fontSize: 16,
    color: "#333",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  image: {
    position: "absolute", // Taustakuva tulee koko näytön kokoiseksi
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
  },
  activeInviteContainer: {
    position: "absolute",
    bottom: 100,
    left: 20,
    padding: 15,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 10,
  },
  inviteTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  inviteDetails: {
    color: "#fff",
    fontSize: 14,
  },
  createInviteButton: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "#34C759",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  createInviteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
  readInvitesButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#007AFF",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
  },
  readInvitesText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
