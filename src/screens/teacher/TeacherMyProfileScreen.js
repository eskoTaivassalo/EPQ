import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../styles/commonStyles';
import TagSelector from '../../components/TagSelector';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
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
} from '../../constants/tags';

const TeacherMyProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Teacher',
    email: user?.email || '',
    subjects: [],
    educationLevels: [],
    hourlyRate: '',
    experience: '',
    location: [],
    languages: [],
    teachingMethods: [],
    teachingStyles: [],
    availability: [],
    education: '',
    description: '',
  });

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (!db || !user?.uid) {
          setLoading(false);
          return;
        }
        try {
          setLoading(true);
          const docRef = doc(db, 'teachers', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileData(prev => ({
              ...prev,
              ...data,
              name: data?.name ?? prev.name,
              email: data?.email ?? prev.email,
            }));
          }
        } catch (e) {
          console.error('Error loading profile:', e);
          Alert.alert('Error', 'Failed to load profile');
        } finally {
          setLoading(false);
        }
      };
      run();
    }, [user?.uid])
  );

  const saveProfile = async () => {
    if (!db || !user?.uid) {
      Alert.alert('Virhe', 'Kirjaudu sisään ensin');
      return;
    }
    if (!profileData?.subjects?.length || !profileData?.hourlyRate) {
      Alert.alert('Error', 'Please select at least one subject and set your hourly rate');
      return;
    }
    setLoading(true);
    try {
      const userDocRef = doc(db, 'teachers', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};
      const updatedData = {
        ...currentData,
        ...profileData,
        updatedAt: new Date().toISOString(),
        isActive: true,
      };
      await setDoc(userDocRef, updatedData, { merge: true });
      Alert.alert('Success', 'Profile saved successfully!');
      setIsEditing(false);
    } catch (e) {
      console.error('Error saving profile:', e);
      Alert.alert('Error', 'Failed to save profile');
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
          onPress={() => (isEditing ? setIsEditing(false) : navigation.goBack())}
        >
          <Ionicons name={isEditing ? 'close' : 'arrow-back'} size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => (isEditing ? saveProfile() : setIsEditing(true))}
          disabled={loading}
        >
          <Ionicons name={isEditing ? 'checkmark' : 'create'} size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isEditing ? (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teaching Subjects</Text>
              <TagSelector
                title="Select your teaching subjects *"
                tags={SUBJECTS}
                selectedTags={profileData?.subjects || []}
                onTagPress={(tags) => setProfileData({ ...profileData, subjects: tags })}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Education Levels</Text>
              <TagSelector
                title="Which education levels do you teach?"
                tags={EDUCATION_LEVELS}
                selectedTags={profileData?.educationLevels || []}
                onTagPress={(tags) => setProfileData({ ...profileData, educationLevels: tags })}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location & Teaching Methods</Text>
              <TagSelector
                title="Where do you teach?"
                tags={LOCATIONS}
                selectedTags={profileData?.location || []}
                onTagPress={(tags) => setProfileData({ ...profileData, location: tags })}
                showIcons={true}
              />
              <TagSelector
                title="How do you teach?"
                tags={TEACHING_METHODS}
                selectedTags={profileData?.teachingMethods || []}
                onTagPress={(tags) => setProfileData({ ...profileData, teachingMethods: tags })}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing & Experience</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Hourly Rate (€) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 25"
                  value={profileData?.hourlyRate ?? ''}
                  onChangeText={(text) => setProfileData({ ...profileData, hourlyRate: text })}
                  keyboardType="numeric"
                />
              </View>
              <TagSelector
                title="Experience Level"
                tags={EXPERIENCE_LEVELS}
                selectedTags={profileData?.experience || ''}
                onTagPress={(tag) => setProfileData({ ...profileData, experience: tag })}
                multiSelect={false}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages & Teaching Style</Text>
              <TagSelector
                title="Languages you speak"
                tags={LANGUAGES}
                selectedTags={profileData?.languages || []}
                onTagPress={(tags) => setProfileData({ ...profileData, languages: tags })}
                showIcons={true}
              />
              <TagSelector
                title="Your teaching style"
                tags={TEACHING_STYLES}
                selectedTags={profileData?.teachingStyles || []}
                onTagPress={(tags) => setProfileData({ ...profileData, teachingStyles: tags })}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability & Education</Text>
              <TagSelector
                title="When are you available?"
                tags={AVAILABILITY}
                selectedTags={profileData?.availability || []}
                onTagPress={(tags) => setProfileData({ ...profileData, availability: tags })}
                showIcons={true}
              />
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Education & Qualifications</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Master of Mathematics, University of Helsinki"
                  value={profileData?.education ?? ''}
                  onChangeText={(text) => setProfileData({ ...profileData, education: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={{ height: 20 }} />
          </>
        ) : (
          <>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={60} color={colors.white} />
              </View>
              <Text style={styles.profileName}>{profileData?.name || user?.name || 'Teacher'}</Text>
              <Text style={styles.profileEmail}>{profileData?.email || user?.email}</Text>
              <Text style={styles.profileType}>Teacher</Text>
            </View>

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

            <ProfileSection title="Teaching Methods">
              <View style={styles.teachingMethods}>
                {getTagLabels(TEACHING_METHODS, profileData?.teachingMethods || []).map((method, index) => (
                  <View key={index} style={styles.methodBadge}>
                    <Text style={styles.methodText}>{method}</Text>
                  </View>
                ))}
              </View>
            </ProfileSection>

            <ProfileSection title="Availability">
              <View style={styles.teachingMethods}>
                {getTagLabels(AVAILABILITY, profileData?.availability || []).map((time, index) => (
                  <View key={index} style={styles.methodBadge}>
                    <Text style={styles.methodText}>{time}</Text>
                  </View>
                ))}
              </View>
            </ProfileSection>

            {profileData?.description && (
              <ProfileSection title="About Me">
                <Text style={styles.descriptionText}>{profileData.description}</Text>
              </ProfileSection>
            )}

            <TouchableOpacity 
              style={styles.editProfileButton}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create" size={20} color={colors.white} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
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
  inputGroup: {
    marginTop: 8,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});

export default TeacherMyProfileScreen;