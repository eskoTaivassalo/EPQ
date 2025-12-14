import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/commonStyles';
import AuthService from '../../services/authService';

/**
 * 📧 Email Verification Screen - Required email verification
 * 
 * Shown to all users whose email is not verified.
 * Blocks access to Dashboard until verification is completed.
 */
const EmailVerificationScreen = ({ navigation }) => {
  const { user, refreshUser, logout, clearAllAuthData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // ⏰ Resend cooldown timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(time => time - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 🔄 Auto-check email verification status every 30 seconds (avoid rate limiting)
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      await checkEmailVerification();
    }, 30000); // 30 seconds to avoid too many requests

    return () => clearInterval(checkInterval);
  }, []);

  // ✅ Tarkista onko email vahvistettu
  const checkEmailVerification = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      await refreshUser(); // Päivitä user state Firebase:sta
      
      if (user?.emailVerified) {
        // 🎉 Email vahvistettu! Merkitse verified ja näytä onnistumisviesti
        AuthService.markAccountVerified(user.uid);
        
        Alert.alert(
          '🎉 Verification Successful!',
          'Your email has been verified. Welcome to the app!',
          [
            {
              text: 'Continue to App',
              onPress: () => {
                // Navigation tapahtuu automaattisesti kun user.emailVerified = true
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking email verification:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // 📧 Lähetä vahvistusviesti uudelleen
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || loading) return;

    setLoading(true);
    try {
      await AuthService.sendEmailVerification();
      
      Alert.alert(
        '📧 Verification Email Sent!',
        `A new verification email has been sent to:\n${user?.email}\n\nAlso check your spam folder.`,
        [{ text: 'OK' }]
      );
      
      // Aseta 60s cooldown
      setResendCooldown(60);
      
    } catch (error) {
      // Käsittele too-many-requests erikseen
      if (error.message && error.message.includes('too-many-requests')) {
        Alert.alert(
          '⏳ Please Wait',
          'You have sent too many verification emails. Please wait a few minutes and try again.\n\nAlso check your spam folder - the message has likely already been sent.',
          [{ text: 'OK' }]
        );
        setResendCooldown(120); // 2 min cooldown jos liikaa pyyntöjä
      } else {
        Alert.alert(
          '❌ Error',
          `Failed to send verification email:\n${error.message}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Kirjaudu ulos
  const handleLogout = () => {
    Alert.alert(
      'Log Out?',
      'You can log back in at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  // 🧹 Aloita alusta
  const handleStartFresh = () => {
    Alert.alert(
      'Start Fresh?',
      'This will remove all saved data and return you to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Fresh', 
          style: 'destructive',
          onPress: async () => {
            await clearAllAuthData();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="mail-outline" size={80} color={colors.primary} />
          {isChecking && (
            <View style={styles.checkingIndicator}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>Verify Your Email</Text>

        {/* Description */}
        <Text style={styles.description}>
          We sent a verification link to:
        </Text>
        
        <Text style={styles.email}>{user?.email}</Text>

        <Text style={styles.instructions}>
          1. Check your email (including spam folder)
          {'\n'}2. Click the verification link
          {'\n'}3. Return to this app
          {'\n'}4. You will be automatically directed to the home page
        </Text>

        {/* Resend Button */}
        <TouchableOpacity 
          style={[
            styles.resendButton, 
            (loading || resendCooldown > 0) && styles.disabledButton
          ]}
          onPress={handleResendEmail}
          disabled={loading || resendCooldown > 0}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color={colors.white} />
              <Text style={styles.resendButtonText}>
                {resendCooldown > 0 
                  ? `Resend (${resendCooldown}s)`
                  : 'Resend Verification Email'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <Text style={styles.helpText}>
          💡 The verification email may take a few minutes. Also check your spam folder.
        </Text>

        {/* Start Fresh Button */}
        <TouchableOpacity 
          style={styles.startFreshButton}
          onPress={handleStartFresh}
        >
          <Ionicons name="refresh-circle-outline" size={20} color={colors.textLight} />
          <Text style={styles.startFreshText}>
            Start fresh with a new account
          </Text>
        </TouchableOpacity>

        {/* Auto-check indicator */}
        {isChecking && (
          <View style={styles.autoCheckContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.autoCheckText}>
              Checking verification status...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: colors.white,
    marginLeft: 8,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  checkingIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 30,
    backgroundColor: colors.lightBackground,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  instructions: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 40,
    backgroundColor: colors.lightBackground,
    padding: 20,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  resendButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 30,
    minWidth: 250,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resendButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  startFreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.textLight,
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  startFreshText: {
    fontSize: 14,
    color: colors.textLight,
    marginLeft: 8,
    fontWeight: '500',
  },
  autoCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightBackground,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  autoCheckText: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default EmailVerificationScreen;