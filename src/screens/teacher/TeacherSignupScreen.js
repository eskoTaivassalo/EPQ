import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSecurity } from '../../hooks/useSecurity';
import { AuthService } from '../../services/authService';
import { colors } from '../../styles/commonStyles';
import TagSelector from '../../components/TagSelector';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LOCATIONS,
  LANGUAGES,
  TEACHING_METHODS,
  TEACHING_STYLES,
  AVAILABILITY,
  EXPERIENCE_LEVELS
} from '../../constants/tags';

const TeacherSignupScreen = ({ navigation, route }) => {
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
  
  // Hae Google-käyttäjän tiedot jos ne on välitetty
  const googleUser = route?.params?.googleUser;
  
  const [formData, setFormData] = useState({
    fullName: googleUser?.displayName || '',
    email: googleUser?.email || '',
    password: googleUser ? 'GOOGLE_AUTH_USER' : '',
    confirmPassword: googleUser ? 'GOOGLE_AUTH_USER' : '',
    phoneNumber: '',
    specialization: '',
    qualifications: '',
    experience: '',
    // Added profile fields
    subjects: [],
    educationLevels: [],
    location: [],
    teachingMethods: [],
    languages: [],
    teachingStyles: [],
    availability: [],
    hourlyRate: '',
    education: '',
    description: '',
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
        const strength = getPasswordStrength(value);
        const validation = validatePassword(value);
        
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
      // At least one subject
      if (!formData.subjects.length) {
        Alert.alert('Virhe', 'Valitse vähintään yksi opetettava aihe (Subjects)');
        return false;
      }
      // Hourly rate required
      if (!formData.hourlyRate.trim()) {
        Alert.alert('Virhe', 'Anna tuntihinta (Hourly Rate)');
        return false;
      }
    console.log('🔧 Starting form validation...');
    
    try {
      // 🔐 ENHANCED CLIENT-SIDE VALIDATION
      
      // Validoi nimi
      if (!formData.fullName.trim()) {
        console.log('🔧 Validation failed: No name');
        Alert.alert('Virhe', 'Anna nimesi');
        return false;
      }
      
      console.log('🔧 Validating username...');
      const nameValidation = validateUsername(formData.fullName.trim());
      console.log('🔧 Username validation result:', nameValidation);
      if (!nameValidation.isValid) {
        console.log('🔧 Validation failed: Invalid name');
        Alert.alert('Virhe', `Nimi: ${nameValidation.message}`);
        return false;
      }

      // Validoi sähköposti
      if (!formData.email.trim()) {
        console.log('🔧 Validation failed: No email');
        Alert.alert('Virhe', 'Anna sähköpostiosoitteesi');
        return false;
      }
      
      console.log('🔧 Validating email...');
      const emailValid = validateEmail(formData.email.trim());
      console.log('🔧 Email validation result:', emailValid);
      if (!emailValid) {
        console.log('🔧 Validation failed: Invalid email');
        Alert.alert('Virhe', 'Virheellinen sähköpostiosoite');
        return false;
      }

      // ✅ Ohita salasanan validointi Google-käyttäjille
      if (!googleUser) {
        // Validoi salasana
        if (!formData.password.trim()) {
          console.log('🔧 Validation failed: No password');
          Alert.alert('Virhe', 'Anna salasana');
          return false;
        }
        
        console.log('🔧 Validating password...');
        const passwordValidation = validatePassword(formData.password);
        console.log('🔧 Password validation result:', passwordValidation);
        if (!passwordValidation.isValid) {
          console.log('🔧 Validation failed: Invalid password');
          Alert.alert('Heikko salasana', passwordValidation.message);
          return false;
        }

        // Tarkista salasanan vahvuus
        console.log('🔧 Checking password strength...');
        const passwordStrength = getPasswordStrength(formData.password);
        console.log('🔧 Password strength:', passwordStrength);
        if (passwordStrength < 60) {
          console.log('🔧 Validation failed: Weak password');
          Alert.alert(
            'Heikko salasana', 
            `Salasanasi vahvuus on ${passwordStrength}/100. Käytä vahvempaa salasanaa turvallisuuden vuoksi.`
          );
          return false;
        }

        // Tarkista salasanojen vastaavuus
        if (formData.password !== formData.confirmPassword) {
          console.log('🔧 Validation failed: Passwords do not match');
          Alert.alert('Virhe', 'Salasanat eivät täsmää');
          return false;
        }
      } else {
        console.log('🔧 Skipping password validation for Google user');
      }

      // Validoi specialization
      if (!formData.specialization) {
        console.log('🔧 Validation failed: No specialization');
        Alert.alert('Virhe', 'Valitse asiantuntijuusalueesi');
        return false;
      }

      // Validoi puhelinnumero jos annettu
      if (formData.phoneNumber.trim()) {
        console.log('🔧 Validating phone...');
        const phoneValidation = validatePhoneNumber(formData.phoneNumber.trim());
        console.log('🔧 Phone validation result:', phoneValidation);
        if (!phoneValidation.isValid) {
          console.log('🔧 Validation failed: Invalid phone');
          Alert.alert('Virhe', `Puhelinnumero: ${phoneValidation.message}`);
          return false;
        }
      }

      // Validoi kuvaukset
      if (formData.qualifications.trim()) {
        console.log('🔧 Validating qualifications...');
        const qualValidation = validateDescription(formData.qualifications.trim());
        console.log('🔧 Qualifications validation result:', qualValidation);
        if (!qualValidation.isValid) {
          console.log('🔧 Validation failed: Invalid qualifications');
          Alert.alert('Virhe', `Koulutus: ${qualValidation.message}`);
          return false;
        }
      }

      if (formData.experience.trim()) {
        console.log('🔧 Validating experience...');
        const expValidation = validateDescription(formData.experience.trim());
        console.log('🔧 Experience validation result:', expValidation);
        if (!expValidation.isValid) {
          console.log('🔧 Validation failed: Invalid experience');
          Alert.alert('Virhe', `Kokemus: ${expValidation.message}`);
          return false;
        }
      }

      // Tarkista käyttöehdot
      if (!formData.acceptTerms) {
        console.log('🔧 Validation failed: Terms not accepted');
        Alert.alert('Virhe', 'Hyväksy käyttöehdot jatkaaksesi');
        return false;
      }

      console.log('🔧 All validations passed!');
      return true;
      
    } catch (error) {
      console.error('🔧 Validation error:', error);
      Alert.alert('Virhe', 'Validoinnissa tapahtui virhe: ' + error.message);
      return false;
    }
  };

  const handleSignup = async () => {
    console.log('🔧 TEACHER SIGNUP BUTTON PRESSED!');
    console.log('🔧 Current form data:', {
      fullName: formData.fullName,
      email: formData.email,
      hasPassword: !!formData.password,
      passwordLength: formData.password?.length,
      hasConfirmPassword: !!formData.confirmPassword,
      specialization: formData.specialization,
      acceptTerms: formData.acceptTerms,
      isGoogleUser: !!googleUser
    });
    
    if (!validateForm()) {
      console.log('🔧 Form validation failed');
      return;
    }

    console.log('🔧 Form validation passed, starting signup...');
    setLoading(true);
    try {
      // 🔵 JOS GOOGLE-KÄYTTÄJÄ: Luo Firebase-autentikointi ENSIN
      if (googleUser?.idToken) {
        console.log('🔵 Google user detected - authenticating to Firebase...');
        await AuthService.signInWithGoogleToken(googleUser.idToken);
        console.log('✅ Firebase authentication successful');
      }

      const userData = {
        name: formData.fullName,
        email: formData.email,
        password: googleUser ? 'GOOGLE_AUTH_USER' : formData.password,
        role: 'teacher',
        // Phone variants
        phoneNumber: formData.phoneNumber,
        phone: formData.phoneNumber,
        // Flat profile fields
        subjects: formData.subjects,
        educationLevels: formData.educationLevels,
        location: formData.location,
        teachingMethods: formData.teachingMethods,
        languages: formData.languages,
        teachingStyles: formData.teachingStyles,
        availability: formData.availability,
        hourlyRate: formData.hourlyRate,
        education: formData.education,
        description: formData.description,
        specialization: formData.specialization,
        qualifications: formData.qualifications,
        experience: formData.experience,
        acceptMarketing: formData.acceptMarketing,
        isGoogleAuth: !!googleUser,
        profile: { // nested copy for backwards compatibility
          phoneNumber: formData.phoneNumber,
          specialization: formData.specialization,
          qualifications: formData.qualifications,
          experience: formData.experience,
          subjects: formData.subjects,
          educationLevels: formData.educationLevels,
          location: formData.location,
          teachingMethods: formData.teachingMethods,
          languages: formData.languages,
          teachingStyles: formData.teachingStyles,
          availability: formData.availability,
          hourlyRate: formData.hourlyRate,
          education: formData.education,
          description: formData.description,
        }
      };

      console.log('🔧 Calling register with userData:', { 
        name: userData.name, 
        email: userData.email, 
        role: userData.role,
        isGoogleAuth: userData.isGoogleAuth
      });

      const result = await register(userData);
      console.log('🔧 Register result:', result);
      
      if (result.success) {
        console.log('🔧 Signup successful!');
        Alert.alert(
          '🎉 Tilin luonti onnistui!', 
          '📧 TÄRKEÄÄ: Vahvista sähköpostiosoitteesi 3 päivän kuluessa!\n\n' +
          '✉️ Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä\n' +
          '⏰ Tili poistetaan automaattisesti jos et vahvista ajoissa\n\n' +
          '🚀 Voit aloittaa sovelluksen käytön heti, mutta muista vahvistus!'
        );
        // Navigation will happen automatically via AuthContext state change
      } else {
        console.log('🔧 Signup failed:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('🔧 TeacherSignup error:', error);
      
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

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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

          {/* NEW: Subjects */}
          <Text style={styles.sectionTitle}>Teaching Subjects *</Text>
          <TagSelector
            title="Select subjects you teach"
            tags={SUBJECTS}
            selectedTags={formData.subjects}
            onTagPress={(tags) => handleInputChange('subjects', tags)}
            showIcons
          />

          {/* Education Levels */}
          <Text style={styles.sectionTitle}>Education Levels</Text>
          <TagSelector
            title="Which levels do you teach?"
            tags={EDUCATION_LEVELS}
            selectedTags={formData.educationLevels}
            onTagPress={(tags) => handleInputChange('educationLevels', tags)}
            showIcons
          />

          {/* Location + Teaching Methods */}
          <Text style={styles.sectionTitle}>Location & Methods</Text>
          <TagSelector
            title="Where do you teach?"
            tags={LOCATIONS}
            selectedTags={formData.location}
            onTagPress={(tags) => handleInputChange('location', tags)}
            showIcons
          />
          <TagSelector
            title="How do you teach?"
            tags={TEACHING_METHODS}
            selectedTags={formData.teachingMethods}
            onTagPress={(tags) => handleInputChange('teachingMethods', tags)}
            showIcons
          />

          {/* Hourly Rate */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hourly Rate (€) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25"
              value={formData.hourlyRate}
              onChangeText={(text) => handleInputChange('hourlyRate', text)}
              keyboardType="numeric"
            />
          </View>

          {/* Languages & Teaching Styles */}
            <Text style={styles.sectionTitle}>Languages & Teaching Style</Text>
            <TagSelector
              title="Languages you speak"
              tags={LANGUAGES}
              selectedTags={formData.languages}
              onTagPress={(tags) => handleInputChange('languages', tags)}
              showIcons
            />
            <TagSelector
              title="Your teaching style"
              tags={TEACHING_STYLES}
              selectedTags={formData.teachingStyles}
              onTagPress={(tags) => handleInputChange('teachingStyles', tags)}
              showIcons
            />

          {/* Availability */}
          <Text style={styles.sectionTitle}>Availability</Text>
          <TagSelector
            title="When are you available?"
            tags={AVAILABILITY}
            selectedTags={formData.availability}
            onTagPress={(tags) => handleInputChange('availability', tags)}
            showIcons
          />

          {/* Education & Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Education & Qualifications (Formal)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. M.Sc. in Education, University of Helsinki"
              value={formData.education}
              onChangeText={(text) => handleInputChange('education', text)}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Public Profile Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your teaching approach, achievements, philosophy..."
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Näytä salasanakentät vain jos EI Google-kirjautumista */}
          {!googleUser && (
            <>
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
                    textContentType="newPassword"
                    autoComplete="password-new"
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
                    textContentType="newPassword"
                    autoComplete="password-new"
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
            </>
          )}
          
          {/* Näytä info jos Google-käyttäjä */}
          {googleUser && (
            <View style={styles.googleInfoBox}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              <Text style={styles.googleInfoText}>
                Kirjauduttu Google-tilillä. Salasanaa ei tarvita.
              </Text>
            </View>
          )}

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
      </KeyboardAvoidingView>
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
  fontSize: 18,
  },
  passwordLengthIndicator: {
  fontSize: 24,
  color: colors.textLight,
  marginRight: 4,
  minWidth: 20,
  textAlign: 'center',
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
  },
  googleInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 12,
  },
  googleInfoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
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