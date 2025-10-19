import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../styles/commonStyles';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import TagSelector from '../../components/TagSelector';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LOCATIONS,
  LANGUAGES,
  TEACHING_METHODS,
  EXPERIENCE_LEVELS,
  AVAILABILITY,
  TEACHING_STYLES,
  getTagLabels
} from '../../constants/tags';

const TeacherProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    subjects: [],
    educationLevels: [],
    experience: '',
    education: '',
    hourlyRate: '',
    availability: [],
    languages: [],
    location: [],
    teachingMethods: [],
    teachingStyles: [],
    description: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!db || !user?.uid) return;
    
    try {
      const docRef = doc(db, 'teachers', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          subjects: data.subjects || [],
          educationLevels: data.educationLevels || [],
          experience: data.experience || '',
          education: data.education || '',
          hourlyRate: data.hourlyRate || '',
          availability: data.availability || [],
          languages: data.languages || [],
          location: data.location || [],
          teachingMethods: data.teachingMethods || [],
          teachingStyles: data.teachingStyles || [],
          description: data.description || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    if (!db || !user?.uid) {
      Alert.alert('Virhe', 'Kirjaudu sisään ensin');
      return;
    }

    if (!profileData.subjects || profileData.subjects.length === 0 || !profileData.hourlyRate) {
      Alert.alert('Error', 'Please select at least one subject and set your hourly rate');
      return;
    }

    setLoading(true);
    try {
      // Get current user data first
      const userDocRef = doc(db, 'teachers', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};

      const updatedData = {
        ...currentData, // Keep existing data like name, email
        ...profileData, // Update with new profile data
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      await setDoc(userDocRef, updatedData, { merge: true });
      Alert.alert('Success', 'Profile saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
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
        <Text style={styles.headerTitle}>Teacher Profile</Text>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveProfile}
          disabled={loading}
        >
          <Ionicons name="checkmark" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teaching Subjects</Text>
          <TagSelector
            title="Select your teaching subjects *"
            tags={SUBJECTS}
            selectedTags={profileData.subjects}
            onTagPress={(tags) => setProfileData({...profileData, subjects: tags})}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education Levels</Text>
          <TagSelector
            title="Which education levels do you teach?"
            tags={EDUCATION_LEVELS}
            selectedTags={profileData.educationLevels}
            onTagPress={(tags) => setProfileData({...profileData, educationLevels: tags})}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Teaching Methods</Text>
          <TagSelector
            title="Where do you teach?"
            tags={LOCATIONS}
            selectedTags={profileData.location}
            onTagPress={(tags) => setProfileData({...profileData, location: tags})}
            showIcons={true}
          />
          
          <TagSelector
            title="How do you teach?"
            tags={TEACHING_METHODS}
            selectedTags={profileData.teachingMethods}
            onTagPress={(tags) => setProfileData({...profileData, teachingMethods: tags})}
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
              value={profileData.hourlyRate}
              onChangeText={(text) => setProfileData({...profileData, hourlyRate: text})}
              keyboardType="numeric"
            />
          </View>

          <TagSelector
            title="Experience Level"
            tags={EXPERIENCE_LEVELS}
            selectedTags={profileData.experience}
            onTagPress={(tag) => setProfileData({...profileData, experience: tag})}
            multiSelect={false}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages & Teaching Style</Text>
          
          <TagSelector
            title="Languages you speak"
            tags={LANGUAGES}
            selectedTags={profileData.languages}
            onTagPress={(tags) => setProfileData({...profileData, languages: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Your teaching style"
            tags={TEACHING_STYLES}
            selectedTags={profileData.teachingStyles}
            onTagPress={(tags) => setProfileData({...profileData, teachingStyles: tags})}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability & Education</Text>
          
          <TagSelector
            title="When are you available?"
            tags={AVAILABILITY}
            selectedTags={profileData.availability}
            onTagPress={(tags) => setProfileData({...profileData, availability: tags})}
            showIcons={true}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Education & Qualifications</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Master of Mathematics, University of Helsinki"
              value={profileData.education}
              onChangeText={(text) => setProfileData({...profileData, education: text})}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Describe yourself as a teacher</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell about your teaching style, strengths, and why you should be chosen as a teacher..."
              value={profileData.description}
              onChangeText={(text) => setProfileData({...profileData, description: text})}
              multiline
              numberOfLines={5}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.saveProfileButton}
          onPress={saveProfile}
          disabled={loading}
        >
          <Text style={styles.saveProfileButtonText}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Text>
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
  saveButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  inputGroup: {
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
  saveProfileButton: {
    backgroundColor: colors.secondary,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  saveProfileButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TeacherProfileScreen;