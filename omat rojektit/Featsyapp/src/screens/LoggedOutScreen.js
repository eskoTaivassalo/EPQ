import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";

export default function LoggedOutScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Olet kirjautunut ulos</Text>
      <Text style={styles.text}>
        Kiitos kun olit mukana. Tervetuloa takaisin Feattaamaan!
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>Siirry kirjautumaan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    padding: 15,
    backgroundColor: "#007AFF",
    borderRadius: 10,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
