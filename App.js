import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

// Redux
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';
import { fetchNotifications } from './src/store/slices/notificationsSlice';

// Theme
import { ThemeProvider } from './src/contexts/ThemeContext';

// Hooks (Redux-based)
import { useAuth } from './src/hooks/useAuth';

// Screens - Auth
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';

// Screens - Teacher
import TeacherSignupScreen from './src/screens/teacher/TeacherSignupScreen';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import TeacherStudentsScreen from './src/screens/teacher/TeacherStudentsScreen';
import TeacherMyProfileScreen from './src/screens/teacher/TeacherMyProfileScreen';
import TeacherBookingsScreen from './src/screens/teacher/TeacherBookingsScreen';
import TeacherAvailabilityScreen from './src/screens/teacher/TeacherAvailabilityScreen';

// Screens - Parent
import ParentSignupScreen from './src/screens/parent/ParentSignupScreen';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import ParentProfileScreen from './src/screens/parent/ParentProfileScreen';
import ParentMyProfileScreen from './src/screens/parent/ParentMyProfileScreen';
import FavoritesScreen from './src/screens/parent/FavoritesScreen';
import ParentBookingsScreen from './src/screens/parent/ParentBookingsScreen';
import TeacherAvailableSlotsScreen from './src/screens/parent/TeacherAvailableSlotsScreen';
import TeacherWeeklyAvailabilityScreen from './src/screens/parent/TeacherWeeklyAvailabilityScreen';

// Screens - Shared
import FindTeachersScreen from './src/screens/shared/FindTeachersScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import CalendarScreen from './src/screens/shared/CalendarScreen';
import ConversationsScreen from './src/screens/shared/ConversationsScreen';
import ConversationThreadScreen from './src/screens/shared/ConversationThreadScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import LegalDocumentScreen from './src/screens/shared/LegalDocumentScreen';
import ChangeEmailScreen from './src/screens/shared/ChangeEmailScreen';

// Screens - Dev
import SecurityTestScreen from './src/screens/dev/SecurityTestScreen';
// Drawer removed due to Reanimated issues

// Components
import NotificationBell from './src/components/NotificationBell';
// ChatButton removed from header to reduce duplication; messages accessible via Tools/menus
// import ChatButton from './src/components/ChatButton';

// Services
import { AuthService } from './src/services/authService';
import * as NotificationService from './src/services/notificationService';
import { requestForegroundPermissions as requestLocationPermissions } from './src/services/locationService';

// Styles
import { colors } from './src/styles/commonStyles';
import { initGlobalErrorLogger } from './src/utils/globalErrorLogger';

const Stack = createStackNavigator();

// Loading component
const Loading = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

// Navigation component that uses Redux auth

import { useState } from 'react';
import { Linking } from 'react-native';

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated, loadStoredAuth } = useAuth();
  const [emailVerifiedDelay, setEmailVerifiedDelay] = useState(false);

  // Initialize global error logger once
  useEffect(() => {
    initGlobalErrorLogger();
  }, []);

  // Load stored auth on app start & Configure Google Sign-In & Request notification permissions
  useEffect(() => {
    loadStoredAuth();
    
    // Konfiguroi Google Sign-In
    try {
      AuthService.configureGoogleSignIn();
      console.log('✅ Google Sign-In configured in App.js');
    } catch (error) {
      console.error('❌ Failed to configure Google Sign-In:', error);
    }

    // Request notification permissions
    NotificationService.requestNotificationPermissions();

    // Request location permissions on app start (foreground)
    (async () => {
      try {
        const { granted, status } = await requestLocationPermissions();
        console.log('📍 Location permission status:', status, 'granted:', granted);
      } catch (e) {
        console.warn('📍 Failed to request location permission on startup:', e);
      }
    })();
  }, []);

  // Load notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      dispatch(fetchNotifications(user.uid));
    }
  }, [isAuthenticated, user?.uid, dispatch]);

  // Viivästetään email verification -näkymän näyttöä päivityksen jälkeen
  useEffect(() => {
    if (isAuthenticated && user && !user.emailVerified) {
      setEmailVerifiedDelay(true);
      const timer = setTimeout(() => setEmailVerifiedDelay(false), 1500); // 1.5s viive
      return () => clearTimeout(timer);
    } else {
      setEmailVerifiedDelay(false);
    }
  }, [isAuthenticated, user?.emailVerified]);

  // Setup notification tap handler - open meeting link when notification is tapped
  useEffect(() => {
    const subscription = NotificationService.addNotificationResponseListener((data) => {
      const { meetingUrl, bookingId, type } = data;
      
      if (type === 'booking_reminder' && meetingUrl) {
        console.log('🎥 Opening meeting from notification:', meetingUrl);
        Linking.openURL(meetingUrl);
      }
    });

    return () => subscription.remove();
  }, []);

  if (loading || emailVerifiedDelay) {
    return <Loading />;
  }

  return (
    <NavigationContainer>
      { /* ErrorBoundary could be added here if needed for UI fallback */ }
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
            <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
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
                <Stack.Screen 
                  name="TeacherDashboard" 
                  component={TeacherDashboard}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="TeacherMyProfile" component={TeacherMyProfileScreen} />
                <Stack.Screen name="TeacherBookings" component={TeacherBookingsScreen} />
                <Stack.Screen name="TeacherAvailability" component={TeacherAvailabilityScreen} />
                <Stack.Screen name="TeacherStudents" component={TeacherStudentsScreen} />
                {/* Allow teachers to open a parent's profile from Students list */}
                <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Conversations" component={ConversationsScreen} />
                <Stack.Screen name="ConversationThread" component={ConversationThreadScreen} />
                <Stack.Screen 
                  name="Settings" 
                  component={SettingsScreen}
                  options={{ title: 'Settings' }}
                />
                <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
                <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
                <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
              </>
            ) : (
              <>
                <Stack.Screen 
                  name="ParentDashboard" 
                  component={ParentDashboard}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="ParentMyProfile" component={ParentMyProfileScreen} />
                <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
                <Stack.Screen name="ParentFavorites" component={FavoritesScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="ParentBookings" component={ParentBookingsScreen} />
                <Stack.Screen name="TeacherAvailableSlots" component={TeacherAvailableSlotsScreen} />
                <Stack.Screen name="TeacherWeeklyAvailability" component={TeacherWeeklyAvailabilityScreen} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Conversations" component={ConversationsScreen} />
                <Stack.Screen name="ConversationThread" component={ConversationThreadScreen} />
                <Stack.Screen 
                  name="Settings" 
                  component={SettingsScreen}
                  options={{ title: 'Settings' }}
                />
                <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
                <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
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
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <ThemeProvider>
          <StatusBar style="light" backgroundColor={colors.primary} />
          <AppContent />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

// Separate component that has access to Redux store
const AppContent = () => {
  return <AppNavigator />;
};
