import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View, Alert } from "react-native";
import AuthStack from "./src/navigation/AuthStack"; // Kirjautumis- ja rekisteröitymisnäkymät
import AppStack from "./src/navigation/AppStack"; // Tavalliset käyttäjänäkymät
import AdminDashboard from "./src/screens/AdminDashboard"; // Admin-näkymä
import { auth, db } from "./src/services/firebaseConfig"; // Firebase
import { doc, getDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null); // Käyttäjän kirjautumistila
  const [role, setRole] = useState(null); // Käyttäjän rooli
  const [loading, setLoading] = useState(true); // Lataustila

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Hae käyttäjän tiedot Firestoresta
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setRole(userData.role || null); // Tallenna käyttäjän rooli
        } else {
          Alert.alert("Virhe", "Käyttäjätietoja ei löytynyt.");
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false); // Lopeta lataus, kun kaikki tiedot on haettu
    });

    return unsubscribe; // Poista kuuntelija komponentin poistuessa
  }, []);

  if (loading) {
    // Näytä latausanimaatio, kunnes tiedot on haettu
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        role === "admin" ? (
          <AdminDashboard /> // Admin-näkymä
        ) : (
          <AppStack /> // Tavalliset käyttäjänäkymät
        )
      ) : (
        <AuthStack /> // Kirjautumis- ja rekisteröitymisnäkymät
      )}
    </NavigationContainer>
  );
}
