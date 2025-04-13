import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import AdminOrHomeScreen from "../screens/AdminOrHomeScreen";



const Stack = createStackNavigator();

export default function AuthStack() {
  return (
    
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen
          name="AdminOrHomeScreen"
          component={AdminOrHomeScreen}
          options={{ headerShown: true, title: "Valitse näkymä" }}
        />
      </Stack.Navigator>
    
  );
}
