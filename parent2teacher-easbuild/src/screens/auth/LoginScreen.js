import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { colors, commonStyles } from '../../styles/commonStyles';
import { AuthService } from '../../services/authService';
import AppLogo from '../../components/AppLogo';
import WatercolorBackground from '../../components/WatercolorBackground';
import { ROLE_CONFIG, ROLE_TYPES } from '../../config/roleConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

const LoginScreen = ({ route, navigation }) => {
  const { userType } = route.params || {};
  const dispatch = useDispatch();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleExistingLoading, setGoogleExistingLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!formData.email.trim() || !formData.password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      if (result.success) {
        // Navigation happens automatically in App.js when user state changes
      } else {
        // Show user-friendly error message (already translated in authSlice)
        const errorMessage = result.error || 'Kirjautuminen epäonnistui';
        Alert.alert('Kirjautuminen epäonnistui', errorMessage);
      }
    } catch (error) {
      // Generic fallback for unexpected errors
      Alert.alert('Virhe', 'Kirjautuminen epäonnistui. Yritä uudelleen.');
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      Alert.alert(
        'Email Required', 
        'Please enter your email address to reset your password.'
      );
      return;
    }

    if (!formData.email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset email to ${formData.email}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: async () => {
            setResetLoading(true);
            try {
              await AuthService.sendPasswordReset(formData.email);
              Alert.alert(
                'Email Sent',
                `Password reset instructions have been sent to ${formData.email}. Please check your inbox.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Password reset error:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to send password reset email. Please try again.'
              );
            } finally {
              setResetLoading(false);
            }
          }
        }
      ]
    );
  };

  // ✅ Existing account Google sign-in (no signup redirection)
  const handleGoogleExistingLogin = async () => {
    try {
      setGoogleExistingLoading(true);
      // Attempt direct Firebase auth
      const userCredential = await AuthService.signInWithGoogle();
      if (!userCredential || !userCredential.user) {
        throw new Error('Google sign-in failed');
      }
      const { user } = userCredential;
      const uid = user.uid;
      
      // Fetch user profile from new hierarchical structure
      const mainProfileRef = doc(db, 'users', uid);
      const mainProfileSnap = await getDoc(mainProfileRef);

      if (!mainProfileSnap.exists()) {
        // User doesn't have a profile yet - show role selection
        setGoogleExistingLoading(false);
        
        const googleUserData = {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified
        };
        
        // Create buttons for each role
        const roleButtons = Object.values(ROLE_CONFIG).map(roleConfig => ({
          text: `${roleConfig.name}`,
          onPress: () => {
            navigation.navigate('UniversalSignup', {
              role: roleConfig.id,
              googleUser: googleUserData
            });
          }
        }));
        
        // Add cancel button
        roleButtons.push({
          text: 'Cancel',
          style: 'cancel'
        });
        
        Alert.alert(
          '👋 Welcome!',
          'What type of account do you want to create?',
          roleButtons,
          { cancelable: true }
        );
        return;
      }

      const mainData = mainProfileSnap.data();
      
      // Check if user has multiple roles
      const roles = mainData.roles || [mainData.primaryRole];
      if (roles.length > 1) {
        // User has multiple roles - show role selection screen
        setGoogleExistingLoading(false);
        navigation.navigate('RoleSelection', {
          userId: uid,
          availableRoles: roles,
          mainProfile: mainData,
          // Only pass serializable user data
          firebaseUserData: {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            emailVerified: user.emailVerified,
          },
        });
        return;
      }
      
      // Fetch role-specific data
      let roleData = null;
      if (mainData.primaryRole) {
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(mainData.primaryRole);
        const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, uid);
        const roleProfileSnap = await getDoc(roleProfileRef);
        
        if (roleProfileSnap.exists()) {
          roleData = roleProfileSnap.data();
        }
      }

      const normalizeUser = (firebaseUser, mainProfile, roleProfile) => {
        if (!firebaseUser) return null;
        const base = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          role: mainProfile?.primaryRole || 'parent',
          userType: mainProfile?.primaryRole || 'parent',
          timestamp: Date.now(),
        };
        
        if (!mainProfile) {
          return base;
        }
        
        // Merge main profile + role profile
        const merged = {
          ...mainProfile,
          ...(roleProfile || {}),
        };
        
        // Preferred phone
        const phone = merged.phone || merged.phoneNumber;
        return {
          ...base,
          ...merged,
          phone,
          subjects: merged.subjects || [],
          educationLevels: merged.educationLevels || [],
          location: merged.location || [],
          teachingMethods: merged.teachingMethods || [],
          languages: merged.languages || [],
          teachingStyles: merged.teachingStyles || [],
          availability: merged.availability || [],
          hourlyRate: merged.hourlyRate || '',
          experience: merged.experience || '',
          description: merged.description || '',
        };
      };

      const finalizeRoleLogin = async (normalizedUser) => {
        try {
          console.log('🔐 Finalizing Google login with user:', {
            uid: normalizedUser.uid,
            role: normalizedUser.role,
            email: normalizedUser.email
          });
          
          dispatch(setUser(normalizedUser));
          await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
          await AsyncStorage.setItem('userRole', normalizedUser.role);
          await AsyncStorage.setItem('userId', uid);
          // Store available roles
          const roles = mainData.roles || [mainData.primaryRole];
          await AsyncStorage.setItem('availableRoles', JSON.stringify(roles));
          
          console.log('✅ Google login finalized successfully');
        } catch (e) {
          console.error('❌ finalizeRoleLogin error:', e);
          Alert.alert('Login Error', 'Failed to finalize login');
        }
      };

      // If user has multiple roles, could add role selection logic here
      // For now, just use the primary role
      const normalizedUser = normalizeUser(user, mainData, roleData);
      await finalizeRoleLogin(normalizedUser);
      
      // Success - loading will be cleared in finally block
      // Navigation happens automatically via App.js when Redux state updates

    } catch (error) {
      console.error('❌ Existing Google sign-in error:', error);
      if (error.message?.toLowerCase().includes('peruutettiin') || error.message?.toLowerCase().includes('cancel')) {
        return; // silent cancel
      }
      Alert.alert('Google Sign-In Failed', error.message || 'Unexpected error');
    } finally {
      setGoogleExistingLoading(false);
    }
  };

  const getRoleInfo = () => {
    if (userType === 'teacher') {
      return {
        title: 'Teacher - Sign In',
        icon: 'school',
        color: colors.secondary,
        description: 'Sign in to your teacher account'
      };
    } else if (userType === 'parent') {
      return {
        title: 'Parent - Sign In',
        icon: 'heart',
        color: '#E91E63',
        description: 'Sign in to your parent account'
      };
    } else {
      // No userType specified -> generic sign in
      return {
        title: 'Sign In',
        icon: 'log-in',
        color: colors.primary,
        description: 'Sign in to your account'
      };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      
      <Animated.View style={{ flex: 1, opacity: fadeAnim, backgroundColor: 'transparent' }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          style={{ backgroundColor: 'transparent' }}
        >
          <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            
            {/* App Logo */}
            <View style={styles.logoWrapper}>
              <AppLogo size={145} />
            </View>
            
            <Text style={styles.title}>{roleInfo.title}</Text>
            <Text style={styles.subtitle}>{roleInfo.description}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textLight} style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => setFormData({...formData, password: text})}
                secureTextEntry={!showPassword}
                autoComplete="password"
                style={{
                  flex: 1,
                  paddingVertical: 15,
                  paddingHorizontal: 0,
                  fontSize: 16,
                  color: colors.text,
                  fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
                }}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={{ padding: 10 }}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              <Text style={styles.forgotPasswordText}>
                {resetLoading ? 'Sending...' : 'Forgot Password?'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[roleInfo.color, roleInfo.color + 'CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Existing account Google Sign-In */}
            <TouchableOpacity
              onPress={handleGoogleExistingLogin}
              disabled={googleExistingLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4285F4', '#34A853']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.googleExistingButton, googleExistingLoading && { opacity: 0.7 }]}
              >
                <Ionicons name="logo-google" size={18} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.googleExistingButtonText}>
                {googleExistingLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>


          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Demo app - use any information to sign in
            </Text>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
      
      {/* Full Screen Loading Overlay */}
      {(loading || googleExistingLoading) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <AppLogo size={100} />
            <ActivityIndicator 
              size="large" 
              color={colors.primary} 
              style={{ marginTop: 24 }}
            />
            <Text style={styles.loadingText}>
              {loading ? 'Signing in...' : 'Connecting with Google...'}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FD',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: 'transparent',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    zIndex: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.text,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: colors.text,
  },
  passwordLength: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 8,
    paddingRight: 10,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleExistingButton: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  googleExistingButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default LoginScreen;