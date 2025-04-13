import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const [profileData, setProfileData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);



  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileData(data);
            setProfileImage(data.profileImage || null);
            setSelectedCategories(data.interests || []);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const categorySnapshot = await getDocs(collection(db, "categories"));
        const allCategories = categorySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(allCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    const fetchData = async () => {
      await fetchProfileData();
      await fetchCategories();
    };

    fetchData();
  }, []);

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.cancelled) return;

      const uri = result.uri;
      setProfileImage(uri);
      await uploadImageToFirebase(uri);
    } catch (error) {
      console.error("Error picking image from camera:", error);
      Alert.alert("Virhe", "Kuvan ottaminen epäonnistui.");
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (result.cancelled) return;

      const uri = result.uri;
      setProfileImage(uri);
      await uploadImageToFirebase(uri);
    } catch (error) {
      console.error("Error picking image from gallery:", error);
      Alert.alert("Virhe", "Kuvan valinta epäonnistui.");
    }
  };

  const uploadImageToFirebase = async (uri) => {
    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profileImages/${auth.currentUser.uid}.jpg`);
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await saveImageToFirestore(downloadURL);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Virhe", "Kuvan lataaminen epäonnistui.");
    }
  };

  const saveImageToFirestore = async (downloadURL) => {
    try {
      const userDoc = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDoc, { profileImage: downloadURL });
      Alert.alert("Onnistui", "Profiilikuva päivitetty!");
    } catch (error) {
      console.error("Error saving image URL:", error);
      Alert.alert("Virhe", "Kuvan URI:n tallennus epäonnistui.");
    }
  };

  const handleCategoryToggle = async (category) => {
    const updatedCategories = selectedCategories.includes(category.id)
      ? selectedCategories.filter((cat) => cat !== category.id)
      : [...selectedCategories, category.id];

    setSelectedCategories(updatedCategories);

    try {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        await updateDoc(docRef, { interests: updatedCategories });
      }
    } catch (error) {
      console.error("Error updating categories:", error);
      Alert.alert("Virhe", "Kategorioiden päivitys epäonnistui.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Virhe", "Uloskirjautuminen epäonnistui.");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Profiilitietoja ei saatavilla.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profiili</Text>
      {profileImage ? (
        <Image source={{ uri: profileImage }} style={styles.profileImage} />
      ) : (
        <Ionicons name="person-circle-outline" size={100} color="#ccc" />
      )}

      <View style={styles.buttonContainer}>
    
        <TouchableOpacity style={styles.button} onPress={pickImageFromCamera}>
          <Text style={styles.buttonText}>Ota kuva</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={pickImageFromGallery}>
          <Text style={styles.buttonText}>Valitse kuva galleriasta</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.text}>Nimi: {profileData.name || "N/A"}</Text>
      <Text style={styles.text}>Sähköposti: {profileData.email || "N/A"}</Text>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryItem,
              selectedCategories.includes(item.id) && styles.categoryItemSelected,
            ]}
            onPress={() => handleCategoryToggle(item)}
          >
            <Ionicons name="help-circle-outline" size={24} color="#007AFF" />
            <Text>{item.id}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#ffffff" />
        <Text style={styles.logoutText}>Kirjaudu ulos</Text>
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    alignSelf: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
  },
  categoryItem: {
    flex: 1,
    margin: 5,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    backgroundColor: "#ffffff",
  },
  categoryItemSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#005BB5",
  },
  text: {
    fontSize: 16,
    marginBottom: 10,
  },
  logoutButton: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "#FF3B30",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
