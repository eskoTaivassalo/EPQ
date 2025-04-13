// src/screens/AdminDashboard.js

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";

export default function AdminDashboard({ navigation }) {
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch suggested categories from Firestore
  useEffect(() => {
    fetchSuggestedCategories();
  }, []);

  const addCategories = async () => {
    const categories = [
      { id: "sports", name: "Liikunta ja urheilu" },
      { id: "games", name: "Pelit ja kilpailut" },
      { id: "culture", name: "Kulttuuri ja taide" },
      { id: "food", name: "Ruoka ja juoma" },
      { id: "hobbies", name: "Vapaa-aika ja harrastukset" },
    ];

    try {
      for (const category of categories) {
        await setDoc(doc(collection(db, "categories"), category.id), {
          name: category.name,
        });
      }
      console.log("Categories added successfully!");
    } catch (error) {
      console.error("Error adding categories:", error);
    }
  };

  // Fetch pending category suggestions from Firestore
  const fetchSuggestedCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "pendingCategories"));
      const suggestions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        mainCategory: doc.data().mainCategory,
        subCategory: doc.data().subCategory,
        description: doc.data().description,
        requestedBy: doc.data().requestedBy,
      }));
      setSuggestedCategories(suggestions);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching suggested categories:", error);
      Alert.alert("Error", "Failed to fetch suggested categories.");
      setLoading(false);
    }
  };

  // Approve category suggestion
  const approveCategory = async (category) => {
    try {
      // Add to main categories collection
      await setDoc(doc(db, "categories", category.mainCategory), {
        name: category.mainCategory,
        subCategory: category.subCategory,
        description: category.description,
        users: [],
      });

      // Remove from pending categories
      await deleteDoc(doc(db, "pendingCategories", category.id));

      // Update local state
      setSuggestedCategories((prev) =>
        prev.filter((item) => item.id !== category.id)
      );

      Alert.alert("Success", `Category "${category.mainCategory}" approved.`);
    } catch (error) {
      console.error("Error approving category:", error);
      Alert.alert("Error", `Failed to approve category "${category.mainCategory}".`);
    }
  };

  // Reject category suggestion
  const rejectCategory = async (category) => {
    try {
      // Remove from pending categories
      await deleteDoc(doc(db, "pendingCategories", category.id));

      // Update local state
      setSuggestedCategories((prev) =>
        prev.filter((item) => item.id !== category.id)
      );

      Alert.alert("Success", `Category "${category.mainCategory}" rejected.`);
    } catch (error) {
      console.error("Error rejecting category:", error);
      Alert.alert("Error", `Failed to reject category "${category.mainCategory}".`);
    }
  };

  // Category suggestion item renderer
  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryItem}>
      <Text style={styles.categoryText}>{item.mainCategory}</Text>
      <Text style={styles.subCategoryText}>Subcategory: {item.subCategory}</Text>
      <Text style={styles.descriptionText}>Description: {item.description}</Text>
      <Text style={styles.requestedByText}>Suggested by: {item.requestedBy}</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => approveCategory(item)}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => rejectCategory(item)}
        >
          <Text style={styles.buttonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>Loading suggested categories...</Text>
      </View>
    );
  }

  // Handle admin logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      Alert.alert("Success", "Logged out successfully.");
    } catch (error) {
      console.error("Error logging out:", error);
      Alert.alert("Error", "Logout failed.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <Text style={styles.text}>Welcome to the Admin Dashboard!</Text>

      <View style={styles.suggestionsContainer}>
        <Text style={styles.subHeader}>Suggested Categories</Text>
        {suggestedCategories.length === 0 ? (
          <Text style={styles.noSuggestions}>No new suggestions available.</Text>
        ) : (
          <FlatList
            data={suggestedCategories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F9FAFB",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 20,
  },
  suggestionsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContainer: {
    paddingBottom: 20,
  },
  categoryItem: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    fontSize: 18,
    color: "#111827",
    marginBottom: 10,
  },
  subCategoryText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  requestedByText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  approveButton: {
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
  noSuggestions: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 15,
    marginTop: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

