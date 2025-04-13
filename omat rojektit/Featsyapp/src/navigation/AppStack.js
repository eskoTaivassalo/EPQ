import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Import all screens
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CreateInviteScreen from "../screens/CreateInviteScreen";
import ViewInvitesScreen from "../screens/ViewInvitesScreen";
import ChatScreen from "../screens/ChatScreen";
import EditInviteScreen from "../screens/EditInviteScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AdminDashboard from "../screens/AdminDashboard"; // Adjust the path as necessary

const Stack = createStackNavigator();

export default function AppStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home" // Määritetään aloitusreitti tässä
      screenOptions={({ navigation }) => ({
        headerShown: true,
        // Left logo
        headerLeft: () => (
          <TouchableOpacity
            style={{ marginLeft: 15 }}
            onPress={() => navigation.navigate("Home")}
          >
            <Image
              source={require("../assets/featsy.png")}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ),
        // Right profile icon
        headerRight: () => (
          <Ionicons
            name="person-circle-outline"
            size={30}
            color="#007AFF"
            style={{ marginRight: 15 }}
            onPress={() => navigation.navigate("Profile")}
          />
        ),
      })}
    >
      {/* Home */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Home" }}
      />

      {/* Profile */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />

      {/* Create Invite */}
      <Stack.Screen
        name="CreateInvite"
        component={CreateInviteScreen}
        options={{ title: "Luo kutsu" }}
      />

      {/* View Invites */}
      <Stack.Screen
        name="ViewInvites"
        component={ViewInvitesScreen}
        options={{ title: "Kutsut" }}
      />

      {/* Edit Invite */}
      <Stack.Screen
        name="EditInvite"
        component={EditInviteScreen}
        options={{ title: "Muokkaa kutsua" }}
      />

      {/* Chat */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Chat" }}
      />

      {/* Admin Dashboard */}
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: "Ylläpitonäkymä" }}
      />

      {/* Settings */}
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ title: "Asetukset valikko" }}
      />
    </Stack.Navigator>
  );
}
