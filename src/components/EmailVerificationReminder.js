import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import AuthService from '../services/authService';
import { colors } from '../styles/commonStyles';

/**
 * Email Verification Reminder Component
 * 
 * Pehmeä muistutus sähköpostin vahvistuksesta kaikille vahvistamattomille käyttäjille
 * Näkyy Dashboard:issa kunnes sähköposti on vahvistettu
 */
const EmailVerificationReminder = ({ onResendEmail }) => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    const checkStatus = () => {
      // Tarkista onko Firebase user email verified
      const isEmailVerified = user?.emailVerified;
      
      // Tarkista account status tracking
      const status = AuthService.getAccountStatus(user.uid);
      setAccountStatus(status);
      
      // Näytä reminder jos email ei ole verified JA tili ei ole expired
      const shouldShow = !isEmailVerified && 
                        status.status !== 'expired' && 
                        status.status !== 'verified_or_not_tracked';
      
      setIsVisible(shouldShow);
      
      console.log('📧 Email verification reminder check:', {
        userId: user.uid,
        isEmailVerified,
        accountStatus: status.status,
        shouldShow
      });
    };

    checkStatus();
    
    // Tarkista 5 minuutin välein
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const handleResendEmail = async () => {
    try {
      if (onResendEmail) {
        await onResendEmail();
        Alert.alert(
          '📧 Vahvistussähköposti lähetetty',
          'Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä. Muista tarkistaa myös roskapostikansio!'
        );
      }
    } catch (error) {
      Alert.alert('Virhe', 'Sähköpostin lähetys epäonnistui: ' + error.message);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Piilota 30 minuutiksi
    setTimeout(() => setIsVisible(true), 30 * 60 * 1000);
  };

  if (!isVisible || !accountStatus) return null;

  const daysLeft = accountStatus.timeLeftHours ? Math.ceil(accountStatus.timeLeftHours / 24) : 3;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mail-outline" size={20} color={colors.primary} />
        <View style={styles.headerText}>
          <Text style={styles.title}>📧 Vahvista sähköpostiosoitteesi</Text>
          <Text style={styles.subtitle}>
            {daysLeft > 0 ? `${daysLeft} päivää aikaa` : 'Aika loppumassa pian'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.message}>
        Vahvista sähköpostiosoitteesi varmistaaksesi tilisi turvallisuuden. 
        Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={styles.resendButtonText}>Lähetä uudelleen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 15,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#F0F8FF', // Alice blue - pehmeä sininen
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  subtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 1,
  },
  dismissButton: {
    padding: 4,
  },
  message: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default EmailVerificationReminder;