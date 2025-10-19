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
import { useAuth } from '../hooks/useAuth';
import { useSecurity } from '../hooks/useSecurity';
import { colors } from '../styles/commonStyles';

const ParentSignupScreen = ({ navigation }) => {
  const { register } = useAuth();
  const { 
    validatePassword, 
    getPasswordStrength, 
    sanitizeInput,
    validateUsername,
    validateEmail,
    validatePhoneNumber,
    validateDescription
  } = useSecurity();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    location: '',
    childrenAges: '',
    specificNeeds: '',
    lookingFor: [],
    acceptTerms: false,
    acceptMarketing: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 💪 PASSWORD STRENGTH INDICATORS
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, message: '' });

  const serviceTypes = [
    'Child Development Support',
    'Educational Tutoring',
    'Behavioral Analysis',
    'Speech-Language Therapy',
    'Psychological Counseling',
    'Special Needs Support',
    'Academic Coaching',
    'Social Skills Training',
    'Family Counseling',
    'Learning Disabilities Support',
    'Autism Spectrum Support',
    'Other'
  ];

  // 💪 Enhanced handleInputChange with real-time password validation
  const handleInputChange = (field, value) => {
    // 🛡️ Sanitize input for security
    const sanitizedValue = sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [field]: sanitizedValue
    }));
    
    // Real-time password strength checking
    if (field === 'password' && sanitizedValue.length > 0) {
      const strength = getPasswordStrength(sanitizedValue);
      const validation = validatePassword(sanitizedValue);
      
      setPasswordStrength(strength);
      setPasswordValidation(validation);
    }
  };
  
  // 💪 Password strength visual info
  const getPasswordStrengthInfo = () => {
    if (passwordStrength >= 80) {
      return { text: 'VAHVA', color: '#10B981', width: '100%' };
    } else if (passwordStrength >= 60) {
      return { text: 'KESKINKERTAINEN', color: '#F59E0B', width: '70%' };
    } else if (passwordStrength >= 40) {
      return { text: 'HEIKKO', color: '#EF4444', width: '40%' };
    } else {
      return { text: 'ERITTÄIN HEIKKO', color: '#DC2626', width: '20%' };
    }
  };

  const toggleService = (service) => {
    setFormData(prev => ({
      ...prev,
      lookingFor: prev.lookingFor.includes(service)
        ? prev.lookingFor.filter(s => s !== service)
        : [...prev.lookingFor, service]
    }));
  };

  const validateForm = () => {
    // 🔐 ENHANCED CLIENT-SIDE VALIDATION
    
    // Validoi nimi
    if (!formData.fullName.trim()) {
      Alert.alert('Virhe', 'Anna nimesi');
      return false;
    }
    
    const nameValidation = validateUsername(formData.fullName.trim());
    if (!nameValidation.isValid) {
      Alert.alert('Virhe', `Nimi: ${nameValidation.message}`);
      return false;
    }

    // Validoi sähköposti
    if (!formData.email.trim()) {
      Alert.alert('Virhe', 'Anna sähköpostiosoitteesi');
      return false;
    }
    
    if (!validateEmail(formData.email.trim())) {
      Alert.alert('Virhe', 'Virheellinen sähköpostiosoite');
      return false;
    }

    // Validoi salasana
    if (!formData.password.trim()) {
      Alert.alert('Virhe', 'Anna salasana');
      return false;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      Alert.alert('Heikko salasana', passwordValidation.message);
      return false;
    }

    // Tarkista salasanan vahvuus
    const passwordStrength = getPasswordStrength(formData.password);
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

    // Validoi puhelinnumero jos annettu
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneValidation = validatePhoneNumber(formData.phoneNumber.trim());
      if (!phoneValidation.isValid) {
        Alert.alert('Virhe', `Puhelinnumero: ${phoneValidation.message}`);
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
    console.log('🔧 PARENT SIGNUP BUTTON PRESSED!');
    
    if (!validateForm()) {
      console.log('🔧 Parent form validation failed');
      return;
    }

    console.log('🔧 Parent form validation passed, starting signup...');
    setLoading(true);
    try {
      const userData = {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'parent',
        phoneNumber: formData.phoneNumber,
        location: formData.location,
        childrenAges: formData.childrenAges,
        specificNeeds: formData.specificNeeds,
        lookingFor: formData.lookingFor,
        acceptMarketing: formData.acceptMarketing
      };

      console.log('🔧 Calling register with parent userData:', { 
        name: userData.name, 
        email: userData.email, 
        role: userData.role 
      });

      const result = await register(userData);
      console.log('🔧 Parent register result:', result);
      
      if (result.success) {
        console.log('🔧 Parent signup successful!');
        Alert.alert(
          '🎉 Tilin luonti onnistui!', 
          '📧 TÄRKEÄÄ: Vahvista sähköpostiosoitteesi 3 päivän kuluessa!\n\n' +
          '✉️ Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä\n' +
          '⏰ Tili poistetaan automaattisesti jos et vahvista ajoissa\n\n' +
          '🚀 Voit aloittaa sovelluksen käytön heti, mutta muista vahvistus!'
        );
        // Navigation will happen automatically via AuthContext state change
      } else {
        console.log('🔧 Parent signup failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('🔧 ParentSignup error:', error);
      Alert.alert('Error', error.message || 'Failed to create account');
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
        <Text style={styles.headerTitle}>Join as a Parent</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Connect with Professionals Worldwide</Text>
          <Text style={styles.welcomeSubtitle}>
            Find qualified specialists to support your child's development and learning journey
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="City, Country"
              value={formData.location}
              onChangeText={(text) => handleInputChange('location', text)}
            />
          </View>

          <Text style={styles.sectionTitle}>About Your Family</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Children's Ages</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 5, 8, 12 years old"
              value={formData.childrenAges}
              onChangeText={(text) => handleInputChange('childrenAges', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specific Needs or Goals</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us about any specific learning needs, developmental goals, or areas where you'd like support..."
              value={formData.specificNeeds}
              onChangeText={(text) => handleInputChange('specificNeeds', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What type of support are you looking for?</Text>
            <Text style={styles.helper}>Select all that apply</Text>
            <View style={styles.serviceGrid}>
              {serviceTypes.map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceChip,
                    formData.lookingFor.includes(service) && styles.selectedChip
                  ]}
                  onPress={() => toggleService(service)}
                >
                  <Text style={[
                    styles.serviceText,
                    formData.lookingFor.includes(service) && styles.selectedText
                  ]}>
                    {service}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                I would like to receive updates about new specialists and platform features
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
    backgroundColor: colors.secondary,
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
  helper: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 10,
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
    height: 100,
    textAlignVertical: 'top',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: 8,
  },
  selectedChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceText: {
    fontSize: 12,
    color: colors.text,
  },
  selectedText: {
    color: colors.white,
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
    backgroundColor: colors.secondary,
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

export default ParentSignupScreen;