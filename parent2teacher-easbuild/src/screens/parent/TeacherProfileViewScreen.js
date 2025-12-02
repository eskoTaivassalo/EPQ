import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LANGUAGES,
  TEACHING_METHODS,
  EXPERIENCE_LEVELS,
  AVAILABILITY,
  TEACHING_STYLES,
  CERTIFICATIONS,
  getTagLabels,
} from '../../constants/tags';

export default function TeacherProfileViewScreen({ route, navigation }) {
  const { teacherId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(null);

  useEffect(() => {
    loadTeacherProfile();
  }, [teacherId]);

  const loadTeacherProfile = async () => {
    if (!db || !teacherId) {
      Alert.alert('Error', 'Cannot load teacher profile');
      return;
    }

    try {
      setLoading(true);
      const docRef = doc(db, 'teachers', teacherId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const raw = docSnap.data();
        const nested = raw.profile || {};
        const doubleNested = nested.profile || {};
        // Merge all levels
        const merged = { ...raw, ...nested, ...doubleNested };
        console.log('👨‍🏫 Teacher profile loaded:', Object.keys(merged));
        setTeacherData(merged);
      } else {
        Alert.alert('Error', 'Teacher profile not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading teacher profile:', error);
      Alert.alert('Error', 'Failed to load teacher profile');
    } finally {
      setLoading(false);
    }
  };

  const handleContactTeacher = () => {
    navigation.navigate('Conversations', {
      recipientId: teacherId,
      recipientName: teacherData?.name || teacherData?.fullName || 'Teacher'
    });
  };

  const handleViewSchedule = () => {
    navigation.navigate('TeacherWeeklyAvailability', {
      teacherId: teacherId,
      teacherName: teacherData?.name || teacherData?.fullName || 'Teacher'
    });
  };

  const handleCall = () => {
    if (teacherData?.phone) {
      Linking.openURL(`tel:${teacherData.phone}`);
    } else {
      Alert.alert('No phone number', 'This teacher has not provided a phone number');
    }
  };

  const InfoRow = ({ label, value, icon }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoIconContainer}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>
            {Array.isArray(value) ? value.join(', ') : value}
          </Text>
        </View>
      </View>
    );
  };

  const ProfileSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading teacher profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacherData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Teacher not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Profile</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <ProfileImagePicker
            imageUri={teacherData?.photoURL}
            onImageSelected={() => {}}
            size={100}
            editable={false}
          />
          <Text style={styles.profileName}>
            {teacherData?.name || teacherData?.fullName || 'Teacher'}
          </Text>
          <Text style={styles.profileEmail}>{teacherData?.email}</Text>
          {teacherData?.phone && (
            <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
              <Ionicons name="call-outline" size={16} color={colors.primary} />
              <Text style={styles.phoneText}>{teacherData.phone}</Text>
            </TouchableOpacity>
          )}
          
          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleContactTeacher}
            >
              <Ionicons name="chatbubbles" size={20} color={colors.white} />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleViewSchedule}
            >
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                View Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Teaching Information */}
        <ProfileSection title="Teaching Information">
          <InfoRow
            label="Subjects"
            value={getTagLabels(SUBJECTS, teacherData?.subjects || []).join(', ')}
            icon="book"
          />
          <InfoRow
            label="Education Levels"
            value={getTagLabels(EDUCATION_LEVELS, teacherData?.educationLevels || []).join(', ')}
            icon="school"
          />
          <InfoRow
            label="Experience Level"
            value={getTagLabels(EXPERIENCE_LEVELS, [teacherData?.experienceLevel])[0]}
            icon="ribbon"
          />
          <InfoRow
            label="Years of Experience"
            value={teacherData?.yearsOfExperience?.toString()}
            icon="time"
          />
        </ProfileSection>

        {/* Bio */}
        {teacherData?.bio && (
          <ProfileSection title="About">
            <Text style={styles.bioText}>{teacherData.bio}</Text>
          </ProfileSection>
        )}

        {/* Teaching Details */}
        <ProfileSection title="Teaching Style & Methods">
          <InfoRow
            label="Teaching Methods"
            value={getTagLabels(TEACHING_METHODS, teacherData?.teachingMethods || []).join(', ')}
            icon="bulb"
          />
          <InfoRow
            label="Teaching Styles"
            value={getTagLabels(TEACHING_STYLES, teacherData?.teachingStyles || []).join(', ')}
            icon="color-palette"
          />
        </ProfileSection>

        {/* Qualifications */}
        <ProfileSection title="Qualifications">
          <InfoRow
            label="Certifications"
            value={getTagLabels(CERTIFICATIONS, teacherData?.certifications || []).join(', ')}
            icon="medal"
          />
          <InfoRow
            label="Education"
            value={teacherData?.education}
            icon="school"
          />
        </ProfileSection>

        {/* Practical Information */}
        <ProfileSection title="Practical Information">
          <InfoRow
            label="Languages"
            value={getTagLabels(LANGUAGES, teacherData?.languages || []).join(', ')}
            icon="language"
          />
          <InfoRow
            label="Location"
            value={teacherData?.location || teacherData?.city}
            icon="location"
          />
          <InfoRow
            label="Hourly Rate"
            value={teacherData?.hourlyRate ? `${teacherData.hourlyRate} €/h` : null}
            icon="cash"
          />
        </ProfileSection>

        {/* Rating */}
        {teacherData?.rating && (
          <View style={styles.ratingCard}>
            <Ionicons name="star" size={32} color="#FFD700" />
            <View style={styles.ratingInfo}>
              <Text style={styles.ratingValue}>{teacherData.rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Teacher Rating</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: colors.white,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  phoneText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.primary,
  },
  section: {
    backgroundColor: colors.white,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  sectionContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
    gap: 16,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  ratingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bottomPadding: {
    height: 24,
  },
});
