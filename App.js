import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';

// Redux
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './src/store';

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

// Screens - Parent
import ParentSignupScreen from './src/screens/parent/ParentSignupScreen';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import ParentProfileScreen from './src/screens/parent/ParentProfileScreen';
import ParentMyProfileScreen from './src/screens/parent/ParentMyProfileScreen';

// Screens - Shared
import FindTeachersScreen from './src/screens/shared/FindTeachersScreen';

// Screens - Dev
import SecurityTestScreen from './src/screens/dev/SecurityTestScreen';

// Components
import CookieConsentBanner from './src/components/CookieConsentBanner';

// Services
import GDPRService from './src/services/gdprService';
import { AuthService } from './src/services/authService';

// Styles
import { colors } from './src/styles/commonStyles';

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
  const { user, loading, isAuthenticated, loadStoredAuth } = useAuth();
  const [emailVerifiedDelay, setEmailVerifiedDelay] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);

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
