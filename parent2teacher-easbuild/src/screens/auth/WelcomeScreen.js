import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppLogo from '../../components/AppLogo';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { ROLE_CONFIG, ROLE_TYPES, ROLE_CATEGORIES } from '../../config/roleConfig';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  const [featuredTeachers, setFeaturedTeachers] = useState([]);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const scrollY = new Animated.Value(0);

  // Fade in animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Fetch featured teachers for preview
  useEffect(() => {
    const fetchFeaturedTeachers = async () => {
      try {
        if (!db) return;
        const q = query(collection(db, 'teachers'), limit(6));
        const snapshot = await getDocs(q);
        const teachers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFeaturedTeachers(teachers);
      } catch (error) {
        console.log('Could not load featured teachers:', error);
      }
    };
    
    fetchFeaturedTeachers();
  }, []);

  const handleRoleSelection = (role) => {
    navigation.navigate('Login', { userType: role });
  };

  const handleSignupSelection = (role) => {
    // Route to legacy signup screens that have full functionality
    if (role === ROLE_TYPES.SERVICE_PROVIDER || role === ROLE_TYPES.COACH) {
      navigation.navigate('TeacherSignup');
    } else if (role === ROLE_TYPES.CLIENT || role === ROLE_TYPES.ATHLETE) {
      navigation.navigate('ParentSignup');
    } else {
      Alert.alert('Error', 'Invalid role type');
    }
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

  const renderFeatureCard = (icon, title, description) => (
    <View style={styles.featureCard} key={title}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );

  const renderTeacherCard = (teacher) => (
    <TouchableOpacity 
      key={teacher.id}
      style={styles.teacherCard}
      onPress={() => {
        // Show call-to-action to sign up
        navigation.navigate('Login');
      }}
    >
      <View style={styles.teacherAvatar}>
        {teacher.photoURL ? (
          <Image source={{ uri: teacher.photoURL }} style={styles.teacherAvatarImage} />
        ) : (
          <Ionicons name="person" size={32} color={colors.textSecondary} />
        )}
      </View>
      <Text style={styles.teacherName} numberOfLines={1}>
        {teacher.name || teacher.fullName || 'Teacher'}
      </Text>
      {teacher.subjects && teacher.subjects.length > 0 && (
        <Text style={styles.teacherSubject} numberOfLines={1}>
          {teacher.subjects[0]}
        </Text>
      )}
      <View style={styles.teacherRating}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.teacherRatingText}>
          {teacher.rating || '5.0'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground variant="full" />

      {/* Floating Header Bar */}
      <View style={styles.floatingHeader}>
        <View style={styles.headerLeft}>
          <AppLogo size={100} />
        </View>
        <TouchableOpacity
          style={styles.headerSignInButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Ionicons name="log-in-outline" size={20} color={colors.primary} />
          <Text style={styles.headerSignInText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Connect Teachers & Students</Text>
          <Text style={styles.subtitle}>Find qualified teachers or share your expertise with students</Text>
        </Animated.View>

        {/* Intro content */}
        <>
            {/* Subject Categories */}
            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Popular Subjects</Text>
              <View style={styles.categoriesGrid}>
                <View style={styles.categoryBadge}>
                  <Ionicons name="calculator" size={20} color={colors.primary} />
                  <Text style={styles.categoryBadgeText}>Mathematics</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="language" size={20} color="#E74C3C" />
                  <Text style={styles.categoryBadgeText}>Languages</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="flask" size={20} color="#9B59B6" />
                  <Text style={styles.categoryBadgeText}>Sciences</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="musical-notes" size={20} color="#27AE60" />
                  <Text style={styles.categoryBadgeText}>Music & Arts</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="code-slash" size={20} color="#F39C12" />
                  <Text style={styles.categoryBadgeText}>Programming</Text>
                </View>
                <View style={styles.categoryBadge}>
                  <Ionicons name="fitness" size={20} color="#3498DB" />
                  <Text style={styles.categoryBadgeText}>Sports</Text>
                </View>
              </View>
            </View>

            {/* Features Section */}
            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Why Teachers & Students Love Us</Text>
              <View style={styles.featuresGrid}>
                {renderFeatureCard('checkmark-circle', 'Verified Professionals', 'All practitioners are verified and qualified')}
                {renderFeatureCard('calendar', 'Flexible Booking', 'Schedule sessions at your convenience')}
                {renderFeatureCard('videocam', 'Multiple Formats', 'Online video, phone or in-person sessions')}
                {renderFeatureCard('shield-checkmark', 'Safe & Secure', 'Protected platform with secure payments')}
              </View>
            </View>

            {/* Featured Professionals */}
            {featuredTeachers.length > 0 && (
              <View style={styles.teachersSection}>
                <Text style={styles.sectionTitle}>Meet Our Professionals</Text>
                <Text style={styles.sectionSubtitle}>Connect with experienced social care professionals ready to help</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.teachersScroll}
                >
                  {featuredTeachers.map(teacher => renderTeacherCard(teacher))}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.viewAllButtonText}>Sign in to view all teachers</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}


        </>

        {/* Clear CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaBadge}>
            <Ionicons name="rocket" size={20} color={colors.primary} />
            <Text style={styles.ctaBadgeText}>Get Started</Text>
          </View>
          <Text style={styles.ctaTitle}>Create Your Free Account</Text>
          <Text style={styles.ctaDescription}>
            Join our community and start connecting with teachers or students today
          </Text>
        </View>

        <View style={styles.mainSelection}>
          {/* Role Selection - Only Teacher and Parent/Student */}
          <Text style={styles.selectionPrompt}>I want to sign up as:</Text>
          
          {Object.values(ROLE_CONFIG)
            .filter(role => role.id === ROLE_TYPES.SERVICE_PROVIDER || role.id === ROLE_TYPES.CLIENT)
            .map((roleConfig) => (
            <TouchableOpacity
              key={roleConfig.id}
              style={styles.modernRoleCard}
              onPress={() => handleSignupSelection(roleConfig.id)}
            >
              <View style={[styles.modernRoleIcon, { backgroundColor: roleConfig.colors.primary }]}>
                <Ionicons name={roleConfig.icon} size={32} color="#FFFFFF" />
              </View>
              <View style={styles.modernRoleContent}>
                <Text style={styles.modernRoleTitle}>
                  {roleConfig.id === ROLE_TYPES.SERVICE_PROVIDER ? 'Teacher' : 'Parent/Student'}
                </Text>
                <Text style={styles.modernRoleDescription}>
                  {roleConfig.id === ROLE_TYPES.SERVICE_PROVIDER
                    ? 'Share your expertise and teach students'
                    : 'Find qualified teachers and book sessions'}
                </Text>
              </View>
              <View style={styles.signupArrowContainer}>
                <Text style={[styles.signupArrowText, { color: roleConfig.colors.primary }]}>Sign Up</Text>
                <Ionicons name="arrow-forward" size={20} color={roleConfig.colors.primary} />
              </View>
            </TouchableOpacity>
          ))}
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
    backgroundColor: '#F8F9FD',
  },
  floatingHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.4)',
  },
  headerSignInText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 0.3,
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
  logoWrapper: {
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    opacity: 0.2,
    top: -10,
    left: -10,
  },
  header: {
    alignItems: 'center',
    marginTop: 120,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  mainChoiceCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  mainChoiceGradient: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  mainChoiceIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 0,
  },
  mainChoiceTitleGradient: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mainChoiceDescriptionGradient: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 4,
    opacity: 0.92,
  },
  mainChoiceArrow: {
    marginTop: 4,
    opacity: 0.8,
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
  // New styles for content sections
  heroSection: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    marginHorizontal: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  heroIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  featureCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    width: (width - 48) / 2,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  teachersSection: {
    marginBottom: 24,
  },
  teachersScroll: {
    paddingRight: 16,
  },
  teacherCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
    marginRight: 12,
    width: 150,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  teacherAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightGray || '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  teacherAvatarImage: {
    width: '100%',
    height: '100%',
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  teacherSubject: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  teacherRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teacherRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    justifyContent: 'space-around',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border || '#E0E0E0',
    marginHorizontal: 8,
  },
  // Professional categories
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    justifyContent: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
    elevation: 4,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  // Trust section
  trustSection: {
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  trustTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  trustDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modern Role Cards
  modernRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.1)',
  },
  modernRoleIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modernRoleContent: {
    flex: 1,
  },
  modernRoleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  modernRoleDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  signupArrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signupArrowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // CTA Section
  ctaSection: {
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  ctaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  ctaBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WelcomeScreen;