// src/screens/CreateInviteScreen.js
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, Button, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { auth, db } from "../services/firebaseConfig";
import * as Location from "expo-location";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native"; // Käytä tätä navigointiin

export default function CreateInviteScreen() {
  const [categories, setCategories] = useState([]); // Kategoriat Firestoresta
  const [selectedCategory, setSelectedCategory] = useState(""); // Valittu kategoria
  const [description, setDescription] = useState(""); // Kutsun kuvaus
  const [location, setLocation] = useState(null); // Käyttäjän sijainti
  const [loading, setLoading] = useState(false);

  const navigation = useNavigation(); // Hanki navigointi objekti

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categorySnapshot = await getDocs(collection(db, "categories"));
        const fetchedCategories = categorySnapshot.docs.map((doc) => doc.id); // Korjattu kohta
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Virhe", "Kategorioiden haku epäonnistui.");
      }
    };

    const fetchLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Virhe", "Sijaintilupaa ei myönnetty.");
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error("Error fetching location:", error);
        Alert.alert("Virhe", "Sijainnin haku epäonnistui.");
      }
    };

    fetchCategories();
    fetchLocation();
  }, []);

  const handleCreateInvite = async () => {
    if (!selectedCategory || !description || !location) {
      Alert.alert("Virhe", "Täytä kaikki kentät.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "invites"), {
        creatorId: auth.currentUser.uid,
        creatorEmail: auth.currentUser.email, // Lisätään lähettäjän sähköposti
        category: selectedCategory,
        description: description,
        location: location,
        timestamp: new Date(),
        expirationTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000), // 2 tuntia eteenpäin
        status: "pending", // Lisätään status
      });

      // Näytä vahvistusviesti
      Alert.alert(
        "Onnistui",
        "Kutsu lähetetty, toivottavasti kutsusi tavoittaa jonkun henkilön.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(), // Navigoi takaisin etusivulle
          },
        ],
        { cancelable: false }
      );

      // Resetoi tilat (valinnat)
      setSelectedCategory("");
      setDescription("");
    } catch (error) {
      console.error("Error creating invite:", error);
      Alert.alert("Virhe", "Kutsun luonti epäonnistui.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Luo kutsu</Text>

      {/* Kategoria-valinta */}
      <Text style={styles.label}>Valitse kategoria:</Text>
      <View style={styles.categoryContainer}>
        {categories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonSelected,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextSelected,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Kutsun kuvaus */}
      <Text style={styles.label}>Kuvaus:</Text>
      <TextInput
        style={styles.input}
        placeholder="Kirjoita kutsun kuvaus..."
        value={description}
        onChangeText={setDescription}
      />

      {/* Sijainti */}
      <Text style={styles.label}>Sijainti:</Text>
      {location ? (
        <Text>
          Leveysaste: {location.latitude.toFixed(4)}, Pituusaste: {location.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text>Ladataan sijaintia...</Text>
      )}

      {/* Lähetä kutsu -painike */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleCreateInvite}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Luo kutsu</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    margin: 5,
    backgroundColor: "#f2f2f2",
  },
  categoryButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#005BB5",
  },
  categoryText: {
    color: "#000",
    fontSize: 14,
  },
  categoryTextSelected: {
    color: "#fff",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: "#f9f9f9",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#7aaeff",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
