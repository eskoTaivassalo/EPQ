import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import TeacherSignupScreen from './src/screens/TeacherSignupScreen';
import ParentSignupScreen from './src/screens/ParentSignupScreen';
import TeacherDashboard from './src/screens/TeacherDashboard';
import ParentDashboard from './src/screens/ParentDashboard';
import TeacherProfileScreen from './src/screens/TeacherProfileScreen';
import TeacherMyProfileScreen from './src/screens/TeacherMyProfileScreen';
import ParentProfileScreen from './src/screens/ParentProfileScreen';
import ParentMyProfileScreen from './src/screens/ParentMyProfileScreen';
import FindTeachersScreen from './src/screens/FindTeachersScreen';
import SecurityTestScreen from './src/screens/SecurityTestScreen';
import EmailVerificationScreen from './src/screens/EmailVerificationScreen';

// Styles
import { colors } from './src/styles/commonStyles';

const Stack = createStackNavigator();

// Loading component
const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

// Navigation component that uses auth context
const AppNavigator = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background }
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="TeacherSignup" component={TeacherSignupScreen} />
            <Stack.Screen name="ParentSignup" component={ParentSignupScreen} />
          </>
        ) : !user?.emailVerified ? (
          // 📧 Email verification required screen
          <>
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          </>
        ) : (
          // Main app screens based on user type (only after email verified)
          <>
            {user?.type === 'teacher' || user?.userType === 'teacher' ? (
              <>
                <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
                <Stack.Screen name="TeacherMyProfile" component={TeacherMyProfileScreen} />
                <Stack.Screen name="TeacherProfile" component={TeacherProfileScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
                <Stack.Screen name="ParentMyProfile" component={ParentMyProfileScreen} />
                <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <AppNavigator />
    </AuthProvider>
  );
}
