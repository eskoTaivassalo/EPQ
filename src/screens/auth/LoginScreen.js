import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setUser } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { colors, commonStyles } from '../../styles/commonStyles';
import { AuthService } from '../../services/authService';

const LoginScreen = ({ route, navigation }) => {
  const { userType } = route.params;
  const dispatch = useDispatch();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
        console.log('🔑 Login failed:', result.error);
        Alert.alert('Login failed', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('🔑 Login error:', error);
      Alert.alert('Error', 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      console.log('🔵 Google Sign-In button pressed');
      setGoogleLoading(true);
      
      // 1️⃣ HAE GOOGLE-TIEDOT (ei vielä Firebase-autentikointia!)
      console.log('🔵 Fetching Google user info...');
      const googleUserInfo = await AuthService.getGoogleUserInfo();
      
      if (!googleUserInfo) {
        throw new Error('Google-tietojen haku epäonnistui');
      }
      
      console.log('✅ Got Google user info:', googleUserInfo.email);

      // 2️⃣ OHJAA SUORAAN SIGNUP-LOMAKKEELLE (esitäytetty)
      console.log('� Redirecting to signup form...');
      
      if (userType === 'teacher') {
        navigation.navigate('TeacherSignup', {
          googleUser: {
            idToken: googleUserInfo.idToken,  // ⚠️ Tarvitaan myöhemmin Firebase-autentikointiin!
            email: googleUserInfo.email,
            displayName: googleUserInfo.displayName,
            photoURL: googleUserInfo.photoURL,
          }
        });
      } else {
        navigation.navigate('ParentSignup', {
          googleUser: {
            idToken: googleUserInfo.idToken,  // ⚠️ Tarvitaan myöhemmin Firebase-autentikointiin!
            email: googleUserInfo.email,
            displayName: googleUserInfo.displayName,
            photoURL: googleUserInfo.photoURL,
          }
        });
      }

      // ✅ Lomake aukeaa esitäytettynä - käyttäjä täyttää loput tiedot
      
    } catch (error) {
      console.error('❌ Google login error:', error);
      
      // Käyttäjäystävälliset virheilmoitukset
      let errorMessage = 'Google-kirjautuminen epäonnistui';
      
      if (error.code === 'DEVELOPER_ERROR') {
        errorMessage = 'Sovelluksen konfiguraatio-ongelma. Tarkista SHA-sertifikaatit Firebase Consolessa.';
      } else if (error.code === 'API_NOT_CONNECTED') {
        errorMessage = 'Google Sign-In ei ole aktivoitu. Tarkista Firebase Console asetukset.';
      } else if (error.code === 'SIGN_IN_CANCELLED') {
        errorMessage = 'Kirjautuminen peruutettiin';
        console.log('ℹ️ User cancelled Google sign-in');
        return; // Ei näytetä virhettä, käyttäjä peruutti
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Verkkovirhe. Tarkista internetyhteytesi.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Kirjautuminen epäonnistui', errorMessage);
    } finally {
      setGoogleLoading(false);
      console.log('🔵 Google loading state: false');
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

  const getRoleInfo = () => {
    if (userType === 'teacher') {
      return {
        title: 'Teacher - Sign In',
        icon: 'school',
        color: colors.secondary,
        description: 'Sign in to your teacher account'
      };
    } else {
      return {
        title: 'Parent - Sign In',
        icon: 'heart',
        color: '#E91E63',
        description: 'Sign in to your parent account'
      };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
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
            
            <View style={[styles.roleIcon, { backgroundColor: roleInfo.color }]}>
              <Ionicons name={roleInfo.icon} size={30} color={colors.white} />
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
              style={[styles.loginButton, { backgroundColor: roleInfo.color }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Google login */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && { opacity: 0.7 }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            <Ionicons name="logo-google" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.googleButtonText}>
              {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Demo app - use any information to sign in
            </Text>
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
  },
  roleIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  googleButtonText: {
    color: colors.white,
    fontSize: 16,
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