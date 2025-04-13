// src/screens/EditInviteScreen.js
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { auth, db } from "../services/firebaseConfig";
import { collection, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

export default function EditInviteScreen({ route, navigation }) {
  const { invite } = route.params;

  const [categories, setCategories] = useState([]); // Kategoriat Firestoresta
  const [selectedCategory, setSelectedCategory] = useState(invite.category); // Valittu kategoria
  const [description, setDescription] = useState(invite.description); // Kutsun kuvaus
  const [location, setLocation] = useState(invite.location); // Käyttäjän sijainti
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false); // Poistamisen latausindikaattori

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categorySnapshot = await getDocs(collection(db, "categories"));
        const fetchedCategories = categorySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.id,
          icon: doc.data().icon || "help-circle-outline",
        }));
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Virhe", "Kategorioiden haku epäonnistui.");
      }
    };

    fetchCategories();
  }, []);

  const handleUpdateInvite = async () => {
    if (!selectedCategory || !description) {
      Alert.alert("Virhe", "Täytä kaikki kentät.");
      return;
    }

    try {
      setLoading(true);

      await updateDoc(doc(db, "invites", invite.id), {
        category: selectedCategory,
        description: description,
        location: location,
        timestamp: new Date(),
      });

      Alert.alert("Onnistui", "Kutsu päivitetty onnistuneesti!");
      navigation.goBack();
    } catch (error) {
      console.error("Error updating invite:", error);
      Alert.alert("Virhe", "Kutsun päivitys epäonnistui.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = () => {
    Alert.alert(
      "Vahvista Poisto",
      "Haluatko varmasti poistaa tämän kutsun?",
      [
        {
          text: "Peruuta",
          style: "cancel",
        },
        {
          text: "Poista",
          style: "destructive",
          onPress: deleteInvite,
        },
      ],
      { cancelable: true }
    );
  };

  const deleteInvite = async () => {
    try {
      setDeleting(true);
      await deleteDoc(doc(db, "invites", invite.id));
      Alert.alert("Onnistui", "Kutsu poistettu onnistuneesti!");
      navigation.goBack();
    } catch (error) {
      console.error("Error deleting invite:", error);
      Alert.alert("Virhe", "Kutsun poistaminen epäonnistui.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Muokkaa kutsua</Text>

      {/* Kategoria-valinta */}
      <Text style={styles.label}>Valitse kategoria:</Text>
      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              selectedCategory === category.id && styles.categoryItemSelected,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === category.id && styles.categoryTextSelected,
              ]}
            >
              {category.name}
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
          Leveysaste: {location.latitude}, Pituusaste: {location.longitude}
        </Text>
      ) : (
        <Text>Ladataan sijaintia...</Text>
      )}

      {/* Päivitä kutsu -painike */}
      <Button
        title={loading ? "Päivitetään..." : "Päivitä kutsu"}
        onPress={handleUpdateInvite}
        disabled={loading}
      />

      {/* Poista kutsu -painike */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDeleteInvite}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteButtonText}>Poista kutsu</Text>
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
  categoryItem: {
    padding: 10,
    borderColor: "gray",
    borderWidth: 1,
    margin: 5,
    borderRadius: 5,
  },
  categoryItemSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#005BB5",
  },
  categoryText: {
    color: "#000",
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
  deleteButton: {
    marginTop: 20,
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
