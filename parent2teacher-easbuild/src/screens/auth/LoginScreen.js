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
  Animated
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
    console.log('🔑 LOGIN BUTTON PRESSED!');
    console.log('🔑 UserType:', userType);
    console.log('🔑 Form data:', { email: formData.email, hasPassword: !!formData.password });
    
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
      console.log('🔑 Calling Redux login function...');
      const result = await login({
        email: formData.email,
        password: formData.password
      });

      console.log('🔑 Login result:', result);

      if (result.success) {
        console.log('🔑 Login successful!');
        // Navigation happens automatically in App.js when user state changes
      } else {
        // Show user-friendly error message (already translated in authSlice)
        const errorMessage = result.error || 'Kirjautuminen epäonnistui';
        Alert.alert('Kirjautuminen epäonnistui', errorMessage);
      }
    } catch (error) {
      console.error('🔑 Login error:', error);
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
      console.log('🔵 Existing Google Sign-In button pressed');
      setGoogleExistingLoading(true);
      // Attempt direct Firebase auth
      const userCredential = await AuthService.signInWithGoogle();
      if (!userCredential || !userCredential.user) {
        throw new Error('Google sign-in failed');
      }
      const { user } = userCredential;
      const uid = user.uid;
      console.log('✅ Google user authenticated:', user.email);
      // Fetch both possible profile docs
      const teacherDocRef = doc(db, 'teachers', uid);
      const parentDocRef = doc(db, 'parents', uid);
      const [teacherSnap, parentSnap] = await Promise.all([
        getDoc(teacherDocRef),
        getDoc(parentDocRef)
      ]);

      const teacherData = teacherSnap.exists() ? teacherSnap.data() : null;
      const parentData = parentSnap.exists() ? parentSnap.data() : null;
      console.log('🔍 Role presence -> teacher:', !!teacherData, 'parent:', !!parentData, 'requested screen userType:', userType);

      const normalizeUser = (firebaseUser, roleValue, firestoreData) => {
        if (!firebaseUser) return null;
        const base = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          role: roleValue || firestoreData?.role || firestoreData?.userType,
          userType: roleValue || firestoreData?.userType || firestoreData?.role,
          timestamp: Date.now(),
        };
        if (!firestoreData) {
          return base;
        }
        // Merge firestore root + nested profile
        const nested = firestoreData.profile || {};
        const doubleNested = nested.profile || {}; // fallback if profile.profile used accidentally
        const mergedProfile = { ...doubleNested, ...nested }; // nested wins over doubleNested
        const flattened = {
          ...firestoreData,
          ...mergedProfile,
        };
        // Preferred phone
        const phone = flattened.phone || flattened.phoneNumber || mergedProfile.phone || mergedProfile.phoneNumber;
        return {
          ...base,
          ...flattened,
          phone,
          subjects: flattened.subjects || mergedProfile.subjects || [],
          educationLevels: flattened.educationLevels || mergedProfile.educationLevels || [],
          location: flattened.location || mergedProfile.location || [],
          teachingMethods: flattened.teachingMethods || mergedProfile.teachingMethods || [],
          languages: flattened.languages || mergedProfile.languages || [],
          teachingStyles: flattened.teachingStyles || mergedProfile.teachingStyles || [],
          availability: flattened.availability || mergedProfile.availability || [],
          hourlyRate: flattened.hourlyRate || mergedProfile.hourlyRate || '',
          experience: flattened.experience || mergedProfile.experience || '',
          description: flattened.description || mergedProfile.description || '',
        };
      };

      const finalizeRoleLogin = async (chosenRole, data) => {
        try {
          const normalizedUser = normalizeUser(user, chosenRole, data);
          console.log('✅ Finalizing login as', chosenRole, 'keys:', Object.keys(normalizedUser));
          dispatch(setUser(normalizedUser));
          await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
          await AsyncStorage.setItem('userRole', normalizedUser.role);
          await AsyncStorage.setItem('userId', uid);
          // Also store a list of available roles for quick switching later
          const roles = [
            teacherData ? 'teacher' : null,
            parentData ? 'parent' : null
          ].filter(Boolean);
          await AsyncStorage.setItem('availableRoles', JSON.stringify(roles));
        } catch (e) {
          console.error('❌ finalizeRoleLogin error:', e);
          Alert.alert('Login Error', 'Failed to finalize login for role ' + chosenRole);
        }
      };

      // Case: both profiles exist -> ask user
      if (teacherData && parentData) {
        Alert.alert(
          'Choose Profile',
          'You have both a teacher and a parent profile. Which one do you want to use now?',
          [
            { text: 'Parent', onPress: () => finalizeRoleLogin('parent', parentData) },
            { text: 'Teacher', onPress: () => finalizeRoleLogin('teacher', teacherData) },
            { text: 'Cancel', style: 'cancel' }
          ],
          { cancelable: true }
        );
        return;
      }

      // Case: only teacher exists
      if (teacherData && !parentData) {
        // If userType specified and wants parent -> offer choice
        if (userType === 'parent') {
          Alert.alert(
            'Teacher Profile Found',
            'You have a teacher profile. Log in as teacher or create a parent profile?',
            [
              { text: 'Create Parent Profile', onPress: async () => {
                  const googleInfo = await AuthService.getGoogleUserInfo();
                  navigation.navigate('ParentSignup', { googleUser: googleInfo });
                }
              },
              { text: 'Log in as Teacher', onPress: () => finalizeRoleLogin('teacher', teacherData) },
              { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: true }
          );
          return;
        } else {
          // No userType specified or userType is teacher -> just login as teacher
          await finalizeRoleLogin('teacher', teacherData);
          return;
        }
      }

      // Case: only parent exists
      if (parentData && !teacherData) {
        // If userType specified and wants teacher -> offer choice
        if (userType === 'teacher') {
          Alert.alert(
            'Parent Profile Found',
            'You have a parent profile. Log in as parent or create a teacher profile?',
            [
              { text: 'Create Teacher Profile', onPress: async () => {
                  const googleInfo = await AuthService.getGoogleUserInfo();
                  navigation.navigate('TeacherSignup', { googleUser: googleInfo });
                }
              },
              { text: 'Log in as Parent', onPress: () => finalizeRoleLogin('parent', parentData) },
              { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: true }
          );
          return;
        } else {
          // No userType specified or userType is parent -> login as parent
          await finalizeRoleLogin('parent', parentData);
          return;
        }
      }

      // No profile found -> offer creation
      console.log('ℹ️ No existing profile found for Google account');
      Alert.alert(
        'Profile not found',
        'No teacher or parent profile exists for this Google account. Create one now?',
        [
          {
            text: 'Create Teacher Profile',
            onPress: async () => {
              const googleInfo = await AuthService.getGoogleUserInfo();
              navigation.navigate('TeacherSignup', { googleUser: googleInfo });
            }
          },
          {
            text: 'Create Parent Profile',
            onPress: async () => {
              const googleInfo = await AuthService.getGoogleUserInfo();
              navigation.navigate('ParentSignup', { googleUser: googleInfo });
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ],
        { cancelable: true }
      );
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
});

export default LoginScreen;