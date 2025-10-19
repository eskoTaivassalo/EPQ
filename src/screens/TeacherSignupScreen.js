import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/commonStyles';
import AuthService from '../services/authService';
import SecurityService from '../services/securityService';

const TeacherSignupScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    specialization: '',
    qualifications: '',
    experience: '',
    acceptTerms: false,
    acceptMarketing: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, message: '' });

  const specializations = [
    'Child Development Expert',
    'Behavioral Analyst and Specialist',
    'Speech-Language Pathologist',
    'Counselor and Therapist',
    'Pediatric Healthcare Professional',
    'Social Worker',
    'Psychologist',
    'Educator and Tutor',
    'Autism Spectrum Disorder Specialist',
    'Family and Child Psychology',
    'Disabilities and Inclusive Learning',
    'Brain Development and Neuroscience',
    'Other - Please specify'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 💪 REAALIAIKAINEN SALASANAN VAHVUUDEN MITTAUS
    if (field === 'password') {
      if (value.trim() === '') {
        setPasswordStrength(0);
        setPasswordValidation({ isValid: false, message: '' });
      } else {
        const strength = AuthService.getPasswordStrength(value);
        const validation = AuthService.validatePassword(value);
        
        setPasswordStrength(strength);
        setPasswordValidation(validation);
      }
    }
  };

  // Salasanan vahvuuden värit ja tekstit
  const getPasswordStrengthInfo = () => {
    if (passwordStrength === 0) {
      return { color: '#ddd', text: '', width: '0%' };
    } else if (passwordStrength < 30) {
      return { color: '#ff4444', text: 'Heikko', width: '25%' };
    } else if (passwordStrength < 60) {
      return { color: '#ff8800', text: 'Keskinkertainen', width: '50%' };
    } else if (passwordStrength < 80) {
      return { color: '#44aa44', text: 'Hyvä', width: '75%' };
    } else {
      return { color: '#00aa00', text: 'Erinomainen', width: '100%' };
    }
  };

  const validateForm = () => {
    // 🔐 ENHANCED CLIENT-SIDE VALIDATION
    
    // Validoi nimi
    if (!formData.fullName.trim()) {
      Alert.alert('Virhe', 'Anna nimesi');
      return false;
    }
    
    const nameValidation = SecurityService.validateUsername(formData.fullName.trim());
    if (!nameValidation.isValid) {
      Alert.alert('Virhe', `Nimi: ${nameValidation.message}`);
      return false;
    }

    // Validoi sähköposti
    if (!formData.email.trim()) {
      Alert.alert('Virhe', 'Anna sähköpostiosoitteesi');
      return false;
    }
    
    if (!AuthService.validateEmail(formData.email.trim())) {
      Alert.alert('Virhe', 'Virheellinen sähköpostiosoite');
      return false;
    }

    // Validoi salasana
    if (!formData.password.trim()) {
      Alert.alert('Virhe', 'Anna salasana');
      return false;
    }
    
    const passwordValidation = AuthService.validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      Alert.alert('Heikko salasana', passwordValidation.message);
      return false;
    }

    // Tarkista salasanan vahvuus
    const passwordStrength = AuthService.getPasswordStrength(formData.password);
    if (passwordStrength < 60) {
      Alert.alert(
        'Heikko salasana', 
        `Salasanasi vahvuus on ${passwordStrength}/100. Käytä vahvempaa salasanaa turvallisuuden vuoksi.`
      );
      return false;
    }

    // Tarkista salasanojen vastaavuus
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Virhe', 'Salasanat eivät täsmää');
      return false;
    }

    // Validoi specialization
    if (!formData.specialization) {
      Alert.alert('Virhe', 'Valitse asiantuntijuusalueesi');
      return false;
    }

    // Validoi puhelinnumero jos annettu
    if (formData.phoneNumber.trim()) {
      const phoneValidation = SecurityService.validatePhoneNumber(formData.phoneNumber.trim());
      if (!phoneValidation.isValid) {
        Alert.alert('Virhe', `Puhelinnumero: ${phoneValidation.message}`);
        return false;
      }
    }

    // Validoi kuvaukset
    if (formData.qualifications.trim()) {
      const qualValidation = SecurityService.validateDescription(formData.qualifications.trim());
      if (!qualValidation.isValid) {
        Alert.alert('Virhe', `Koulutus: ${qualValidation.message}`);
        return false;
      }
    }

    if (formData.experience.trim()) {
      const expValidation = SecurityService.validateDescription(formData.experience.trim());
      if (!expValidation.isValid) {
        Alert.alert('Virhe', `Kokemus: ${expValidation.message}`);
        return false;
      }
    }

    // Tarkista käyttöehdot
    if (!formData.acceptTerms) {
      Alert.alert('Virhe', 'Hyväksy käyttöehdot jatkaaksesi');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'teacher',
        phoneNumber: formData.phoneNumber,
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        experience: formData.experience,
        acceptMarketing: formData.acceptMarketing
      };

      const result = await register(userData);
      
      if (result.success) {
        Alert.alert(
          '🎉 Tilin luonti onnistui!', 
          '📧 TÄRKEÄÄ: Vahvista sähköpostiosoitteesi 3 päivän kuluessa!\n\n' +
          '✉️ Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä\n' +
          '⏰ Tili poistetaan automaattisesti jos et vahvista ajoissa\n\n' +
          '🚀 Voit aloittaa sovelluksen käytön heti, mutta muista vahvistus!'
        );
        // Navigation will happen automatically via AuthContext state change
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('TeacherSignup: Registration error:', error);
      
      // Käyttäjäystävällinen virheilmoitus
      let userMessage = 'Tilin luonti epäonnistui';
      
      if (error.message.includes('Salasana:')) {
        userMessage = error.message;
      } else if (error.message.includes('Nimi:')) {
        userMessage = error.message;
      } else if (error.message.includes('email')) {
        userMessage = 'Sähköpostiosoitteessa on ongelma';
      } else if (error.message.includes('already-in-use')) {
        userMessage = 'Sähköpostiosoite on jo käytössä';
      } else if (error.message.includes('network')) {
        userMessage = 'Verkkoyhteysvirhe. Tarkista internetyhteytesi.';
      }
      
      Alert.alert('Virhe tilin luonnissa', userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join as a Professional</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Showcase Your Skills, Be Found by Families</Text>
          <Text style={styles.welcomeSubtitle}>
            Join our global platform connecting you with families and organizations worldwide
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={formData.fullName}
              onChangeText={(text) => handleInputChange('fullName', text)}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 123-4567"
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange('phoneNumber', text)}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionTitle}>Professional Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Area of Expertise *</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  Alert.alert(
                    'Select Your Specialization',
                    '',
                    specializations.map(spec => ({
                      text: spec,
                      onPress: () => handleInputChange('specialization', spec)
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                  );
                }}
              >
                <Text style={[styles.pickerText, !formData.specialization && styles.placeholderText]}>
                  {formData.specialization || 'Select your area of expertise'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Qualifications & Certifications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g., Master's in Child Psychology, Board Certified Behavior Analyst..."
              value={formData.qualifications}
              onChangeText={(text) => handleInputChange('qualifications', text)}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Years of Experience</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 5"
              value={formData.experience}
              onChangeText={(text) => handleInputChange('experience', text)}
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.sectionTitle}>Account Security</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>
            
            {/* 💪 PASSWORD STRENGTH INDICATOR */}
            {formData.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.strengthBarBackground}>
                  <View 
                    style={[
                      styles.strengthBar, 
                      { 
                        width: getPasswordStrengthInfo().width, 
                        backgroundColor: getPasswordStrengthInfo().color 
                      }
                    ]} 
                  />
                </View>
                <View style={styles.strengthInfo}>
                  <Text style={[styles.strengthText, { color: getPasswordStrengthInfo().color }]}>
                    {getPasswordStrengthInfo().text} ({passwordStrength}/100)
                  </Text>
                  {!passwordValidation.isValid && (
                    <Text style={styles.passwordError}>
                      {passwordValidation.message}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.checkboxSection}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => handleInputChange('acceptTerms', !formData.acceptTerms)}
            >
              <Ionicons 
                name={formData.acceptTerms ? "checkbox" : "square-outline"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.checkboxText}>
                I agree to the <Text style={styles.linkText}>Terms and Conditions</Text> and{' '}
                <Text style={styles.linkText}>Privacy Policy</Text> *
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => handleInputChange('acceptMarketing', !formData.acceptMarketing)}
            >
              <Ionicons 
                name={formData.acceptMarketing ? "checkbox" : "square-outline"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.checkboxText}>
                I would like to receive updates about new opportunities and platform features
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Join Parents2Teachers'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textLight,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 15,
  },
  checkboxSection: {
    marginVertical: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkboxText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '600',
  },
  signupButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: colors.textLight,
  },
  loginLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  
  // 💪 PASSWORD STRENGTH INDICATOR STYLES
  passwordStrengthContainer: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  strengthBarBackground: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease, background-color 0.3s ease',
  },
  strengthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  passwordError: {
    fontSize: 11,
    color: '#FF6B6B',
    fontStyle: 'italic',
  },
});

export default TeacherSignupScreen;