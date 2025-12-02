import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppLogo from '../../components/AppLogo';
import { colors, commonStyles } from '../../styles/commonStyles';
import { 
  ROLE_TYPES, 
  ROLE_CATEGORIES,
  getRoleConfig,
  getProviderRoles,
  getCustomerRoles
} from '../../config/roleConfig';

const WelcomeScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const providerRoles = getProviderRoles();
  const customerRoles = getCustomerRoles();

  const handleRoleSelection = (role) => {
    navigation.navigate('Login', { userType: role });
  };

  const handleSignupSelection = (role) => {
    navigation.navigate('RoleSignup', { roleType: role });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  const renderRoleCard = (roleConfig) => {
    return (
      <TouchableOpacity
        key={roleConfig.id}
        style={[styles.roleCard, { borderColor: roleConfig.colors.primary }]}
        onPress={() => handleRoleSelection(roleConfig.id)}
      >
        <View style={[styles.roleIcon, { backgroundColor: roleConfig.colors.primary + '20' }]}>
          <Ionicons name={roleConfig.icon} size={30} color={roleConfig.colors.primary} />
        </View>
        <Text style={styles.roleCardTitle}>{roleConfig.name}</Text>
        <View style={styles.tagsContainer}>
          {roleConfig.tags.map((tag, idx) => (
            <View key={idx} style={[styles.tag, { backgroundColor: roleConfig.colors.primary + '15' }]}>
              <Text style={[styles.tagText, { color: roleConfig.colors.primary }]}>#{tag}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity 
          style={[styles.signupButton, { backgroundColor: roleConfig.colors.primary }]}
          onPress={() => handleSignupSelection(roleConfig.id)}
        >
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <AppLogo size={120} />
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Choose how you want to get started</Text>
        </View>

        <View style={styles.mainSelection}>
          {/* Main Choice: Provider or Customer */}
          {selectedCategory === null ? (
            <>
              <Text style={styles.selectionPrompt}>What brings you here?</Text>
              
              <TouchableOpacity
                style={[styles.mainChoiceCard, { borderColor: '#FF6B35' }]}
                onPress={() => handleCategorySelect(ROLE_CATEGORIES.PROVIDER)}
              >
                <View style={[styles.mainChoiceIcon, { backgroundColor: '#FF6B3520' }]}>
                  <Ionicons name="briefcase" size={40} color="#FF6B35" />
                </View>
                <Text style={styles.mainChoiceTitle}>I Provide Services</Text>
                <Text style={styles.mainChoiceDescription}>
                  Offer your expertise and connect with clients
                </Text>
                <Ionicons name="arrow-forward" size={24} color="#FF6B35" style={styles.mainChoiceArrow} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainChoiceCard, { borderColor: '#4A90E2' }]}
                onPress={() => handleCategorySelect(ROLE_CATEGORIES.CUSTOMER)}
              >
                <View style={[styles.mainChoiceIcon, { backgroundColor: '#4A90E220' }]}>
                  <Ionicons name="search" size={40} color="#4A90E2" />
                </View>
                <Text style={styles.mainChoiceTitle}>I Need Services</Text>
                <Text style={styles.mainChoiceDescription}>
                  Find and book professionals for your needs
                </Text>
                <Ionicons name="arrow-forward" size={24} color="#4A90E2" style={styles.mainChoiceArrow} />
              </TouchableOpacity>

              {/* Already Have Account */}
              <View style={styles.loginSection}>
                <Text style={styles.loginPrompt}>Already have an account?</Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedCategory(null)}
              >
                <Ionicons name="arrow-back" size={24} color={colors.primary} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>

              {/* Role Selection */}
              <Text style={styles.roleSelectionTitle}>
                {selectedCategory === ROLE_CATEGORIES.PROVIDER 
                  ? 'Choose Your Professional Role' 
                  : 'What Are You Looking For?'}
              </Text>

              <View style={styles.rolesGrid}>
                {selectedCategory === ROLE_CATEGORIES.PROVIDER 
                  ? providerRoles.map((role) => renderRoleCard(role))
                  : customerRoles.map((role) => renderRoleCard(role))}
              </View>

              {/* Already Have Account (also on role selection) */}
              <View style={styles.loginSection}>
                <Text style={styles.loginPrompt}>Already have an account?</Text>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginButtonText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Connect, book, and grow together</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 15,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mainSelection: {
    marginTop: 20,
  },
  selectionPrompt: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  mainChoiceCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  mainChoiceIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainChoiceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  mainChoiceDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  mainChoiceArrow: {
    marginTop: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  roleSelectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  loginSection: {
    marginTop: 32,
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E0E0E0',
  },
  loginPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  roleSelection: {
    marginTop: 10,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 15,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
  },
  categoryTabActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  categoryTabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  rolesContainer: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    minWidth: '48%',
    maxWidth: '48%',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4.65,
    elevation: 6,
  },
  roleIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 6,
    justifyContent: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  signupButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  signupButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  registrationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  registrationText: {
    fontSize: 11,
    color: colors.textLight,
  },
  registrationLink: {
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  registrationSeparator: {
    fontSize: 11,
    color: colors.textLight,
  },
});

export default WelcomeScreen;