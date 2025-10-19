import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/authService';
import { colors } from '../styles/commonStyles';

/**
 * Account Expiration Warning Component
 * 
 * Näyttää varoituksen käyttäjille joiden tili vanhenee pian
 * jos sähköpostia ei ole vahvistettu
 */
const AccountExpirationWarning = ({ userId, onResendEmail }) => {
  const [accountStatus, setAccountStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkAccountStatus = () => {
      const status = AuthService.getAccountStatus(userId);
      setAccountStatus(status);
      
      // Näytä varoitus jos tili vanhenee 24 tunnin sisään
      const shouldShow = status.status === 'pending_verification' && 
                        status.timeLeftHours <= 24 && 
                        status.timeLeftHours > 0;
      
      setIsVisible(shouldShow);
      
      console.log('📊 Account status check:', {
        userId,
        status: status.status,
        timeLeftHours: status.timeLeftHours,
        shouldShow
      });
    };

    // Tarkista heti
    checkAccountStatus();
    
    // Tarkista 10 minuutin välein
    const interval = setInterval(checkAccountStatus, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId]);

  const handleResendEmail = async () => {
    try {
      if (onResendEmail) {
        await onResendEmail();
        Alert.alert(
          'Vahvistussähköposti lähetetty',
          'Tarkista sähköpostisi ja seuraa linkkiä vahvistaaksesi tilisi.'
        );
      }
    } catch (error) {
      Alert.alert('Virhe', 'Sähköpostin lähetys epäonnistui: ' + error.message);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible || !accountStatus) return null;

  const getWarningLevel = (hoursLeft) => {
    if (hoursLeft <= 6) return 'critical';
    if (hoursLeft <= 12) return 'urgent';
    return 'warning';
  };

  const warningLevel = getWarningLevel(accountStatus.timeLeftHours);
  const warningStyles = {
    critical: { backgroundColor: '#FFEBEE', borderColor: '#F44336' },
    urgent: { backgroundColor: '#FFF3E0', borderColor: '#FF9800' },
    warning: { backgroundColor: '#E8F5E8', borderColor: '#4CAF50' }
  };

  const iconColor = {
    critical: '#F44336',
    urgent: '#FF9800', 
    warning: '#4CAF50'
  }[warningLevel];

  return (
    <View style={[styles.container, warningStyles[warningLevel]]}>
      <View style={styles.header}>
        <Ionicons name="warning" size={24} color={iconColor} />
        <View style={styles.headerText}>
          <Text style={styles.title}>⏰ Tili vanhenee pian</Text>
          <Text style={styles.subtitle}>
            {accountStatus.timeLeftHours} tuntia jäljellä
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <Ionicons name="close" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.message}>
        Tilisi poistetaan automaattisesti jos et vahvista sähköpostiosoitettasi. 
        Tarkista sähköpostisi ja seuraa vahvistuslinkkiä.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail}>
          <Ionicons name="mail" size={16} color="#fff" />
          <Text style={styles.resendButtonText}>Lähetä uudelleen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dismissButton: {
    padding: 5,
  },
  message: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default AccountExpirationWarning;