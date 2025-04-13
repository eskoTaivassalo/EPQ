import React, { useState, useEffect, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { StyleSheet, Text, TextInput, Button, View, Alert, FlatList, TouchableOpacity, ImageBackground, KeyboardAvoidingView, Platform } from "react-native";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import * as Location from "expo-location";
import { ProgressBar } from "react-native-paper";

const backgroundImage = require("../assets/tori.jpg");

export default function RegisterScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(1);

  // State variables
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newCategorySuggestion, setNewCategorySuggestion] = useState({
    mainCategory: "",
    subCategory: "",
    description: "",
  });
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [showAge, setShowAge] = useState(true);
  const [showGender, setShowGender] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch categories from Firebase
  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const querySnapshot = await getDocs(collection(db, "categories"));
      const categoryList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.id,
      }));
      setCategories(categoryList);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategorySuggestion = async () => {
    const { mainCategory, subCategory, description } = newCategorySuggestion;
  
    if (!mainCategory.trim() || !description.trim()) {
      Alert.alert("Virhe", "Syötä kategorian nimi ja kuvaus.");
      return;
    }
  
    try {
      // Saving the new category suggestion in 'pendingCategories' collection
      const newCategoryRef = doc(collection(db, "pendingCategories"));
      
      await setDoc(newCategoryRef, {
        mainCategory,
        subCategory,
        description,
        status: "pending", // You can add a status field to indicate the state of the suggestion
        createdAt: new Date(),
      });
  
      Alert.alert("Onnistui", "Kategorian ehdotus lisätty.");
  
      // Clear the input fields after saving the suggestion
      setNewCategorySuggestion({
        mainCategory: "",
        subCategory: "",
        description: "",
      });
    } catch (error) {
      console.error("Virhe kategorian lisäämisessä:", error);
      Alert.alert("Virhe", "Kategorian ehdotus epäonnistui.");
    }
  };
  
  // Fetch location
  const fetchLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Virhe", "Sijaintilupaa ei myönnetty.");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Update the city name as well if possible
      const city = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      setCityName(city[0]?.city || "");
    } catch (error) {
      console.error("Error fetching location:", error);
      Alert.alert("Virhe", "Sijainnin haku epäonnistui.");
    }
  };

  // Camera and gallery image picker
  const pickImageFromCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Virhe", "Kameran käyttöoikeus vaaditaan kuvan ottamiseen.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.uri);
    }
  };

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Virhe", "Gallerian käyttöoikeus vaaditaan kuvan lataamiseen.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.uri);
    }
  };

  // Register user
  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert("Virhe", "Syötä nimesi.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Virhe", "Syötä kelvollinen sähköpostiosoite.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Virhe", "Salasanan on oltava vähintään 6 merkkiä pitkä.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Virhe", "Salasanat eivät täsmää.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        bio,
        gender: showGender ? gender : null,
        age: showAge ? age : null,
        location: location || { city: cityName },
        interests: selectedCategories,
  
        createdAt: new Date(),
      });

    
      navigation.navigate("Home");
    } catch (error) {
      console.error("Error creating account:", error);
      Alert.alert("Virhe", "Tapahtui tuntematon virhe. Yritä uudelleen.");
    }
  };

  // Navigation between steps
  const handleNextStep = () => {
    if (currentStep === 1 && selectedCategories.length === 0) {
      Alert.alert("Virhe", "Valitse vähintään yksi kategoria.");
      return;
    } else if (currentStep === 2 && !location && !cityName.trim()) {
      Alert.alert("Virhe", "Salli sijainnin käyttö tai syötä kaupunki.");
      return;
    } else if (currentStep === 3 && !bio.trim()) {
      Alert.alert("Virhe", "Täytä lyhyt kuvaus.");
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Valitse kategoriat</Text>
            <FlatList
             data={categories}
             keyExtractor={(item) => item.id}
             numColumns={2}
             renderItem={({ item }) => (
               <TouchableOpacity
                 style={[
                   styles.categoryItem,
                   selectedCategories.includes(item.id) && styles.categoryItemSelected,
                 ]}
                 onPress={() =>
                   setSelectedCategories((prev) =>
                     prev.includes(item.id)
                       ? prev.filter((cat) => cat !== item.id)
                       : [...prev, item.id]
                   )
                 }
               >
   
                  <Text style={styles.categoryText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
                     <Text style={styles.label}>Ehdota uutta kategoriaa:</Text>
  <TextInput
    style={styles.input}
    placeholder="Kategorian nimi"
    value={newCategorySuggestion.mainCategory}
    onChangeText={(text) =>
      setNewCategorySuggestion((prev) => ({ ...prev, mainCategory: text }))
    }
  />
  <TextInput
    style={styles.input}
    placeholder="Alakategoria"
    value={newCategorySuggestion.subCategory}
    onChangeText={(text) =>
      setNewCategorySuggestion((prev) => ({ ...prev, subCategory: text }))
    }
  />
  <TextInput
    style={styles.input}
    placeholder="Kuvaus"
    value={newCategorySuggestion.description}
    onChangeText={(text) =>
      setNewCategorySuggestion((prev) => ({ ...prev, description: text }))
    }
  />
  
  <Button title="Lähetä ehdotus" onPress={handleCategorySuggestion} />
</View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Aseta sijaintisi</Text>
            <Button title="Käytä nykyistä sijaintia" onPress={fetchLocation} />
            <TextInput
              style={styles.input}
              placeholder="Tai syötä kaupunki"
              value={cityName}
              onChangeText={setCityName}
            />
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Lisätiedot</Text>
            <TextInput
              style={styles.input}
              placeholder="Lyhyt kuvaus itsestäsi"
              value={bio}
              onChangeText={setBio}
            />
            <View style={styles.buttonContainer}>
              <Button title="Ota kuva" onPress={pickImageFromCamera} />
              <Button title="Lataa kuva" onPress={pickImageFromGallery} />
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>Rekisteröidy</Text>
            <TextInput
              style={styles.input}
              placeholder="Nimi"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Sähköposti"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Salasana"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Vahvista salasana"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <Button title="Rekisteröidy" onPress={handleRegister} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground source={backgroundImage} style={styles.background}>
        <ProgressBar progress={currentStep / 4} color="#9b6b43" style={styles.progressBar} />
        {renderStepContent()}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && <Button title="Edellinen" onPress={handlePreviousStep} />}
          {currentStep < 4 && <Button title="Seuraava" onPress={handleNextStep} />}
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  stepContainer: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  categoryItem: {
    backgroundColor: "#eee",
    padding: 10,
    margin: 5,
    borderRadius: 5,
    width: "45%",
    alignItems: "center",
  },
  categoryItemSelected: {
    backgroundColor: "#9b6b43",
  },
  categoryText: {
    color: "#333",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    
  },
  progressBar: {
    marginBottom: 20,
    marginTop: 10,
    height: 8,
  },
});
