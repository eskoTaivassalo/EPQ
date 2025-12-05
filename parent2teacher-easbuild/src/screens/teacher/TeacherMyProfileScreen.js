import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useAuth } from '../../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../styles/commonStyles';
import TagSelector from '../../components/TagSelector';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import { AuthService } from '../../services/authService';
import imagePickerService from '../../services/imagePickerService';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ensurePermissionAndCoords } from '../../services/locationService';
import { db, auth } from '../../config/firebaseConfig';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LANGUAGES,
  TEACHING_METHODS,
  EXPERIENCE_LEVELS,
  AVAILABILITY,
  TEACHING_STYLES,
  SPECIALIZATIONS,
  ACADEMIC_INTERESTS,
  CLIENT_FOCUS,
  CERTIFICATION_COUNTRIES,
  GRADE_RANGES,
  getTagLabels,
} from '../../constants/tags';

const TeacherMyProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || 'Teacher',
    email: user?.email || '',
    phone: '',
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
    photoURL: user?.photoURL || null,
  // Geolocation
  geoLocation: null, // { latitude, longitude, accuracy?, timestamp? }
    // NEW FIELDS - Professional Qualifications
    professionalType: 'teacher', // 'teacher', 'therapist', 'social_worker'
    certifications: [], // Array of {country, state, type, year}
    specializations: [], // Array of specialization IDs
    degrees: [], // Array of {degree, field, year, institution}
    experienceYears: '', // Numeric value
    // NEW FIELDS - Academic & Teaching
    academicInterests: [], // Array of academic interest IDs
    teachingApproach: '', // Long text field
    clientFocus: [], // Array of client focus IDs
    // NEW FIELDS - Professional Portfolio
    publications: [], // Array of {title, type, year, url}
    researchAreas: [], // Array of research area strings
  });
  // Raw text inputs for structured fields to avoid auto-formatting while typing
  const [degreesInput, setDegreesInput] = useState('');
  const [certificationsInput, setCertificationsInput] = useState('');
  const [publicationsInput, setPublicationsInput] = useState('');
  const [researchAreasInput, setResearchAreasInput] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);

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
          let data = null;
          if (docSnap.exists()) {
            data = docSnap.data();
            console.log('🟢 TeacherMyProfileScreen: Firestore teacher doc loaded', Object.keys(data));
            if (data.profile) {
              console.log('🟢 TeacherMyProfileScreen: Nested profile keys', Object.keys(data.profile));
            } else {
              console.warn('⚠️ TeacherMyProfileScreen: No nested profile object found');
            }
            setProfileData(prev => ({
              ...prev,
              // Top-level fields
              ...data,
              // Merge nested profile fields if present (these hold actual form values)
              ...(data.profile || {}),
              name: data?.name ?? prev.name,
              email: data?.email || data?.profile?.email || prev.email,
              phone: data?.phone || data?.phoneNumber || data?.profile?.phoneNumber || prev.phone,
              specialization: data?.specialization || data?.profile?.specialization || prev.specialization,
              qualifications: data?.qualifications || data?.profile?.qualifications || prev.qualifications,
              experience: data?.experience || data?.profile?.experience || prev.experience,
              photoURL: data?.photoURL || prev.photoURL,
              geoLocation: data?.geoLocation || data?.profile?.geoLocation || prev.geoLocation || null,
            }));
            setProfileImageUri(data?.photoURL || null);
          }
            // Initialize raw inputs from loaded structured data
            const loadedDegrees = data?.degrees || data?.profile?.degrees || [];
            setDegreesInput(
              Array.isArray(loadedDegrees)
                ? loadedDegrees
                    .map(d => `${d.degree || ''} | ${d.field || ''} | ${d.year || ''} | ${d.institution || ''}`.trim())
                    .join('\n')
                : ''
            );
            const loadedCerts = data?.certifications || data?.profile?.certifications || [];
            setCertificationsInput(
              Array.isArray(loadedCerts)
                ? loadedCerts
                    .map(c => `${c.type || ''} | ${c.country || ''} | ${c.state || ''} | ${c.year || ''}`.trim())
                    .join('\n')
                : ''
            );
            const loadedPubs = data?.publications || data?.profile?.publications || [];
            setPublicationsInput(
              Array.isArray(loadedPubs)
                ? loadedPubs
                    .map(p => `${p.title || ''} | ${p.type || ''} | ${p.year || ''} | ${p.url || ''}`.trim())
                    .join('\n')
                : ''
            );
            const loadedRes = data?.researchAreas || data?.profile?.researchAreas || [];
            setResearchAreasInput(Array.isArray(loadedRes) ? loadedRes.join('\n') : '');
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

  const handleImageSelected = async (uri) => {
    if (!uri) {
      // Kuva poistettu
      setProfileImageUri(null);
      return;
    }

    try {
      console.log('📤 Uploading profile image to Storage...');
      
      // Lataa kuva Firebase Storageen
      const downloadURL = await imagePickerService.uploadImage(uri, user.uid, 'profile.jpg');
      
      if (downloadURL) {
        console.log('✅ Image uploaded successfully:', downloadURL);
        setProfileImageUri(downloadURL);
        
        // Tallenna heti Firestoreen
        await setDoc(doc(db, 'teachers', user.uid), {
          photoURL: downloadURL
        }, { merge: true });
        
        Alert.alert('Onnistui', 'Profiilikuva tallennettu');
      } else {
        Alert.alert('Virhe', 'Kuvan lataaminen epäonnistui');
      }
    } catch (error) {
      console.error('❌ Error handling image:', error);
      Alert.alert('Virhe', 'Kuvan käsittely epäonnistui');
    }
  };

  const saveProfile = async () => {
    if (!db || !user?.uid) {
      Alert.alert('Virhe', 'Kirjaudu sisään ensin');
      return;
    }
    if (!profileData?.subjects?.length || !profileData?.hourlyRate) {
      Alert.alert('Error', 'Please select at least one subject and set your hourly rate');
      return;
    }


    // Parse raw text inputs into structured arrays right before saving
    const parsedDegrees = (degreesInput || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          degree: parts[0] || '',
          field: parts[1] || '',
          year: parts[2] || '',
          institution: parts[3] || ''
        };
      });

    const parsedCertifications = (certificationsInput || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          type: parts[0] || '',
          country: parts[1] || '',
          state: parts[2] || '',
          year: parts[3] || ''
        };
      });

    const parsedPublications = (publicationsInput || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
          title: parts[0] || '',
          type: parts[1] || '',
          year: parts[2] || '',
          url: parts[3] || ''
        };
      });

    const parsedResearchAreas = (researchAreasInput || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const userDocRef = doc(db, 'teachers', user.uid);
      
      // Build the update payload with proper structure
      // Save to both root level AND nested profile for compatibility
      const updatePayload = {
        // Root-level fields for easy access
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        subjects: profileData.subjects,
        teachingMethods: profileData.teachingMethods,
        languages: profileData.languages,
        availability: profileData.availability,
        teachingStyles: profileData.teachingStyles,
        location: profileData.location,
        hourlyRate: profileData.hourlyRate,
        experience: profileData.experience,
        education: profileData.education,
        description: profileData.description,
        // New professional profile fields (root)
        professionalType: profileData.professionalType,
        certifications: parsedCertifications,
        specializations: profileData.specializations,
        degrees: parsedDegrees,
        experienceYears: profileData.experienceYears,
        academicInterests: profileData.academicInterests,
        teachingApproach: profileData.teachingApproach,
        clientFocus: profileData.clientFocus,
        publications: parsedPublications,
        researchAreas: parsedResearchAreas,
  isActive: true,
        updatedAt: new Date().toISOString(),
  geoLocation: profileData.geoLocation || null,
        // Keep nested profile structure for backward compatibility
        profile: {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          phoneNumber: profileData.phone,
          subjects: profileData.subjects,
          teachingMethods: profileData.teachingMethods,
          languages: profileData.languages,
          availability: profileData.availability,
          teachingStyles: profileData.teachingStyles,
          location: profileData.location,
          hourlyRate: profileData.hourlyRate,
          experience: profileData.experience,
          education: profileData.education,
          description: profileData.description,
          geoLocation: profileData.geoLocation || null,
          // New professional profile fields (nested)
          professionalType: profileData.professionalType,
          certifications: parsedCertifications,
          specializations: profileData.specializations,
          degrees: parsedDegrees,
          experienceYears: profileData.experienceYears,
          academicInterests: profileData.academicInterests,
          teachingApproach: profileData.teachingApproach,
          clientFocus: profileData.clientFocus,
          publications: parsedPublications,
          researchAreas: parsedResearchAreas,
        }
      };

      // 📸 Päivitä profiilikuva jos muutettu
      if (profileImageUri && profileImageUri !== profileData.photoURL) {
        try {
          console.log('📸 Updating profile image...');
          const photoURL = await AuthService.updateProfileImage(profileImageUri, user.uid, 'teacher');
          updatePayload.photoURL = photoURL;
          console.log('✅ Profile image updated');
        } catch (imageError) {
          console.error('❌ Error updating profile image:', imageError);
          Alert.alert('Huomio', 'Profiilikuvan päivitys epäonnistui, mutta muut tiedot tallennettiin.');
        }
      }

      console.log('💾 Saving teacher profile with fields:', Object.keys(updatePayload));
      await setDoc(userDocRef, updatePayload, { merge: true });
      console.log('✅ Teacher profile saved successfully');
      
      // Reload profile data from Firestore to reflect changes
      const reloadedDoc = await getDoc(userDocRef);
      if (reloadedDoc.exists()) {
        const data = reloadedDoc.data();
        setProfileData(prev => ({
          ...prev,
          ...data,
          ...(data.profile || {}),
          name: data?.name ?? prev.name,
          email: data?.email || data?.profile?.email || prev.email,
          phone: data?.phone || data?.phoneNumber || data?.profile?.phoneNumber || prev.phone,
        }));
      }
      
      Alert.alert('Success', 'Profile saved successfully!');
      setIsEditing(false);
    } catch (e) {
      console.error('❌ Error saving teacher profile:', e);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // When entering edit mode, try to fetch current coords once
  useEffect(() => {
    let cancelled = false;
    const fetchCoords = async () => {
      if (!isEditing) return;
      try {
        const { perm, coords } = await ensurePermissionAndCoords();
        if (!cancelled && coords) {
          setProfileData(prev => ({ ...prev, geoLocation: coords }));
        }
      } catch (e) {
        console.warn('📍 Could not auto-fetch location in profile edit:', e);
      }
    };
    fetchCoords();
    return () => { cancelled = true; };
  }, [isEditing]);

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
      <WatercolorBackground />
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {isEditing && (
          <ProfileImagePicker
            imageUri={profileImageUri || profileData.photoURL}
            onImageSelected={handleImageSelected}
            size={120}
            editable={true}
          />
        )}

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
              <Text style={styles.sectionTitle}>Teaching Methods</Text>
              <TagSelector
                title="How do you teach?"
                tags={TEACHING_METHODS}
                selectedTags={profileData?.teachingMethods || []}
                onTagPress={(tags) => setProfileData({ ...profileData, teachingMethods: tags })}
                showIcons={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. +358 40 1234567"
                  value={profileData?.phone ?? ''}
                  onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
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

            {/* NEW SECTION: Professional Qualifications */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Qualifications</Text>
              
              <TagSelector
                title="Specializations"
                tags={SPECIALIZATIONS}
                selectedTags={profileData?.specializations || []}
                onTagPress={(tags) => setProfileData({ ...profileData, specializations: tags })}
                showIcons={true}
              />


              <View style={styles.inputGroup}>
                <Text style={styles.label}>Degrees (one per line: Degree | Field | Year)</Text>
                <Text style={styles.helperText}>Example: Master of Education | Mathematics | 2015</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Master of Education | Mathematics Education | 2015"
                  value={degreesInput}
                  onChangeText={setDegreesInput}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Certifications (one per line: Type | Country | State | Year)</Text>
                <Text style={styles.helperText}>Example: Secondary Certification | USA | Texas | 2018</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Secondary Certification | USA | Texas | 2018"
                  value={certificationsInput}
                  onChangeText={setCertificationsInput}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* NEW SECTION: Teaching Approach & Focus */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Teaching Approach & Focus</Text>

              <TagSelector
                title="Client Focus - Who do you work with?"
                tags={CLIENT_FOCUS}
                selectedTags={profileData?.clientFocus || []}
                onTagPress={(tags) => setProfileData({ ...profileData, clientFocus: tags })}
                showIcons={true}
              />

              <TagSelector
                title="Academic Interests"
                tags={ACADEMIC_INTERESTS}
                selectedTags={profileData?.academicInterests || []}
                onTagPress={(tags) => setProfileData({ ...profileData, academicInterests: tags })}
                showIcons={true}
              />

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teaching Philosophy / Approach</Text>
                <Text style={styles.helperText}>Describe your teaching philosophy and instructional style</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="I believe in student-centered learning where..."
                  value={profileData?.teachingApproach ?? ''}
                  onChangeText={(text) => setProfileData({ ...profileData, teachingApproach: text })}
                  multiline
                  numberOfLines={6}
                />
              </View>
            </View>

            {/* NEW SECTION: Publications & Research (Optional) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Publications & Research (Optional)</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Publications (one per line: Title | Type | Year | URL)</Text>
                <Text style={styles.helperText}>Example: Effective Reading Strategies | journal_article | 2022 | https://...</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Effective Reading Strategies | journal_article | 2022 | https://..."
                  value={publicationsInput}
                  onChangeText={setPublicationsInput}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Research Areas (one per line)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. reading intervention\ndyslexia\nliteracy"
                  value={researchAreasInput}
                  onChangeText={setResearchAreasInput}
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
              <ProfileImagePicker
                imageUri={profileData?.photoURL}
                onImageSelected={() => {}}
                size={100}
                editable={false}
              />
              <Text style={styles.profileName}>{profileData?.name || user?.name || 'Teacher'}</Text>
              <Text style={styles.profileEmail}>{auth?.currentUser?.email || profileData?.email || user?.email}</Text>
              {profileData?.phone && (
                <Text style={styles.profilePhone}>{profileData.phone}</Text>
              )}
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
              {/* Location field removed; we now use device geoLocation automatically */}
            </ProfileSection>

            <ProfileSection title="Professional Qualifications">
              <InfoRow 
                label="Specializations" 
                value={getTagLabels(SPECIALIZATIONS, profileData?.specializations || []).join(', ')} 
                icon="medal" 
              />
       
              <InfoRow 
                label="Education" 
                value={profileData?.education} 
                icon="library" 
              />
              {profileData?.degrees && profileData.degrees.length > 0 && (
                <View style={styles.subsectionContainer}>
                  <Text style={styles.subsectionLabel}>Degrees:</Text>
                  {profileData.degrees.map((degree, index) => (
                    <Text key={index} style={styles.degreeText}>
                      • {degree.degree} in {degree.field} ({degree.year})
                    </Text>
                  ))}
                </View>
              )}
              {profileData?.certifications && profileData.certifications.length > 0 && (
                <View style={styles.subsectionContainer}>
                  <Text style={styles.subsectionLabel}>Certifications:</Text>
                  {profileData.certifications.map((cert, index) => (
                    <Text key={index} style={styles.degreeText}>
                      • {cert.type} - {cert.country}{cert.state ? `, ${cert.state}` : ''} ({cert.year})
                    </Text>
                  ))}
                </View>
              )}
              <InfoRow 
                label="Languages" 
                value={getTagLabels(LANGUAGES, profileData?.languages || []).join(', ')} 
                icon="language" 
              />
            </ProfileSection>

            <ProfileSection title="Teaching Approach & Focus">
              <InfoRow 
                label="Client Focus" 
                value={getTagLabels(CLIENT_FOCUS, profileData?.clientFocus || []).join(', ')} 
                icon="people" 
              />
              <InfoRow 
                label="Academic Interests" 
                value={getTagLabels(ACADEMIC_INTERESTS, profileData?.academicInterests || []).join(', ')} 
                icon="book" 
              />
              <InfoRow 
                label="Teaching Styles" 
                value={getTagLabels(TEACHING_STYLES, profileData?.teachingStyles || []).join(', ')} 
                icon="bulb" 
              />
              {profileData?.teachingApproach && (
                <View style={styles.subsectionContainer}>
                  <Text style={styles.subsectionLabel}>Teaching Philosophy:</Text>
                  <Text style={styles.approachText}>{profileData.teachingApproach}</Text>
                </View>
              )}
            </ProfileSection>

            {profileData?.publications && profileData.publications.length > 0 && (
              <ProfileSection title="Publications & Research">
                {profileData.publications.map((pub, index) => (
                  <View key={index} style={styles.publicationItem}>
                    <Text style={styles.publicationTitle}>{pub.title}</Text>
                    <Text style={styles.publicationMeta}>{pub.type} • {pub.year}</Text>
                    {pub.url && <Text style={styles.publicationUrl}>{pub.url}</Text>}
                  </View>
                ))}
              </ProfileSection>
            )}

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
      </KeyboardAvoidingView>
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
  profilePhone: {
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
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  subsectionContainer: {
    marginTop: 12,
    marginBottom: 8,
    paddingLeft: 10,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  degreeText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    paddingLeft: 8,
  },
  approachText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    paddingLeft: 8,
  },
  publicationItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  publicationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  publicationMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  publicationUrl: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
  },
});

export default TeacherMyProfileScreen;