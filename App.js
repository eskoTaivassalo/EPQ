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

// Hooks (Redux-based)
import { useAuth } from './src/hooks/useAuth';

// Screens - Auth
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import EmailVerificationScreen from './src/screens/auth/EmailVerificationScreen';

// Screens - Teacher
import TeacherSignupScreen from './src/screens/teacher/TeacherSignupScreen';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import TeacherMyProfileScreen from './src/screens/teacher/TeacherMyProfileScreen';
import TeacherBookingsScreen from './src/screens/teacher/TeacherBookingsScreen';

// Screens - Parent
import ParentSignupScreen from './src/screens/parent/ParentSignupScreen';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import ParentProfileScreen from './src/screens/parent/ParentProfileScreen';
import ParentMyProfileScreen from './src/screens/parent/ParentMyProfileScreen';
import FavoritesScreen from './src/screens/parent/FavoritesScreen';
import ParentBookingsScreen from './src/screens/parent/ParentBookingsScreen';

// Screens - Shared
import FindTeachersScreen from './src/screens/shared/FindTeachersScreen';
import ScheduleLessonScreen from './src/screens/shared/ScheduleLessonScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import CalendarScreen from './src/screens/shared/CalendarScreen';

// Screens - Dev
import SecurityTestScreen from './src/screens/dev/SecurityTestScreen';

// Components
import CookieConsentBanner from './src/components/CookieConsentBanner';
import NotificationBell from './src/components/NotificationBell';

// Services
import GDPRService from './src/services/gdprService';
import { AuthService } from './src/services/authService';

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
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { user, loading, isAuthenticated, loadStoredAuth } = useAuth();
  const [emailVerifiedDelay, setEmailVerifiedDelay] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Initialize global error logger once
  useEffect(() => {
    initGlobalErrorLogger();
  }, []);

  // Load stored auth on app start & Configure Google Sign-In
  useEffect(() => {
    loadStoredAuth();
    
    // Konfiguroi Google Sign-In
    try {
      AuthService.configureGoogleSignIn();
      console.log('✅ Google Sign-In configured in App.js');
    } catch (error) {
      console.error('❌ Failed to configure Google Sign-In:', error);
    }
  }, []);

  // Load notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      dispatch(fetchNotifications(user.uid));
    }
  }, [isAuthenticated, user?.uid, dispatch]);

  // 🧪 TESTAUS: Näytä banner aina kun kirjaudutaan sisään
  useEffect(() => {
    console.log('🔍 DEBUG - isAuthenticated:', isAuthenticated);
    console.log('🔍 DEBUG - user:', user);
    
    if (isAuthenticated && user) {
      console.log('🧪 TESTING MODE: Showing GDPR banner on every login');
      setShowConsentBanner(true);
      console.log('🧪 Banner state set to TRUE');
    }
  }, [isAuthenticated, user]); // ✅ KORJATTU: Poistettu showConsentBanner dependencies-listasta

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

  const handleConsentGiven = async (consents) => {
    console.log('📥 handleConsentGiven RECEIVED in App.js');
    console.log('✅ User consents saved:', consents);
    
    console.log('🔄 Setting showConsentBanner to FALSE');
    setShowConsentBanner(false);
    console.log('✅ showConsentBanner state updated');

    // Jos analytics-suostumus annettu, voi initata analytics
    if (consents.analytics) {
      console.log('📊 Analytics consent given - can initialize analytics');
      // TODO: await initializeAnalytics();
    }

    // Jos marketing-suostumus annettu
    if (consents.marketing) {
      console.log('📢 Marketing consent given');
      // TODO: await initializeMarketing();
    }

    // Jos personalization-suostumus annettu
    if (consents.personalization) {
      console.log('🎨 Personalization consent given');
      // TODO: Enable personalized content
    }
  };

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
                  options={{
                    headerShown: true,
                    headerRight: () => <NotificationBell />,
                    headerStyle: { backgroundColor: colors.secondary },
                    headerTintColor: colors.white,
                    title: 'Dashboard'
                  }}
                />
                <Stack.Screen name="TeacherMyProfile" component={TeacherMyProfileScreen} />
                <Stack.Screen name="TeacherBookings" component={TeacherBookingsScreen} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="ScheduleLesson" component={ScheduleLessonScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
              </>
            ) : (
              <>
                <Stack.Screen 
                  name="ParentDashboard" 
                  component={ParentDashboard}
                  options={{
                    headerShown: true,
                    headerRight: () => <NotificationBell />,
                    headerStyle: { backgroundColor: colors.secondary },
                    headerTintColor: colors.white,
                    title: 'Dashboard'
                  }}
                />
                <Stack.Screen name="ParentMyProfile" component={ParentMyProfileScreen} />
                <Stack.Screen name="ParentProfile" component={ParentProfileScreen} />
                <Stack.Screen name="ParentFavorites" component={FavoritesScreen} />
                <Stack.Screen name="FindTeachers" component={FindTeachersScreen} />
                <Stack.Screen name="ScheduleLesson" component={ScheduleLessonScreen} />
                <Stack.Screen name="ParentBookings" component={ParentBookingsScreen} />
                <Stack.Screen name="Calendar" component={CalendarScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="SecurityTest" component={SecurityTestScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
      {console.log('🎨 RENDER - showConsentBanner:', showConsentBanner)}
      {showConsentBanner && (
        <CookieConsentBanner 
          onConsentGiven={handleConsentGiven}
          forceShow={true}  // 🧪 TESTAUS: Pakota banner näkyviin
        />
      )}
      {showConsentBanner && console.log('🎨 CookieConsentBanner should be visible!')}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

// Separate component that has access to Redux store
const AppContent = () => {
  return <AppNavigator />;
};
