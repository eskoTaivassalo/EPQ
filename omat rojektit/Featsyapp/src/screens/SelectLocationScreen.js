import React, { useState, useEffect } from "react";
import { View, Text, Picker, ActivityIndicator, StyleSheet } from "react-native";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function SelectLocationScreen({ navigation }) {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "cities"));
        const cityList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCities(cityList);
        setLoading(false);
      } catch (error) {
        console.error("Virhe kaupunkien haussa:", error);
        setLoading(false);
      }
    };

    fetchCities();
  }, []);

  const handleCitySelect = async (city) => {
    setSelectedCity(city);
    // Tallenna valittu kaupunki käyttäjän tietoihin
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, {
        city: city.name,
        latitude: city.latitude,
        longitude: city.longitude,
      });
      navigation.goBack();
    } catch (error) {
      console.error("Virhe sijainnin tallentamisessa:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Valitse sijaintisi:</Text>
      <Picker
        selectedValue={selectedCity}
        onValueChange={(itemValue) => handleCitySelect(itemValue)}
      >
        {cities.map((city) => (
          <Picker.Item key={city.id} label={city.name} value={city} />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
  },
});
