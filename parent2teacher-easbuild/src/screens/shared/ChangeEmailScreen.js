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
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { verifyBeforeUpdateEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../../config/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export default function ChangeEmailScreen({ navigation }) {
  const { user, refreshUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  
  // Check if user is Google-authenticated (no password)
  const isGoogleUser = auth?.currentUser?.providerData?.some(
    provider => provider.providerId === 'google.com'
  );

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    try {
      // Check if Firebase is available
      if (!auth || !auth.currentUser) {
        throw new Error('Firebase Auth not available or user not logged in');
      }
      
      if (!db) {
        throw new Error('Firestore database not available');
      }
      
      if (!user || !user.uid) {
        throw new Error('User data not available in Redux');
      }
      
      // Reload Firebase Auth user to get latest email
      console.log('🔄 Reloading Firebase Auth user...');
      await auth.currentUser.reload();
      const currentAuthEmail = auth.currentUser.email;
      
      console.log('🔍 Checking email verification:');
      console.log('   Current Auth email:', currentAuthEmail);
      console.log('   Current Redux email:', user?.email);
      console.log('   User UID:', user?.uid);
      console.log('   User role:', user?.role);
      console.log('   User type:', user?.type);
      console.log('   User userType:', user?.userType);
      
      // Check if email has changed in Firebase Auth
      if (currentAuthEmail !== user?.email) {
        console.log('✅ Email has been updated in Firebase Auth, updating Firestore...');
        
        // Determine user collection - try multiple possible field names
        let userCollection = 'parents'; // default to parents
        if (user.role === 'teacher' || user.type === 'teacher' || user.userType === 'teacher') {
          userCollection = 'teachers';
        }
        
        console.log(`📝 Updating ${userCollection} collection for user ${user.uid}`);
        
        const userDocRef = doc(db, userCollection, user.uid);
        
        // Check if document exists first
        console.log('📝 Checking if document exists...');
        const docSnap = await getDoc(userDocRef);
        
        if (!docSnap.exists()) {
          throw new Error(`User document not found in ${userCollection} collection. Please contact support.`);
        }
        
        console.log('📝 Document exists, updating...');
        console.log('📝 Current document data:', docSnap.data());
        console.log('📝 Current document email:', docSnap.data().email);
        
        await updateDoc(userDocRef, {
          email: currentAuthEmail,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Updated email in ${userCollection} collection`);
        
        // IMPORTANT: After email change, Firebase invalidates the auth token
        // We need to log out and have user log in again with new email
        console.log('🔄 Email changed - logging out for security...');
        
        Alert.alert(
          'Email Updated Successfully!',
          `Your email has been changed to ${currentAuthEmail}.\n\nFor security reasons, you need to log in again with your new email address.`,
          [
            {
              text: 'OK, Log In Again',
              onPress: async () => {
                try {
                  console.log('Logging out after email change...');
                  await logout();
                  console.log('✅ Logged out successfully');
                } catch (e) {
                  console.error('Logout error:', e);
                }
                // Navigation will automatically go to login screen
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Please check your email inbox and click the verification link first, then try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Check verification error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to check verification status. Please try again or contact support.';
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Unable to update user profile in database.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [
          { text: 'Show Details', onPress: () => console.log('Full error object:', error) },
          { text: 'OK' }
        ]
      );
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleChangeEmail = async () => {
    // Validations
    // Skip password check for Google users
    if (!isGoogleUser && !currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password to verify your identity.');
      return;
    }

    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter your new email address.');
      return;
    }

    if (!validateEmail(newEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (newEmail !== confirmEmail) {
      Alert.alert('Error', 'Email addresses do not match.');
      return;
    }

    if (newEmail.toLowerCase() === user?.email?.toLowerCase()) {
      Alert.alert('Error', 'New email must be different from current email.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Re-authenticate user (only for email/password users)
      if (!isGoogleUser) {
        try {
          const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword
          );
          
          await reauthenticateWithCredential(auth.currentUser, credential);
          console.log('✅ Re-authentication successful');
        } catch (reAuthError) {
          console.error('❌ Re-authentication error:', reAuthError);
          throw reAuthError; // Re-throw to be caught by outer catch
        }
      } else {
        console.log('✅ Google user - skipping password re-authentication');
      }

      // Step 2: Send verification email to new address BEFORE updating
      // User must verify the new email first, then Firebase will update it automatically
      await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
      console.log('✅ Verification email sent to new address');

      setVerificationSent(true);
      setCurrentPassword('');
      setNewEmail('');
      setConfirmEmail('');

      Alert.alert(
        'Verification Email Sent',
        `A verification email has been sent to ${newEmail}.\n\nIMPORTANT STEPS:\n1. Check your email inbox and click the verification link\n2. After clicking the link, LOG OUT from this app\n3. Log back IN with your NEW email address\n4. Your email will be updated automatically!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Change email error:', error);
      
      let errorMessage = 'Failed to send verification email. Please try again.';
      let isRecentLoginError = false;
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use by another account.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/requires-recent-login') {
        isRecentLoginError = true;
        errorMessage = 'For security reasons, you need to log out and log back in before changing your email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email change is currently disabled. Please contact support.';
      }
      
      // Special handling for requires-recent-login error
      if (isRecentLoginError) {
        Alert.alert(
          'Re-authentication Required',
          errorMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Log Out Now',
              onPress: async () => {
                try {
                  await logout();
                } catch (logoutError) {
                  console.error('Logout error:', logoutError);
                }
              },
              style: 'destructive'
            }
          ]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Email</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={styles.infoText}>
              {isGoogleUser 
                ? "You're signed in with Google. You can change your email address without entering a password."
                : "For security reasons, you'll need to verify your identity with your current password before changing your email."}
            </Text>
          </View>

          {/* Current Email */}
          <View style={styles.section}>
            <Text style={styles.label}>Current Email</Text>
            <View style={styles.currentEmailContainer}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} />
              <Text style={styles.currentEmail}>{user?.email}</Text>
              {isGoogleUser && (
                <View style={styles.googleBadge}>
                  <Ionicons name="logo-google" size={16} color={colors.white} />
                </View>
              )}
            </View>
          </View>

          {/* Current Password - Only show for non-Google users */}
          {!isGoogleUser && (
          <View style={styles.section}>
            <Text style={styles.label}>Current Password *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* New Email */}
          <View style={styles.section}>
            <Text style={styles.label}>New Email Address *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter new email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Confirm New Email */}
          <View style={styles.section}>
            <Text style={styles.label}>Confirm New Email *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                placeholder="Confirm new email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Google User Security Notice */}
          {!verificationSent && isGoogleUser && (
            <View style={styles.googleSecurityCard}>
              <Ionicons name="shield-checkmark" size={24} color="#4285F4" />
              <View style={styles.warningTextContainer}>
                <Text style={styles.googleSecurityTitle}>Security Notice</Text>
                <Text style={styles.googleSecurityText}>
                  If you see an error, please log out and log back in with Google first, then try changing your email again.
                </Text>
              </View>
            </View>
          )}

          {/* Warning Card */}
          {!verificationSent && (
            <View style={styles.warningCard}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.warningTitle}>How it works</Text>
                <Text style={styles.warningText}>
                  1. We'll send a verification link to your new email{'\n'}
                  2. Click the link in your email to verify{'\n'}
                  3. Log out from this app{'\n'}
                  4. Log back in with your new email address
                </Text>
              </View>
            </View>
          )}

          {/* Verification Sent Success Card */}
          {verificationSent && (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <View style={styles.warningTextContainer}>
                <Text style={styles.successTitle}>Verification Email Sent!</Text>
                <Text style={styles.successText}>
                  ✉️ Check your email and click the verification link{'\n\n'}
                  🚪 After verification, LOG OUT from the app{'\n\n'}
                  🔑 Log back IN with your new email address{'\n\n'}
                  Your email will be updated automatically when you log in!
                </Text>
              </View>
            </View>
          )}

          {/* Logout Button (shows after email is sent) */}
          {verificationSent && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                Alert.alert(
                  'Log Out',
                  'Make sure you have clicked the verification link in your email first!',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Yes, Log Out',
                      onPress: async () => {
                        try {
                          await logout();
                        } catch (e) {
                          console.error('Logout error:', e);
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Ionicons name="log-out" size={20} color={colors.white} />
              <Text style={styles.updateButtonText}>Log Out</Text>
            </TouchableOpacity>
          )}

          {/* Update Button (shows before email is sent) */}
          {!verificationSent && (
            <TouchableOpacity
              style={[styles.updateButton, loading && styles.updateButtonDisabled]}
              onPress={handleChangeEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="mail" size={20} color={colors.white} />
                  <Text style={styles.updateButtonText}>Send Verification Email</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading || checkingVerification}
          >
            <Text style={styles.cancelButtonText}>
              {verificationSent ? 'Close' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 12,
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  currentEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentEmail: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    flex: 1,
  },
  googleBadge: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
  },
  eyeIcon: {
    padding: 4,
  },
  googleSecurityCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  googleSecurityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1967D2',
    marginBottom: 4,
  },
  googleSecurityText: {
    fontSize: 14,
    color: '#1967D2',
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  successCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  successText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  checkButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  updateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  updateButtonDisabled: {
    backgroundColor: colors.textSecondary,
    elevation: 0,
  },
  updateButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
