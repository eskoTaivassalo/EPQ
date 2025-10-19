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
import { useAuth } from '../hooks/useAuth';
import { colors } from '../styles/commonStyles';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import TagSelector from '../components/TagSelector';
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
  getTagLabels
} from '../constants/tags';

const ParentProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    childrenAges: '',
    childrenGrades: [],
    subjectsNeeded: [],
    preferredTeachingStyle: [],
    budget: '',
    priceRange: '',
    location: [],
    learningPreferences: [],
    specialNeeds: [],
    availability: [],
    languages: [],
    goals: '',
    notes: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!db || !user?.uid) return;
    
    try {
      const docRef = doc(db, 'parents', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData({
          childrenAges: data.childrenAges || '',
          childrenGrades: data.childrenGrades || [],
          subjectsNeeded: data.subjectsNeeded || [],
          preferredTeachingStyle: data.preferredTeachingStyle || [],
          budget: data.budget || '',
          priceRange: data.priceRange || '',
          location: data.location || [],
          learningPreferences: data.learningPreferences || [],
          specialNeeds: data.specialNeeds || [],
          availability: data.availability || [],
          languages: data.languages || [],
          goals: data.goals || '',
          notes: data.notes || ''
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

    if (!profileData.childrenAges || !profileData.subjectsNeeded || profileData.subjectsNeeded.length === 0) {
      Alert.alert('Error', 'Please fill in children ages and select subjects needed');
      return;
    }

    setLoading(true);
    try {
      // Get current user data first
      const userDocRef = doc(db, 'parents', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const currentData = userDocSnap.exists() ? userDocSnap.data() : {};

      const updatedData = {
        ...currentData, // Keep existing data like name, email
        ...profileData, // Update with new profile data
        updatedAt: new Date().toISOString(),
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
        <Text style={styles.headerTitle}>Parent Profile</Text>
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
          <Text style={styles.sectionTitle}>Children Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Children Ages *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 8, 12, 15"
              value={profileData.childrenAges}
              onChangeText={(text) => setProfileData({...profileData, childrenAges: text})}
            />
          </View>

          <TagSelector
            title="School Grades/Levels"
            tags={EDUCATION_LEVELS}
            selectedTags={profileData.childrenGrades}
            onTagPress={(tags) => setProfileData({...profileData, childrenGrades: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Subjects Needed Help With *"
            tags={SUBJECTS}
            selectedTags={profileData.subjectsNeeded}
            onTagPress={(tags) => setProfileData({...profileData, subjectsNeeded: tags})}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Preferences</Text>
          
          <TagSelector
            title="Preferred Teaching Styles"
            tags={TEACHING_STYLES}
            selectedTags={profileData.preferredTeachingStyle}
            onTagPress={(tags) => setProfileData({...profileData, preferredTeachingStyle: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Learning Methods"
            tags={TEACHING_METHODS}
            selectedTags={profileData.learningPreferences}
            onTagPress={(tags) => setProfileData({...profileData, learningPreferences: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Special Needs or Learning Difficulties"
            tags={SPECIAL_NEEDS}
            selectedTags={profileData.specialNeeds}
            onTagPress={(tags) => setProfileData({...profileData, specialNeeds: tags})}
            showIcons={true}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Learning Goals</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What do you hope to achieve with tutoring?"
              value={profileData.goals}
              onChangeText={(text) => setProfileData({...profileData, goals: text})}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practical Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Budget per hour (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25"
              value={profileData.budget}
              onChangeText={(text) => setProfileData({...profileData, budget: text})}
              keyboardType="numeric"
            />
          </View>

          <TagSelector
            title="Preferred Price Range"
            tags={PRICE_RANGES}
            selectedTags={[profileData.priceRange]}
            onTagPress={(tag) => setProfileData({...profileData, priceRange: tag})}
            multiSelect={false}
            showIcons={true}
          />

          <TagSelector
            title="Preferred Locations"
            tags={LOCATIONS}
            selectedTags={profileData.location}
            onTagPress={(tags) => setProfileData({...profileData, location: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Preferred Availability"
            tags={AVAILABILITY}
            selectedTags={profileData.availability}
            onTagPress={(tags) => setProfileData({...profileData, availability: tags})}
            showIcons={true}
          />

          <TagSelector
            title="Languages Preferred"
            tags={LANGUAGES}
            selectedTags={profileData.languages}
            onTagPress={(tags) => setProfileData({...profileData, languages: tags})}
            showIcons={true}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any other information that might be helpful for teachers to know..."
              value={profileData.notes}
              onChangeText={(text) => setProfileData({...profileData, notes: text})}
              multiline
              numberOfLines={4}
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

export default ParentProfileScreen;