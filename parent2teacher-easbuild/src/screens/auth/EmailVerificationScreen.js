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
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/commonStyles';
import AuthService from '../../services/authService';

/**
 * 📧 Email Verification Screen - Pakollinen sähköpostivahvistus
 * 
 * Näkyy kaikille käyttäjille joiden email ei ole vahvistettu.
 * Estää pääsyn Dashboard:iin kunnes vahvistus on suoritettu.
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

  // 🔄 Auto-check email verification status every 10 seconds (less aggressive)
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      await checkEmailVerification();
    }, 10000); // Changed from 3000 to 10000 (10 seconds)

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
          '🎉 Vahvistus onnistui!',
          'Sähköpostiosoitteesi on vahvistettu. Tervetuloa sovellukseen!',
          [
            {
              text: 'Jatka sovellukseen',
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
        '📧 Vahvistusviesti lähetetty!',
        `Uusi vahvistusviesti on lähetetty osoitteeseen:\n${user?.email}\n\nTarkista myös roskaposti.`,
        [{ text: 'OK' }]
      );
      
      // Aseta 60s cooldown
      setResendCooldown(60);
      
    } catch (error) {
      Alert.alert(
        '❌ Virhe',
        `Vahvistusviestin lähettäminen epäonnistui:\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // 🚪 Kirjaudu ulos
  const handleLogout = () => {
    Alert.alert(
      'Kirjaudu ulos?',
      'Voit kirjautua takaisin sisään milloin tahansa.',
      [
        { text: 'Peruuta', style: 'cancel' },
        { 
          text: 'Kirjaudu ulos', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  // 🧹 Aloita alusta
  const handleStartFresh = () => {
    Alert.alert(
      'Aloita alusta?',
      'Tämä poistaa kaikki tallennetut tiedot ja palauttaa sinut kirjautumisnäkymään.',
      [
        { text: 'Peruuta', style: 'cancel' },
        { 
          text: 'Aloita alusta', 
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
          <Text style={styles.logoutText}>Kirjaudu ulos</Text>
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
        <Text style={styles.title}>Vahvista sähköpostiosoitteesi</Text>

        {/* Description */}
        <Text style={styles.description}>
          Lähetimme vahvistuslinkin osoitteeseen:
        </Text>
        
        <Text style={styles.email}>{user?.email}</Text>

        <Text style={styles.instructions}>
          1. Tarkista sähköpostisi (myös roskaposti)
          {'\n'}2. Klikkaa vahvistuslinkkiä
          {'\n'}3. Palaa tähän sovellukseen
          {'\n'}4. Sinut ohjataan automaattisesti etusivulle
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
                  ? `Lähetä uudelleen (${resendCooldown}s)`
                  : 'Lähetä vahvistusviesti uudelleen'
                }
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <Text style={styles.helpText}>
          💡 Vahvistusviesti voi kestää muutaman minuutin. Tarkista myös roskapostikansio.
        </Text>

        {/* Start Fresh Button */}
        <TouchableOpacity 
          style={styles.startFreshButton}
          onPress={handleStartFresh}
        >
          <Ionicons name="refresh-circle-outline" size={20} color={colors.textLight} />
          <Text style={styles.startFreshText}>
            Aloita alusta uudella käyttäjällä
          </Text>
        </TouchableOpacity>

        {/* Auto-check indicator */}
        {isChecking && (
          <View style={styles.autoCheckContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.autoCheckText}>
              Tarkistetaan vahvistuksen tilaa...
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