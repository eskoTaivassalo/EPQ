/**
 * UniversalSignupScreen - Dynamic role-based signup
 * 
 * Universal signup screen that adapts based on the user's role.
 * Replaces separate ProviderSignupScreen and ClientSignupScreen.
 * Works with roleConfig to support any role type.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSecurity } from '../../hooks/useSecurity';
import { AuthService } from '../../services/authService';
import { colors } from '../../styles/commonStyles';
import TagSelector from '../../components/TagSelector';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import WatercolorBackground from '../../components/WatercolorBackground';
import { getRoleConfig, getRoleColors, getCanonicalRole } from '../../config/roleConfig';
import { addRoleToUser } from '../../services/userDatabaseService';
import { auth } from '../../config/firebaseConfig';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LOCATIONS,
  LANGUAGES,
  TEACHING_METHODS,
  PRICE_RANGES,
  AVAILABILITY,
  TEACHING_STYLES,
  SPECIAL_NEEDS,
  THERAPY_SPECIALIZATIONS,
  THERAPY_NEEDS,
  SPECIALIZATIONS,
  ACADEMIC_INTERESTS,
  CLIENT_FOCUS,
  GRADE_RANGES,
  TEACHING_PHILOSOPHY
} from '../../constants/tags';
import { getCurrentLocation, reverseGeocode, requestForegroundPermissions } from '../../services/locationService';

const TAG_CONSTANTS = {
  subjects: SUBJECTS,
  educationLevels: EDUCATION_LEVELS,
  location: LOCATIONS,
  languages: LANGUAGES,
  teachingMethods: TEACHING_METHODS,
  priceRanges: PRICE_RANGES,
  availability: AVAILABILITY,
  teachingStyles: TEACHING_STYLES,
  specialNeeds: SPECIAL_NEEDS,
  specializations: SPECIALIZATIONS, // Teacher specializations
  therapySpecializations: THERAPY_SPECIALIZATIONS, // Therapist specializations
  therapyNeeds: THERAPY_NEEDS,
  gradeRanges: GRADE_RANGES,
  academicInterests: ACADEMIC_INTERESTS,
  teachingApproach: TEACHING_PHILOSOPHY,
};

const UniversalSignupScreen = ({ navigation, route }) => {
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

  // Get role from route params (e.g., from WelcomeScreen or RoleSignupScreen)
  const roleParam = route?.params?.role || route?.params?.roleType || 'service_provider';
  const role = getCanonicalRole(roleParam);
  const roleConfig = getRoleConfig(role);
  const roleColors = getRoleColors(role);
  const googleUser = route?.params?.googleUser;
  const addingRole = route?.params?.addingRole || false; // New role for existing account

  // Initialize form state dynamically based on role's signupFields
  const [formData, setFormData] = useState(() => {
    const initial = {
      fullName: googleUser?.displayName || '',
      email: googleUser?.email || '',
      password: googleUser ? 'GOOGLE_AUTH_USER' : '',
      confirmPassword: googleUser ? 'GOOGLE_AUTH_USER' : '',
      acceptTerms: false,
      acceptMarketing: false,
    };

    // Add fields from roleConfig
    if (roleConfig?.signupFields) {
      roleConfig.signupFields.forEach(field => {
        if (!initial[field.key]) {
          initial[field.key] = field.type === 'tags' ? [] : '';
        }
      });
    }

    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: false, message: '' });
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [autoLocationFetched, setAutoLocationFetched] = useState(false);

  // Auto-fetch location on mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  const fetchUserLocation = async () => {
    try {
      setLocationLoading(true);
      
      const { granted } = await requestForegroundPermissions();
      if (!granted) {
        setLocationLoading(false);
        return;
      }

      const locationResult = await getCurrentLocation();
      if (!locationResult.success) {
        setLocationLoading(false);
        return;
      }

      const reverseResult = await reverseGeocode(
        locationResult.coords.latitude,
        locationResult.coords.longitude
      );

      if (reverseResult.success && reverseResult.city) {
        handleInputChange('location', [reverseResult.city]);
        setAutoLocationFetched(true);
      }
    } catch (error) {
      // Location fetch failed
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    // Password validation
    if (key === 'password' && !googleUser) {
      const validation = validatePassword(value);
      const strength = getPasswordStrength(value);
      setPasswordValidation(validation);
      setPasswordStrength(strength);
    }
  };

  const validateForm = () => {
    
    // Profile image check
    if (!profileImageUri) {
      Alert.alert('Profile Photo Required', 'Please upload a profile photo to continue.');
      return false;
    }

    // Required fields from roleConfig
    if (roleConfig?.signupFields) {
      const missingFields = roleConfig.signupFields
        .filter(field => field.required)
        .filter(field => {
          const value = formData[field.key];
          return !value || (Array.isArray(value) && value.length === 0);
        });

      if (missingFields.length > 0) {
        Alert.alert(
          'Missing Information',
          `Please fill in: ${missingFields.map(f => f.label).join(', ')}`
        );
        return false;
      }
    }

    // Password validation (only for non-Google users and when not adding role)
    if (!googleUser && !addingRole) {
      if (!formData.password || formData.password.length < 6) {
        Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return false;
      }

      if (!passwordValidation.isValid) {
        Alert.alert('Weak Password', passwordValidation.message);
        return false;
      }
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      Alert.alert('Terms Required', 'You must accept the Terms and Conditions to continue.');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check if we're adding a role to existing account
      if (addingRole) {
        // Use existing authenticated user
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          Alert.alert('Error', 'You must be logged in to add a new role');
          return;
        }

        // Build profile data for the new role
        const roleProfileData = {
          name: formData.fullName,
          email: currentUser.email,
          role: roleConfig.legacyName || role,
        };

        // Add all other fields from formData (except passwords and system fields)
        Object.keys(formData).forEach(key => {
          if (!['password', 'confirmPassword', 'acceptTerms', 'acceptMarketing', 'fullName', 'email'].includes(key)) {
            roleProfileData[key] = formData[key];
          }
        });

        // Add the role to the user
        await addRoleToUser(currentUser.uid, roleConfig.legacyName || role, roleProfileData);

        // Upload profile image if provided
        if (profileImageUri) {
          try {
            await AuthService.updateProfileImage(profileImageUri, currentUser.uid, roleConfig.legacyName || role);
          } catch (imageError) {
            Alert.alert(
              'Notice',
              'Profile image upload failed, but your role was added successfully. You can add it later.'
            );
          }
        }

        Alert.alert(
          '🎉 Role Added!',
          `✅ ${roleConfig.nameLocalized || roleConfig.name} role has been added to your account!\n\n🚀 You can now switch between your roles.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );

        return;
      }

      // Normal signup flow (creating new account)
      // Google authentication
      if (googleUser?.idToken) {
        await AuthService.signInWithGoogleToken(googleUser.idToken);
      }

      // Build user data based on role
      const userData = {
        name: formData.fullName,
        email: formData.email,
        password: googleUser ? 'GOOGLE_AUTH_USER' : formData.password,
        role: roleConfig.legacyName || role, // Use legacy name for backward compatibility
        acceptMarketing: formData.acceptMarketing,
        isGoogleAuth: !!googleUser,
      };

      // Add all other fields from formData (except passwords and system fields)
      Object.keys(formData).forEach(key => {
        if (!['password', 'confirmPassword', 'acceptTerms', 'acceptMarketing', 'fullName', 'email'].includes(key)) {
          userData[key] = formData[key];
        }
      });

      const result = await register(userData);
      
      if (result.success) {
        // Upload profile image
        if (profileImageUri && result.user?.uid) {
          try {
            await AuthService.updateProfileImage(profileImageUri, result.user.uid, roleConfig.legacyName || role);
          } catch (imageError) {
            Alert.alert(
              'Notice',
              'Profile image upload failed, but your account was created successfully. You can add it later.'
            );
          }
        }

        // Success message
        if (googleUser) {
          Alert.alert(
            '🎉 Account Created!',
            '✅ Your Google account is automatically verified.\n\n🚀 You can start using the app now!'
          );
        } else {
          Alert.alert(
            '🎉 Account Created!',
            '✅ A verification email has been sent to your email address.\n\n📧 Please check your inbox and click the verification link to activate your account.\n\n🚀 You can start using the app right away!'
          );
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {

      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthInfo = () => {
    if (passwordStrength < 30) return { text: 'Weak', color: '#E74C3C', width: '33%' };
    if (passwordStrength < 60) return { text: 'Medium', color: '#F39C12', width: '66%' };
    return { text: 'Strong', color: '#27AE60', width: '100%' };
  };

  const renderTextField = (field) => {
    const { key, label, required, type } = field;
    const placeholder = field.placeholder || `Enter ${label.toLowerCase()}`;
    const isHourlyRate = key === 'hourlyRate';

    return (
      <View key={key} style={styles.inputGroup}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input, 
            type === 'textarea' && styles.textArea,
            isHourlyRate && styles.narrowInput
          ]}
          placeholder={placeholder}
          value={formData[key] || ''}
          onChangeText={(text) => handleInputChange(key, text)}
          keyboardType={type === 'email' ? 'email-address' : type === 'phone' ? 'phone-pad' : type === 'number' ? 'numeric' : 'default'}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          multiline={type === 'textarea'}
          numberOfLines={type === 'textarea' ? 5 : 1}
          editable={!(key === 'email' && googleUser)}
          maxLength={isHourlyRate ? 3 : undefined}
        />
      </View>
    );
  };

  const renderPasswordField = (field) => {
    const isConfirm = field.key === 'confirmPassword';
    const show = isConfirm ? showConfirmPassword : showPassword;
    const setShow = isConfirm ? setShowConfirmPassword : setShowPassword;

    return (
      <View key={field.key} style={styles.inputGroup}>
        <Text style={styles.label}>
          {field.label} {field.required && <Text style={styles.required}>*</Text>}
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder={field.placeholder || "Minimum 6 characters"}
            value={formData[field.key] || ''}
            onChangeText={(text) => handleInputChange(field.key, text)}
            secureTextEntry={!show}
            autoCapitalize="none"
            textContentType={isConfirm ? "newPassword" : "password"}
            autoComplete={isConfirm ? "password-new" : "password"}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShow(!show)}>
            <Ionicons name={show ? "eye-off" : "eye"} size={20} color="#7F8C8D" />
          </TouchableOpacity>
        </View>

        {/* Password strength indicator (only for main password field) */}
        {field.key === 'password' && formData.password && formData.password.length > 0 && (
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
            <Text style={[styles.strengthText, { color: getPasswordStrengthInfo().color }]}>
              {getPasswordStrengthInfo().text} ({passwordStrength}/100)
            </Text>
            {!passwordValidation.isValid && (
              <Text style={styles.passwordError}>{passwordValidation.message}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderTagsField = (field) => {
    const { key, label, required } = field;
    const tags = TAG_CONSTANTS[key] || [];

    return (
      <View key={key}>
        <TagSelector
          title={`${label}${required ? ' *' : ''}`}
          tags={tags}
          selectedTags={formData[key] || []}
          onTagPress={(selectedTags) => handleInputChange(key, selectedTags)}
          showIcons={key === 'subjects'}
        />
      </View>
    );
  };

  const renderField = (field) => {
    const { type, key } = field;

    // Skip password fields for Google users
    if ((key === 'password' || key === 'confirmPassword') && googleUser) {
      return null;
    }

    switch (type) {
      case 'password':
        return renderPasswordField(field);
      case 'tags':
        return renderTagsField(field);
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
      case 'textarea':
        return renderTextField(field);
      default:
        return null;
    }
  };

  if (!roleConfig) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>Invalid role configuration</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WatercolorBackground />
      
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {addingRole ? `Add ${roleConfig.name} Role` : `Join as ${roleConfig.name}`}
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              {roleConfig.category === 'provider' 
                ? `${roleConfig.name} - Share Your Expertise` 
                : roleConfig.id === 'client' 
                  ? 'Find the Perfect Teacher for Your Child'
                  : `Find Your ${roleConfig.name}`}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {roleConfig.category === 'provider'
                ? `Join our platform connecting ${roleConfig.name.toLowerCase()}s with clients worldwide`
                : roleConfig.id === 'client'
                  ? 'Connect with qualified teachers in your area'
                  : 'Connect with qualified professionals in your area'}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: roleColors.primary }]}>
              Create Your Profile
            </Text>
            
            {/* Profile Image - Always Required */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Profile Photo <Text style={styles.required}>* (Required)</Text>
              </Text>
              <Text style={styles.helperText}>
                Upload a clear photo of yourself. This helps build trust.
              </Text>
              <ProfileImagePicker
                imageUri={profileImageUri}
                onImageSelected={setProfileImageUri}
                size={120}
                editable={true}
              />
            </View>

            {/* Basic Info */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="your.email@example.com"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!googleUser}
              />
            </View>

            {/* Location with Auto-detect */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Location (City) <Text style={styles.required}>*</Text>
              </Text>
              {locationLoading && (
                <View style={styles.locationLoadingContainer}>
                  <ActivityIndicator size="small" color={roleColors.primary} />
                  <Text style={styles.locationLoadingText}>Detecting your location...</Text>
                </View>
              )}
              {autoLocationFetched && !locationLoading && (
                <Text style={styles.autoLocationText}>
                  ✅ Auto-detected: {Array.isArray(formData.location) ? formData.location[0] : formData.location}
                </Text>
              )}
              <TextInput
                style={styles.input}
                placeholder={locationLoading ? "Detecting..." : "e.g. Helsinki"}
                value={Array.isArray(formData.location) ? formData.location[0] || '' : formData.location || ''}
                onChangeText={(text) => handleInputChange('location', text.trim() ? [text.trim()] : [])}
                editable={!locationLoading}
              />
              <TouchableOpacity 
                style={styles.refreshLocationButton} 
                onPress={fetchUserLocation}
                disabled={locationLoading}
              >
                <Ionicons name="location" size={16} color={roleColors.primary} />
                <Text style={[styles.refreshLocationText, { color: roleColors.primary }]}>
                  {locationLoading ? 'Detecting...' : 'Refresh Location'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. +358 40 1234567"
                value={formData.phoneNumber || ''}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Password Fields (not for Google users or when adding role) */}
            {!googleUser && !addingRole && (
              <>
                <Text style={[styles.sectionTitle, { color: roleColors.primary }]}>
                  Account Security
                </Text>
                {renderPasswordField({ key: 'password', label: 'Password', required: true })}
                {renderPasswordField({ key: 'confirmPassword', label: 'Confirm Password', required: true })}
              </>
            )}

            {/* Dynamic Fields from roleConfig */}
            {roleConfig.signupFields && roleConfig.signupFields
              .filter(field => !['displayName', 'email', 'password', 'phoneNumber'].includes(field.key))
              .map(field => renderField(field))}

            {/* Terms and Marketing */}
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleInputChange('acceptTerms', !formData.acceptTerms)}
              >
                <Ionicons
                  name={formData.acceptTerms ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={roleColors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                I accept the{' '}
                <Text style={[styles.link, { color: roleColors.primary }]}>Terms and Conditions</Text> and{' '}
                <Text style={[styles.link, { color: roleColors.primary }]}>Privacy Policy</Text>
                <Text style={styles.required}> *</Text>
              </Text>
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleInputChange('acceptMarketing', !formData.acceptMarketing)}
              >
                <Ionicons
                  name={formData.acceptMarketing ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={roleColors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                I want to receive marketing emails and updates
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.signupButton, { backgroundColor: roleColors.primary }]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signupButtonText}>
                  {addingRole ? 'Add Role' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link (only for normal signup) */}
            {!addingRole && (
              <View style={styles.loginLinkContainer}>
                <Text style={styles.loginLinkText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={[styles.loginLink, { color: roleColors.primary }]}>Log In</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 6,
  },
  required: {
    color: '#E74C3C',
  },
  helperText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  narrowInput: {
    width: 100,
    textAlign: 'center',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
  eyeButton: {
    padding: 12,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  strengthBarBackground: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  passwordError: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 4,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#7F8C8D',
  },
  autoLocationText: {
    fontSize: 12,
    color: '#27AE60',
    marginBottom: 8,
  },
  refreshLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshLocationText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  link: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 16,
    marginBottom: 8,
  },
  errorButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UniversalSignupScreen;
