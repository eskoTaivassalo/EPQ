/**
 * RoleSignupScreen - Dynamic role-based signup
 * 
 * Universal signup screen that adapts based on the selected role.
 * Replaces separate TeacherSignupScreen and ParentSignupScreen.
 */

import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { getRoleConfig, getRoleColors, ROLE_TYPES } from '../../config/roleConfig';
import { colors as defaultColors } from '../../styles/commonStyles';
import imagePickerService from '../../services/imagePickerService';

const RoleSignupScreen = ({ route, navigation }) => {
  const { roleType } = route.params || { roleType: ROLE_TYPES.CLIENT };
  const roleConfig = getRoleConfig(roleType);
  const roleColors = getRoleColors(roleType);
  
  // Dynamic form state based on role config
  const [formData, setFormData] = useState(() => {
    const initialState = {};
    roleConfig.signupFields.forEach(field => {
      initialState[field.key] = field.type === 'tags' ? [] : '';
    });
    return initialState;
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null); // Required profile image

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handlePickImage = async () => {
    try {
      const result = await imagePickerService.pickImage();
      if (result) {
        setProfileImage(result);
        console.log('✅ Profile image selected:', result.uri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleSignup = async () => {
    // Validate profile image (REQUIRED)
    if (!profileImage) {
      Alert.alert(
        'Profile Photo Required',
        'Please upload a profile photo to continue. This helps other users recognize you.'
      );
      return;
    }

    // Validate required fields
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
      return;
    }

    // Redirect to legacy signup screens that have full functionality
    if (roleType === ROLE_TYPES.SERVICE_PROVIDER || roleType === ROLE_TYPES.COACH) {
      navigation.navigate('TeacherSignup');
    } else if (roleType === ROLE_TYPES.CLIENT || roleType === ROLE_TYPES.ATHLETE) {
      navigation.navigate('ParentSignup');
    } else {
      Alert.alert('Error', 'Invalid role type');
    }
  };

  const renderField = (field) => {
    const { key, type, label, required } = field;
    
    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <View key={key} style={styles.inputGroup}>
            <Text style={[styles.label, { color: roleColors.text }]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: roleColors.primary }]}
              value={formData[key]}
              onChangeText={(value) => handleFieldChange(key, value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              keyboardType={
                type === 'email' ? 'email-address' :
                type === 'phone' ? 'phone-pad' :
                type === 'number' ? 'numeric' : 'default'
              }
              autoCapitalize={type === 'email' ? 'none' : 'words'}
            />
          </View>
        );
      
      case 'password':
        return (
          <View key={key} style={styles.inputGroup}>
            <Text style={[styles.label, { color: roleColors.text }]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { borderColor: roleColors.primary }]}
                value={formData[key]}
                onChangeText={(value) => handleFieldChange(key, value)}
                placeholder="Enter password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={24}
                  color={roleColors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      
      case 'textarea':
        return (
          <View key={key} style={styles.inputGroup}>
            <Text style={[styles.label, { color: roleColors.text }]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, styles.textarea, { borderColor: roleColors.primary }]}
              value={formData[key]}
              onChangeText={(value) => handleFieldChange(key, value)}
              placeholder={`Enter ${label.toLowerCase()}`}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        );
      
      case 'tags':
        return (
          <View key={key} style={styles.inputGroup}>
            <Text style={[styles.label, { color: roleColors.text }]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
            <Text style={styles.helperText}>
              Enter items separated by commas
            </Text>
            <TextInput
              style={[styles.input, { borderColor: roleColors.primary }]}
              value={formData[key].join(', ')}
              onChangeText={(value) => {
                const tags = value.split(',').map(t => t.trim()).filter(Boolean);
                handleFieldChange(key, tags);
              }}
              placeholder={`e.g., Mathematics, Physics, Chemistry`}
            />
            {formData[key].length > 0 && (
              <View style={styles.tagsContainer}>
                {formData[key].map((tag, index) => (
                  <View
                    key={index}
                    style={[styles.tag, { backgroundColor: roleColors.primary + '20' }]}
                  >
                    <Text style={[styles.tagText, { color: roleColors.primary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: roleColors.background }]}>
      <WatercolorBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name={roleConfig.icon} size={32} color="#FFFFFF" />
            <Text style={styles.headerTitle}>
              {roleConfig.nameLocalized} - Sign Up
            </Text>
          </View>
        </View>

        {/* Form */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Image Picker - REQUIRED */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: roleColors.text }]}>
              Profile Photo
              <Text style={styles.required}> * (Required)</Text>
            </Text>
            <Text style={styles.helperText}>
              Upload a clear photo of yourself. This helps build trust with other users.
            </Text>
            
            <TouchableOpacity
              style={[styles.imagePickerButton, { borderColor: roleColors.primary }]}
              onPress={handlePickImage}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="camera" size={40} color={roleColors.primary} />
                  <Text style={[styles.imagePickerText, { color: roleColors.primary }]}>
                    Tap to Upload Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {profileImage && (
              <TouchableOpacity
                style={[styles.changeImageButton, { backgroundColor: roleColors.primary }]}
                onPress={handlePickImage}
              >
                <Ionicons name="camera" size={18} color="#FFFFFF" />
                <Text style={styles.changeImageText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {roleConfig.signupFields.map(field => renderField(field))}

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[
              styles.signupButton,
              { backgroundColor: roleColors.primary },
              loading && styles.signupButtonDisabled
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: roleColors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: roleColors.primary }]}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#E74C3C',
  },
  helperText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    height: 100,
    paddingTop: 12,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signupButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  imagePickerButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 200,
  },
  imagePickerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  profileImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  changeImageButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RoleSignupScreen;
