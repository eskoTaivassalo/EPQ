import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

export default function AdminOrHomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Valitse näkymä</Text>
      <Text style={styles.text}>Kirjaudu joko ylläpitonäkymään tai käyttäjänäkymään.</Text>

      <Button
        title="Admin Dashboard"
        onPress={() => navigation.replace("AdminDashboard")}
      />
      <Button
        title="Home Screen"
        onPress={() => navigation.replace("Home")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  text: { fontSize: 16, marginBottom: 20, textAlign: "center" },
});
