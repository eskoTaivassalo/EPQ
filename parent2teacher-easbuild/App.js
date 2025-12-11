import React, { useEffect, lazy, Suspense } from 'react';
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

// Screens - Auth (Eager - tarvitaan heti)
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';

// Screens - Shared (Eager - kriittiset näkymät)
import RoleDashboard from './src/screens/shared/RoleDashboard';
import BookingsScreen from './src/screens/shared/BookingsScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import ProviderAvailabilityScreen from './src/screens/provider/ProviderAvailabilityScreen';
import ManageSlotsScreen from './src/screens/provider/ManageSlotsScreen';
import ClientsScreen from './src/screens/shared/ClientsScreen';

// LAZY LOADED SCREENS - Ladataan vain tarvittaessa
// Auth
const RoleSignupScreen = lazy(() => import('./src/screens/auth/RoleSignupScreen'));
const UniversalSignupScreen = lazy(() => import('./src/screens/auth/UniversalSignupScreen'));

// Legacy signup screens (deprecated - use UniversalSignupScreen)
const ProviderSignupScreen = lazy(() => import('./src/screens/provider/ProviderSignupScreen'));
const ClientSignupScreen = lazy(() => import('./src/screens/client/ClientSignupScreen'));
const FavoriteProvidersScreen = lazy(() => import('./src/screens/shared/FavoriteProvidersScreen'));
const ProviderAvailableSlotsScreen = lazy(() => import('./src/screens/shared/ProviderAvailableSlotsScreen'));
const ProviderWeeklyAvailabilityScreen = lazy(() => import('./src/screens/shared/ProviderWeeklyAvailabilityScreen'));
const ProviderAvailabilityCalendarScreen = lazy(() => import('./src/screens/shared/ProviderAvailabilityCalendarScreen'));

// Shared screens (lazy - ei tarvita heti)
const FindProvidersScreen = lazy(() => import('./src/screens/shared/FindProvidersScreen'));
const NotificationsScreen = lazy(() => import('./src/screens/shared/NotificationsScreen'));
const CalendarScreen = lazy(() => import('./src/screens/shared/CalendarScreen'));
const ConversationsScreen = lazy(() => import('./src/screens/shared/ConversationsScreen'));
const ConversationThreadScreen = lazy(() => import('./src/screens/shared/ConversationThreadScreen'));

// Settings screens (lazy - harvoin käytetty)
const SettingsScreen = lazy(() => import('./src/screens/shared/SettingsScreen'));
const LegalDocumentScreen = lazy(() => import('./src/screens/shared/LegalDocumentScreen'));
const ChangeEmailScreen = lazy(() => import('./src/screens/shared/ChangeEmailScreen'));
const ChangePasswordScreen = lazy(() => import('./src/screens/shared/ChangePasswordScreen'));
const HelpCenterScreen = lazy(() => import('./src/screens/shared/HelpCenterScreen'));
const ContactUsScreen = lazy(() => import('./src/screens/shared/ContactUsScreen'));

// Admin screens (lazy - vain adminit)
const AdminDashboard = lazy(() => import('./src/screens/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./src/screens/admin/UserManagement'));
const AdminStatistics = lazy(() => import('./src/screens/admin/AdminStatistics'));
const AdminBookings = lazy(() => import('./src/screens/admin/AdminBookings'));
const AdminReports = lazy(() => import('./src/screens/admin/AdminReports'));

// Dev screens (lazy - vain kehitys)
const SecurityTestScreen = lazy(() => import('./src/screens/dev/SecurityTestScreen'));

// Components (eager - kriittiset)
import FullScreenSplash from './src/components/FullScreenSplash';
import { LoadingProvider, useGlobalLoading } from './src/components/GlobalLoadingOverlay';
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

// Navigation wrapper joka kuuntelee route-muutoksia
const NavigationWrapper = ({ children }) => {
  const navigationRef = React.useRef();
  const routeNameRef = React.useRef();
  const stackSizeRef = React.useRef(0);

  const navTheme = {
    dark: false,
    colors: {
      primary: '#2196F3',
      background: '#FFFFFF',
      card: '#FFFFFF',
      text: '#000000',
      border: '#E0E0E0',
      notification: '#FF5252',
    },
  };

  return (
    <NavigationContainer 
      theme={navTheme}
      ref={navigationRef}
      onReady={() => {
        const state = navigationRef.current?.getState();
        routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
        stackSizeRef.current = state?.routes?.length || 0;
      }}
      onStateChange={async () => {
        const state = navigationRef.current?.getState();
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
        const currentStackSize = state?.routes?.length || 0;

        routeNameRef.current = currentRouteName;
        stackSizeRef.current = currentStackSize;
      }}
    >
      {children}
    </NavigationContainer>
  );
};

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated, loadStoredAuth } = useAuth();
  const [emailVerifiedDelay, setEmailVerifiedDelay] = useState(false);
  const [cachedEmailVerified, setCachedEmailVerified] = useState(null);

  // Initialize global error logger once
  useEffect(() => {
    initGlobalErrorLogger();
  }, []);

  // Load stored auth on app start & Configure Google Sign-In & Request notification permissions
  useEffect(() => {
    // Load cached emailVerified status immediately from AsyncStorage
    (async () => {
      try {
        const cachedUser = await require('@react-native-async-storage/async-storage').default.getItem('user');
        if (cachedUser) {
          const userData = JSON.parse(cachedUser);
          setCachedEmailVerified(userData.emailVerified);
        }
      } catch (e) {
        // Failed to load cached emailVerified
      }
    })();
    
    loadStoredAuth();
    
    // Listen to Firebase Auth state changes (handles token refresh automatically)
    const { auth } = require('./src/config/firebaseConfig');
    const { onAuthStateChanged } = require('firebase/auth');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase automatically refreshes the token
        try {
          const token = await firebaseUser.getIdToken(true); // Force refresh
          
          // Update Redux state with fresh email verification status
          if (firebaseUser.emailVerified && user && !user.emailVerified) {
            await loadStoredAuth(); // Reload user data from Firebase
          }
        } catch (error) {
          // Token refresh failed
        }
      }
    });
    
    // Konfiguroi Google Sign-In
    try {
      AuthService.configureGoogleSignIn();
    } catch (error) {
      // Failed to configure Google Sign-In
    }

    // Request notification permissions
    NotificationService.requestNotificationPermissions();

    // Request location permissions on app start (foreground)
    (async () => {
      try {
        const { granted, status } = await requestLocationPermissions();
      } catch (e) {
        // Failed to request location permission on startup
      }
    })();

    // Cleanup listener on unmount
    return () => unsubscribe();
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
          const token = await registerAndSaveExpoPushToken(user.uid, user.role || user.userType);
        }
      } catch (e) {
        // Token registration failed
      }
    })();
  }, [isAuthenticated, user?.uid, user?.emailVerified]);

  // Viivästetään email verification -näkymän näyttöä päivityksen jälkeen
  useEffect(() => {
    if (isAuthenticated && user && user.emailVerified === false && cachedEmailVerified !== true) {
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
        
        // Dismiss all delivered notifications from notification center
        await Notifications.dismissAllNotificationsAsync();
      } catch (e) {
        // Failed to clear badge/notifications
      }
    };

    // Clear immediately on mount
    clearBadgeAndNotifications();

    // Listen to app state changes and clear when app becomes active
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        clearBadgeAndNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Setup notification tap handler - open meeting link when notification is tapped
  useEffect(() => {
    const subscription = NotificationService.addNotificationResponseListener((data) => {
      const { meetingUrl, bookingId, type, exceptionDate, reason } = data;
      
      if (type === 'booking_reminder' && meetingUrl) {
        Linking.openURL(meetingUrl);
      } else if (type === 'booking_exception') {
        const dateStr = exceptionDate ? new Date(exceptionDate).toLocaleDateString() : 'Unknown date';
        Alert.alert(
          'Student Cannot Attend',
          `Date: ${dateStr}\n\nReason: ${reason || 'No reason provided'}`,
          [{ text: 'OK' }]
        );
      }
      
      // Decrement badge count by 1 after handling notification
      (async () => {
        try {
          const Notifications = await import('expo-notifications');
          const currentBadge = await Notifications.getBadgeCountAsync();
          const newBadge = Math.max(0, currentBadge - 1);
          await Notifications.setBadgeCountAsync(newBadge);
        } catch (e) {
          // Failed to decrement badge
        }
      })();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Show loading only for initial auth loading
  if (loading) {
    return <Loading />;
  }

  // Determine if email verification is needed
  // IMPORTANT: Only show email verification if EXPLICITLY false
  // Default to verified (true) if undefined to prevent blocking on app refresh
  const emailVerifiedStatus = user?.emailVerified ?? cachedEmailVerified ?? true;
  const needsEmailVerification = isAuthenticated && emailVerifiedStatus === false;

  return (
    <NavigationWrapper>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#FFFFFF' },
          presentation: 'card',
          animationEnabled: true,
          gestureEnabled: true,
          // Smooth fade transition ilman flashausta
          transitionSpec: {
            open: {
              animation: 'timing',
              config: {
                duration: 250,
                useNativeDriver: true,
              },
            },
            close: {
              animation: 'timing',
              config: {
                duration: 200,
                useNativeDriver: true,
              },
            },
          },
          cardStyleInterpolator: ({ current, next }) => {
            return {
              cardStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
              overlayStyle: {
                opacity: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.5],
                  extrapolate: 'clamp',
                }),
              },
            };
          },
        }}
      >
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSignup" component={RoleSignupScreen} />
            {/* Universal signup - works for all roles */}
            <Stack.Screen name="UniversalSignup" component={UniversalSignupScreen} />
            {/* Legacy signup screens - redirect to UniversalSignup */}
            <Stack.Screen name="TeacherSignup" component={ProviderSignupScreen} />
            <Stack.Screen name="ParentSignup" component={ClientSignupScreen} />
            <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
          </>
        ) : needsEmailVerification ? (
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
            {/* Use ProviderAvailabilityScreen for creating actual Firestore slots that can be booked */}
            <Stack.Screen name="Availability" component={ProviderAvailabilityScreen} />

            {/* Legacy Provider (Teacher/Coach) specific screens */}
            <Stack.Screen name="TeacherAvailability" component={ProviderAvailabilityScreen} />
            <Stack.Screen name="ManageSlots" component={ManageSlotsScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            
            {/* Legacy Client (Parent/Athlete) specific screens */}
            <Stack.Screen name="FavoriteProviders" component={FavoriteProvidersScreen} />
            <Stack.Screen name="ProviderAvailableSlots" component={ProviderAvailableSlotsScreen} />
            <Stack.Screen name="ProviderWeeklyAvailability" component={ProviderWeeklyAvailabilityScreen} />
            <Stack.Screen name="ProviderAvailabilityCalendar" component={ProviderAvailabilityCalendarScreen} />
            
            {/* Shared screens - available to all roles */}
            <Stack.Screen name="Calendar" component={CalendarScreen} />
            <Stack.Screen 
              name="FullScreenSplash" 
              component={FullScreenSplash}
              options={{
                headerShown: false,
                animationEnabled: false,
                cardStyle: { backgroundColor: '#F5F5F5' }
              }}
            />
            <Stack.Screen 
              name="FindProviders" 
              component={FindProvidersScreen}
            />
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
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
            <Stack.Screen name="ContactUs" component={ContactUsScreen} />
            
            {/* Admin Screens */}
            <Stack.Screen 
              name="AdminDashboard" 
              component={AdminDashboard}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="UserManagement" 
              component={UserManagement}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AdminStatistics" 
              component={AdminStatistics}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AdminBookings" 
              component={AdminBookings}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="AdminReports" 
              component={AdminReports}
              options={{ headerShown: false }}
            />
            
            <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationWrapper>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<Loading />} persistor={persistor}>
          <ThemeProvider>
            <LoadingProvider>
              <StatusBar style="light" backgroundColor={colors.primary} />
              <AppContent />
            </LoadingProvider>
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
