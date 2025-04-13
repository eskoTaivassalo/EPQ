import React, { useState } from "react";
import { StyleSheet, Text, TextInput, Button, View, Alert } from "react-native";
import { auth } from "../services/firebaseConfig";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent!");
      setEmail("");
      navigation.goBack(); // Palaa takaisin kirjautumisnäkymään
    } catch (error) {
      console.error("Error sending password reset email:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Forgot Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button title="Send Reset Email" onPress={handlePasswordReset} />
      <Button title="Back to Login" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
});
