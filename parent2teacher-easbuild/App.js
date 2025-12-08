import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, AppState, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

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
import RoleSignupScreen from './src/screens/auth/RoleSignupScreen';

// Screens - Shared (Role-based)
import RoleDashboard from './src/screens/shared/RoleDashboard';
import BookingsScreen from './src/screens/shared/BookingsScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import AvailabilityScreen from './src/screens/shared/AvailabilityScreen';

// Screens - Provider (Legacy)
import ProviderSignupScreen from './src/screens/provider/ProviderSignupScreen';
import ClientsScreen from './src/screens/shared/ClientsScreen';
import ProviderBookingsScreen from './src/screens/provider/ProviderBookingsScreen';
import ProviderAvailabilityScreen from './src/screens/provider/ProviderAvailabilityScreen';

// Screens - Client (Legacy)
import ClientSignupScreen from './src/screens/client/ClientSignupScreen';
import FavoriteProvidersScreen from './src/screens/shared/FavoriteProvidersScreen';
import ClientBookingsScreen from './src/screens/client/ClientBookingsScreen';
import ProviderAvailableSlotsScreen from './src/screens/shared/ProviderAvailableSlotsScreen';
import ProviderWeeklyAvailabilityScreen from './src/screens/shared/ProviderWeeklyAvailabilityScreen';
import ProviderAvailabilityCalendarScreen from './src/screens/shared/ProviderAvailabilityCalendarScreen';
import TeacherCalendarScreen from './src/screens/shared/TeacherCalendarScreen';

// Screens - Shared
import FindProvidersScreen from './src/screens/shared/FindProvidersScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import CalendarScreen from './src/screens/shared/CalendarScreen';
import ConversationsScreen from './src/screens/shared/ConversationsScreen';
import ConversationThreadScreen from './src/screens/shared/ConversationThreadScreen';
import SettingsScreen from './src/screens/shared/SettingsScreen';
import LegalDocumentScreen from './src/screens/shared/LegalDocumentScreen';
import ChangeEmailScreen from './src/screens/shared/ChangeEmailScreen';
import ChangePasswordScreen from './src/screens/shared/ChangePasswordScreen';

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
import { registerAndSaveExpoPushToken } from './src/services/pushService';
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

  // Register Expo push token after authentication (and email verified)
  useEffect(() => {
    (async () => {
      try {
        if (isAuthenticated && user?.uid && (user?.emailVerified ?? true)) {
          console.log('[push] 📱 Registering Expo push token for user:', user.uid);
          const token = await registerAndSaveExpoPushToken(user.uid);
          if (token) {
            console.log('[push] ✅ Expo token registered & saved:', token);
          } else {
            console.log('[push] ⚠️ Expo token not registered (permission denied or not a physical device)');
          }
        } else {
          console.log('[push] ⏸️ Waiting for authentication and email verification...');
        }
      } catch (e) {
        console.error('[push] ❌ Token registration threw:', e?.message || e);
      }
    })();
  }, [isAuthenticated, user?.uid, user?.emailVerified]);

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

  // Clear badge count and dismiss notifications when app becomes active
  useEffect(() => {
    const clearBadgeAndNotifications = async () => {
      try {
        const Notifications = await import('expo-notifications');
        
        // Clear badge count
        await Notifications.setBadgeCountAsync(0);
        console.log('[push] 🔔 Badge count cleared to 0');
        
        // Dismiss all delivered notifications from notification center
        await Notifications.dismissAllNotificationsAsync();
        console.log('[push] 🗑️ All notifications dismissed');
      } catch (e) {
        console.warn('[push] Failed to clear badge/notifications:', e?.message);
      }
    };

    // Clear immediately on mount
    clearBadgeAndNotifications();

    // Listen to app state changes and clear when app becomes active
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      console.log('[push] 📱 App state changed to:', nextAppState);
      if (nextAppState === 'active') {
        console.log('[push] 🔄 App became active, clearing badge...');
        clearBadgeAndNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Setup notification tap handler - open meeting link when notification is tapped
  useEffect(() => {
    console.log('[push] 🎧 Setting up notification tap listener...');
    const subscription = NotificationService.addNotificationResponseListener((data) => {
      const { meetingUrl, bookingId, type, exceptionDate, reason } = data;
      
      console.log('[push] 👆 Notification tapped:', { type, bookingId, meetingUrl, exceptionDate, reason });
      
      if (type === 'booking_reminder' && meetingUrl) {
        console.log('[push] 🎥 Opening meeting from notification:', meetingUrl);
        Linking.openURL(meetingUrl);
      } else if (type === 'booking_exception') {
        console.log('[push] 🚫 Student cancellation:', { exceptionDate, reason });
        const dateStr = exceptionDate ? new Date(exceptionDate).toLocaleDateString() : 'Unknown date';
        Alert.alert(
          'Student Cannot Attend',
          `Date: ${dateStr}\n\nReason: ${reason || 'No reason provided'}`,
          [{ text: 'OK' }]
        );
      } else if (type === 'new_booking') {
        console.log('[push] 📅 New booking notification tapped, bookingId:', bookingId);
        // Could navigate to bookings screen here if needed
      }
      
      // Decrement badge count by 1 after handling notification
      (async () => {
        try {
          const Notifications = await import('expo-notifications');
          const currentBadge = await Notifications.getBadgeCountAsync();
          const newBadge = Math.max(0, currentBadge - 1);
          await Notifications.setBadgeCountAsync(newBadge);
          console.log('[push] 🔔 Badge count decremented:', currentBadge, '→', newBadge);
        } catch (e) {
          console.warn('[push] Failed to decrement badge:', e?.message);
        }
      })();
    });

    return () => {
      console.log('[push] 🔇 Removing notification tap listener');
      subscription.remove();
    };
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
            <Stack.Screen name="RoleSignup" component={RoleSignupScreen} />
            <Stack.Screen name="TeacherSignup" component={ProviderSignupScreen} />
            <Stack.Screen name="ParentSignup" component={ClientSignupScreen} />
            <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
          </>
        ) : !user?.emailVerified ? (
          // 📧 Email verification required screen
          <>
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
          </>
        ) : (
          // Main app screens - now role-based (only after email verified)
          <>
            {/* Universal Role-based Screens */}
            <Stack.Screen 
              name="Dashboard" 
              component={RoleDashboard}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Bookings" component={BookingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Availability" component={AvailabilityScreen} />

            {/* Legacy Provider (Teacher/Coach) specific screens */}
            <Stack.Screen name="TeacherBookings" component={ProviderBookingsScreen} />
            <Stack.Screen name="TeacherAvailability" component={ProviderAvailabilityScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            
            {/* Legacy Client (Parent/Athlete) specific screens */}
            <Stack.Screen name="FavoriteProviders" component={FavoriteProvidersScreen} />
            <Stack.Screen name="ParentBookings" component={ClientBookingsScreen} />
            <Stack.Screen name="ProviderAvailableSlots" component={ProviderAvailableSlotsScreen} />
            <Stack.Screen name="ProviderWeeklyAvailability" component={ProviderWeeklyAvailabilityScreen} />
            <Stack.Screen name="ProviderAvailabilityCalendar" component={ProviderAvailabilityCalendarScreen} />
            <Stack.Screen name="TeacherCalendar" component={TeacherCalendarScreen} />
            
            {/* Shared screens - available to all roles */}
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen name="FindProviders" component={FindProvidersScreen} />
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
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<Loading />} persistor={persistor}>
          <ThemeProvider>
            <StatusBar style="light" backgroundColor={colors.primary} />
            <AppContent />
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

// Separate component that has access to Redux store
const AppContent = () => {
  return <AppNavigator />;
};
