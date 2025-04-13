import React, { useState } from "react";
import { StyleSheet, Text, TextInput, Button, View, Alert, ImageBackground, KeyboardAvoidingView, Platform } from "react-native";
import { auth, db } from "../services/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ProgressBar } from "react-native-paper";

const backgroundImage = require("../assets/tori.jpg");

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if the email is verified
      if (!user.emailVerified) {
        Alert.alert("Error", "Email is not verified.");
        return;
      }

      // Fetch user data from Firestore (e.g., role)
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Check the role from Firestore
        switch (userData.role) {
        
          case "admin":
            navigation.replace("AdminDashboard");
            break;
          default:
            navigation.replace("Home");
            break;
        }
      } else {
        // If user document doesn't exist, redirect to the default home
        navigation.replace("Home");
      }
    } catch (error) {
      console.error("Error during login:", error);
      Alert.alert("Error", "Login failed. Check email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ImageBackground source={backgroundImage} style={styles.background}>
        <ProgressBar progress={1} color="#9b6b43" style={styles.progressBar} />
        <View style={styles.stepContainer}>
          <Text style={styles.title}>Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button title="Login" onPress={handleLogin} disabled={isLoading} />

          <View style={styles.buttonContainer}>
            <Button title="Forgot Password?" onPress={() => navigation.navigate("ForgotPassword")} />
            <Button title="Register here" onPress={() => navigation.navigate("Register")} />
          </View>
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
  progressBar: {
    marginBottom: 20,
    marginTop: 10,
    height: 8,
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
  buttonContainer: {
    marginTop: 20,
  },
});
