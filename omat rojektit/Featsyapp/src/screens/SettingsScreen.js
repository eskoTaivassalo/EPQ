import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
} from "react-native";

export default function SettingsScreen() {
  // Tilat henkilökohtaisille asetuksille
  const [username, setUsername] = useState("Käyttäjä");
  const [notifications, setNotifications] = useState(true);

  // Tilat ulkoasuun liittyville asetuksille
  const [theme, setTheme] = useState("default");

  const saveSettings = () => {
    alert("Asetukset tallennettu!");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Asetukset</Text>

      {/* Henkilökohtaiset asetukset */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionHeader}>Henkilökohtaiset asetukset</Text>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Käyttäjänimi:</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Syötä käyttäjänimesi"
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Ilmoitukset:</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
          />
        </View>
      </View>

      {/* Ulkoasuasetukset */}
      <View style={styles.settingsContainer}>
        <Text style={styles.sectionHeader}>Sovelluksen ulkoasu</Text>
        <View style={styles.settingItem}>
          <Text style={styles.label}>Teema:</Text>
          <TouchableOpacity
            style={[
              styles.themeOption,
              theme === "default" && styles.activeOption,
            ]}
            onPress={() => setTheme("default")}
          >
            <Text style={styles.themeText}>Oletus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.themeOption,
              theme === "modern" && styles.activeOption,
            ]}
            onPress={() => setTheme("modern")}
          >
            <Text style={styles.themeText}>Moderni</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tallenna-painike */}
      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveText}>Tallenna</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9f9f9",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  settingsContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  settingItem: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  themeOption: {
    padding: 10,
    backgroundColor: "#eaeaea",
    borderRadius: 5,
    marginTop: 5,
    alignItems: "center",
  },
  activeOption: {
    backgroundColor: "#007AFF",
  },
  themeText: {
    fontSize: 16,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
