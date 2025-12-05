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
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import FeedbackModal from '../../components/FeedbackModal';
import { listFeedbackForUser } from '../../services/feedbackService';
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
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);

  useEffect(() => {
    loadTeacherProfile();
    loadTeacherFeedback();
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

  const openFeedbackModal = () => {
    setFeedbackModalVisible(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalVisible(false);
    // Reload feedback after submitting
    loadTeacherFeedback();
  };

  const loadTeacherFeedback = async () => {
    if (!teacherId) return;
    
    try {
      setFeedbacksLoading(true);
      const feedbackList = await listFeedbackForUser(teacherId);
      
      // Enrich with parent names
      const enrichedFeedbacks = await Promise.all(
        feedbackList.map(async (fb) => {
          try {
            const parentDoc = await getDoc(doc(db, 'parents', fb.fromUserId));
            const parentName = parentDoc.exists() 
              ? (parentDoc.data().name || parentDoc.data().fullName || 'Anonymous')
              : 'Anonymous';
            return { ...fb, fromUserName: parentName };
          } catch (err) {
            return { ...fb, fromUserName: 'Anonymous' };
          }
        })
      );
      
      setFeedbacks(enrichedFeedbacks);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  const calculateAverageRating = () => {
    const ratingsOnly = feedbacks.filter(fb => fb.rating && fb.rating > 0);
    if (ratingsOnly.length === 0) return 0;
    const sum = ratingsOnly.reduce((acc, fb) => acc + fb.rating, 0);
    return (sum / ratingsOnly.length).toFixed(1);
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
      <WatercolorBackground />
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
            <TouchableOpacity
              style={[styles.actionButton, styles.feedbackButton]}
              onPress={openFeedbackModal}
            >
              <Ionicons name="star" size={20} color={colors.primary} />
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                Give Feedback
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ratings & Reviews */}
        <ProfileSection title="Ratings & Reviews">
          <View style={styles.ratingSummary}>
            <View style={styles.ratingAverageContainer}>
              <Text style={styles.ratingNumber}>{calculateAverageRating()}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.round(calculateAverageRating()) ? 'star' : 'star-outline'}
                    size={20}
                    color="#FFD700"
                  />
                ))}
              </View>
              <Text style={styles.ratingCount}>
                {feedbacks.length} {feedbacks.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>
          </View>

          {feedbacksLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading reviews...</Text>
            </View>
          ) : feedbacks.length === 0 ? (
            <View style={styles.emptyFeedback}>
              <Ionicons name="chatbox-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyFeedbackText}>No reviews yet</Text>
              <Text style={styles.emptyFeedbackSubtext}>
                Be the first to review this teacher!
              </Text>
            </View>
          ) : (
            <View style={styles.feedbackList}>
              {feedbacks.slice(0, 5).map((feedback, index) => (
                <View key={feedback.id || index} style={styles.feedbackItem}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackAuthor}>
                      <Ionicons name="person-circle" size={32} color={colors.primary} />
                      <View style={styles.feedbackAuthorInfo}>
                        <Text style={styles.feedbackAuthorName}>
                          {feedback.fromUserName || 'Anonymous'}
                        </Text>
                        <Text style={styles.feedbackDate}>
                          {feedback.createdAt?.toDate 
                            ? new Date(feedback.createdAt.toDate()).toLocaleDateString()
                            : 'Recently'}
                        </Text>
                      </View>
                    </View>
                    {feedback.rating > 0 && (
                      <View style={styles.feedbackRating}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.feedbackRatingText}>{feedback.rating}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.feedbackText}>{feedback.feedbackText}</Text>
                </View>
              ))}
              
              {feedbacks.length > 5 && (
                <Text style={styles.moreReviews}>
                  +{feedbacks.length - 5} more reviews
                </Text>
              )}
            </View>
          )}
        </ProfileSection>

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

      {/* Feedback Modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={closeFeedbackModal}
        parentId={user?.uid}
        parentName={user?.displayName || user?.name || 'You'}
        teacherId={teacherId}
        teacherName={teacherData?.name || teacherData?.fullName || 'Teacher'}
        roleFrom="parent"
        roleTo="teacher"
      />
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
    flexWrap: 'wrap',
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
  feedbackButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FFB300',
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
  ratingSummary: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    marginBottom: 16,
  },
  ratingAverageContainer: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyFeedback: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyFeedbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyFeedbackSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  feedbackList: {
    gap: 16,
  },
  feedbackItem: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  feedbackAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackAuthorInfo: {
    gap: 2,
  },
  feedbackAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  feedbackDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  feedbackRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  feedbackRatingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB300',
  },
  feedbackText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  moreReviews: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomPadding: {
    height: 24,
  },
});
