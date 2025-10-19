import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../styles/commonStyles';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LOCATIONS,
  LANGUAGES,
  TEACHING_METHODS,
  EXPERIENCE_LEVELS,
  AVAILABILITY,
  TEACHING_STYLES,
  getTagLabels,
  getTagById
} from '../constants/tags';

const TeacherMyProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    if (!db || !user?.uid) return;
    
    try {
      setLoading(true);
      const docRef = doc(db, 'teachers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setProfileData(docSnap.data());
      } else {
        // If no profile data exists, show basic user info
        setProfileData({
          name: user.name || 'Teacher',
          email: user.email || '',
          subjects: '',
          hourlyRate: '',
          location: '',
          description: ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const ProfileSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const InfoRow = ({ label, value, icon }) => (
    <View style={styles.infoRow}>
      {icon && <Ionicons name={icon} size={20} color={colors.primary} style={styles.infoIcon} />}
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('TeacherProfile')}
        >
          <Ionicons name="create" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={60} color={colors.white} />
          </View>
          <Text style={styles.profileName}>{profileData?.name || user?.name || 'Teacher'}</Text>
          <Text style={styles.profileEmail}>{profileData?.email || user?.email}</Text>
          <Text style={styles.profileType}>Teacher</Text>
        </View>

        {/* Teaching Information */}
        <ProfileSection title="Teaching Information">
          <InfoRow 
            label="Subjects" 
            value={getTagLabels(SUBJECTS, profileData?.subjects || []).join(', ')} 
            icon="school" 
          />
          <InfoRow 
            label="Education Levels" 
            value={getTagLabels(EDUCATION_LEVELS, profileData?.educationLevels || []).join(', ')} 
            icon="library" 
          />
          <InfoRow 
            label="Hourly Rate" 
            value={profileData?.hourlyRate ? `€${profileData.hourlyRate}/hour` : null} 
            icon="card" 
          />
          <InfoRow 
            label="Experience Level" 
            value={getTagLabels(EXPERIENCE_LEVELS, [profileData?.experience]).join('')} 
            icon="time" 
          />
          <InfoRow 
            label="Location" 
            value={getTagLabels(LOCATIONS, profileData?.location || []).join(', ')} 
            icon="location" 
          />
        </ProfileSection>

        {/* Education and Languages */}
        <ProfileSection title="Qualifications">
          <InfoRow 
            label="Education" 
            value={profileData?.education} 
            icon="library" 
          />
          <InfoRow 
            label="Languages" 
            value={getTagLabels(LANGUAGES, profileData?.languages || []).join(', ')} 
            icon="language" 
          />
          <InfoRow 
            label="Teaching Styles" 
            value={getTagLabels(TEACHING_STYLES, profileData?.teachingStyles || []).join(', ')} 
            icon="bulb" 
          />
        </ProfileSection>

        {/* Teaching Methods */}
        <ProfileSection title="Teaching Methods">
          <View style={styles.teachingMethods}>
            {getTagLabels(TEACHING_METHODS, profileData?.teachingMethods || []).map((method, index) => (
              <View key={index} style={styles.methodBadge}>
                <Text style={styles.methodText}>{method}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>

        {/* Availability */}
        <ProfileSection title="Availability">
          <View style={styles.teachingMethods}>
            {getTagLabels(AVAILABILITY, profileData?.availability || []).map((time, index) => (
              <View key={index} style={styles.methodBadge}>
                <Text style={styles.methodText}>{time}</Text>
              </View>
            ))}
          </View>
        </ProfileSection>

        {/* Description */}
        {profileData?.description && (
          <ProfileSection title="About Me">
            <Text style={styles.descriptionText}>{profileData.description}</Text>
          </ProfileSection>
        )}

        {/* Edit Profile Button */}
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => navigation.navigate('TeacherProfile')}
        >
          <Ionicons name="create" size={20} color={colors.white} />
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text,
  },
  profileHeader: {
    backgroundColor: colors.white,
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  profileType: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    backgroundColor: colors.white,
    marginVertical: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  teachingMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  methodBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodText: {
    marginLeft: 6,
    fontSize: 14,
    color: colors.text,
  },
  methodTextActive: {
    color: colors.white,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  editProfileButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 10,
    margin: 20,
  },
  editProfileButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TeacherMyProfileScreen;