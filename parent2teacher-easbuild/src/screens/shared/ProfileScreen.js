import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';
import WatercolorBackground from '../../components/WatercolorBackground';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import TagSelector from '../../components/TagSelector';
import imagePickerService from '../../services/imagePickerService';
import { colors, commonStyles } from '../../styles/commonStyles';
import { SUBJECTS, LANGUAGES, TEACHING_METHODS, AVAILABILITY } from '../../constants/tags';
import { ROLE_CONFIG, ROLE_TYPES, getRoleColors, getCanonicalRole } from '../../config/roleConfig';

/**
 * Yhteinen profiilinäkymä kaikille rooleille
 * Renderöidään rooliperusteisesti:
 * - Provider (teacher/coach): näyttää palvelut, hinnat, kokemuksen, kuvauksen
 * - Client (parent/athlete): näyttää perustiedot ja tarpeet
 */
const ProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const hasLoadedRef = useRef(false);

  // Määritä käyttäjän rooli
  const userRole = user?.userType || user?.role || 'client';
  const isProvider = userRole === 'teacher' || userRole === 'coach';
  const canonicalRole = getCanonicalRole(userRole);
  const roleColors = getRoleColors(canonicalRole);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current) {
        loadProfile();
      }
    }, [user?.uid])
  );

  const loadProfile = async () => {
    if (!db || !user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { serviceType, collection: collectionName } = getRoleCollectionInfo(userRole);
      const docRef = doc(db, 'serviceTypes', serviceType, collectionName, user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Yhdistä nested profile data jos olemassa
        const merged = {
          ...data,
          ...(data.profile || {}),
          // Varmista että array-kentät ovat arrayjä
          subjects: Array.isArray(data.subjects) 
            ? data.subjects 
            : Array.isArray(data.profile?.subjects) 
              ? data.profile.subjects 
              : [],
          languages: Array.isArray(data.languages) 
            ? data.languages 
            : Array.isArray(data.profile?.languages) 
              ? data.profile.languages 
              : [],
          teachingMethods: Array.isArray(data.teachingMethods) 
            ? data.teachingMethods 
            : Array.isArray(data.profile?.teachingMethods) 
              ? data.profile.teachingMethods 
              : [],
          availability: Array.isArray(data.availability) 
            ? data.availability 
            : Array.isArray(data.profile?.availability) 
              ? data.profile.availability 
              : [],
          needs: Array.isArray(data.needs) 
            ? data.needs 
            : Array.isArray(data.profile?.needs) 
              ? data.profile.needs 
              : [],
        };
        
        setProfileData(merged);
      } else {
        // Uusi käyttäjä, aseta oletustiedot
        const defaultData = {
          name: user.name || user.displayName || '',
          email: user.email || '',
          phone: user.phoneNumber || '',
          photoURL: user.photoURL || null,
        };
        
        if (isProvider) {
          defaultData.subjects = [];
          defaultData.languages = [];
          defaultData.teachingMethods = [];
          defaultData.availability = [];
          defaultData.hourlyRate = '';
          defaultData.experience = '';
          defaultData.description = '';
        } else {
          // Client-specific fields
          defaultData.needs = [];
          defaultData.preferences = '';
        }
        
        setProfileData(defaultData);
      }
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Virhe', 'Profiilin lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!db || !user?.uid) {
      Alert.alert('Virhe', 'Kirjaudu sisään ensin');
      return;
    }

    // Validointi
    if (!profileData.name?.trim()) {
      Alert.alert('Virhe', 'Nimi on pakollinen');
      return;
    }
    
    // Validointi provider-käyttäjille
    if (isProvider) {
      if (!profileData.subjects?.length) {
        Alert.alert('Virhe', 'Valitse ainakin yksi oppiaine');
        return;
      }
      if (!profileData.hourlyRate || parseFloat(profileData.hourlyRate) <= 0) {
        Alert.alert('Virhe', 'Aseta tuntihinta (suurempi kuin 0)');
        return;
      }
    }

    setSaving(true);
    try {
      const { serviceType, collection: collectionName } = getRoleCollectionInfo(userRole);
      const docRef = doc(db, 'serviceTypes', serviceType, collectionName, user.uid);

      const updateData = {
        name: profileData.name || '',
        email: profileData.email || user.email || '',
        phone: profileData.phone || '',
        photoURL: profileData.photoURL || null,
        updatedAt: new Date().toISOString(),
      };

      if (isProvider) {
        // Provider-spesifit kentät
        updateData.subjects = profileData.subjects || [];
        updateData.languages = profileData.languages || [];
        updateData.teachingMethods = profileData.teachingMethods || [];
        updateData.availability = profileData.availability || [];
        updateData.hourlyRate = profileData.hourlyRate ? parseFloat(profileData.hourlyRate) : 0;
        updateData.experience = profileData.experience ? parseInt(profileData.experience) : 0;
        updateData.description = profileData.description || '';
        updateData.isActive = true;
        
        // Tallenna myös nested profile-objektiin (backward compatibility)
        updateData.profile = {
          ...updateData,
          phoneNumber: profileData.phone || '',
        };
      } else {
        // Client-spesifit kentät
        updateData.needs = profileData.needs || [];
        updateData.preferences = profileData.preferences || '';
        
        // Tallenna myös nested profile-objektiin (backward compatibility)
        updateData.profile = {
          name: profileData.name || '',
          phoneNumber: profileData.phone || '',
          photoURL: profileData.photoURL || null,
          needs: profileData.needs || [],
          preferences: profileData.preferences || '',
        };
      }

      await setDoc(docRef, updateData, { merge: true });
      
      Alert.alert('Onnistui', 'Profiili tallennettu');
      setIsEditing(false);
      await loadProfile(); // Lataa uudelleen
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Virhe', 'Profiilin tallentaminen epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleImageSelected = async (uri) => {
    if (!uri) {
      // Kuva poistettu
      setProfileData(prev => ({ ...prev, photoURL: null }));
      return;
    }

    // Jos URI on jo Firebase Storage URL, käytä sitä suoraan
    if (uri.startsWith('https://firebasestorage.googleapis.com')) {
      setProfileData(prev => ({ ...prev, photoURL: uri }));
      return;
    }

    // Muuten lataa paikallinen kuva Firebase Storageen
    try {
      console.log('📤 Uploading image to Firebase Storage...');
      setSaving(true);
      
      const downloadURL = await imagePickerService.uploadImage(
        uri,
        user.uid,
        `profile_${Date.now()}.jpg`
      );
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      setProfileData(prev => ({ ...prev, photoURL: downloadURL }));
      
      Alert.alert('Onnistui', 'Profiilikuva ladattu');
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      Alert.alert('Virhe', 'Kuvan lataaminen epäonnistui: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewRole = () => {
    // Get all available roles
    const availableRoles = Object.values(ROLE_CONFIG);
    
    // Get user's current roles from Firestore users collection
    // For now, we'll show all roles and let them choose
    const roleOptions = availableRoles.map(config => ({
      text: config.nameLocalized || config.name,
      onPress: () => {
        navigation.navigate('UniversalSignup', { 
          roleType: config.id,
          addingRole: true 
        });
      }
    }));

    roleOptions.push({
      text: 'Peruuta',
      style: 'cancel'
    });

    Alert.alert(
      'Lisää uusi rooli',
      'Valitse mitä roolia haluat käyttää tällä tilillä:',
      roleOptions
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <WatercolorBackground />
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.primary} />
          <Text style={commonStyles.loadingText}>Ladataan profiilia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <WatercolorBackground />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => isEditing ? setIsEditing(false) : navigation.goBack()}
        >
          <Ionicons name={isEditing ? 'close' : 'arrow-back'} size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Muokkaa profiilia' : 'Oma profiili'}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => isEditing ? saveProfile() : setIsEditing(true)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons 
              name={isEditing ? 'checkmark' : 'create'} 
              size={24} 
              color={colors.white} 
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profiilikuva ja perustiedot */}
        <View style={styles.profileHeader}>
          <ProfileImagePicker
            imageUri={profileData?.photoURL}
            onImageSelected={handleImageSelected}
            size={100}
            editable={isEditing}
          />
          <Text style={styles.profileName}>{profileData?.name || 'Nimi puuttuu'}</Text>
          <Text style={styles.profileEmail}>{profileData?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.primary + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.primary }]}>
              {isProvider ? '👨‍🏫 Teacher' : '👨‍👩‍👧 Parent/Student'}
            </Text>
          </View>
          
          {/* Add New Role Button */}
          <TouchableOpacity 
            style={[styles.addRoleButton, { borderColor: roleColors.primary }]}
            onPress={handleAddNewRole}
          >
            <Ionicons name="add-circle-outline" size={20} color={roleColors.primary} />
            <Text style={[styles.addRoleButtonText, { color: roleColors.primary }]}>Lisää uusi rooli</Text>
          </TouchableOpacity>
        </View>

        {/* Perustiedot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Perustiedot</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Nimi *</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData?.name || ''}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
              placeholder="Anna nimesi"
              editable={isEditing}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sähköposti</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profileData?.email || ''}
              editable={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Puhelinnumero</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData?.phone || ''}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder="+358 40 123 4567"
              keyboardType="phone-pad"
              editable={isEditing}
            />
          </View>

          {isProvider && (
            <View style={styles.field}>
              <Text style={styles.label}>Kuvaus</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                value={profileData?.description || ''}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, description: text }))}
                placeholder="Kerro itsestäsi, kokemuksestasi ja opetusmenetelmistäsi..."
                multiline
                numberOfLines={4}
                editable={isEditing}
              />
            </View>
          )}
        </View>

        {/* Client-spesifit kentät */}
        {!isProvider && (
          <>
            {/* Tarvittavat palvelut */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarvittavat palvelut</Text>
              {isEditing ? (
                <TagSelector
                  tags={SUBJECTS}
                  selectedTags={profileData?.needs || []}
                  onTagPress={(tags) => setProfileData(prev => ({ ...prev, needs: tags }))}
                  multiSelect={true}
                />
              ) : (
                <View style={styles.tagsDisplay}>
                  {profileData?.needs?.length > 0 ? (
                    profileData.needs.map((needId, index) => {
                      const subject = SUBJECTS.find(s => s.id === needId);
                      return (
                        <View key={index} style={[styles.tagChip, { backgroundColor: roleColors.primary + '20' }]}>
                          <Text style={[styles.tagChipText, { color: roleColors.primary }]}>{subject?.label || needId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>Ei määriteltyjä tarpeita</Text>
                  )}
                </View>
              )}
            </View>

            {/* Mieltymykset */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mieltymykset ja tarpeet</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Kuvaus</Text>
                <TextInput
                  style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                  value={profileData?.preferences || ''}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, preferences: text }))}
                  placeholder="Kerro lapsesi tarpeista, oppimistavoitteista ja mieltymyksistä..."
                  multiline
                  numberOfLines={4}
                  editable={isEditing}
                />
              </View>
            </View>
          </>
        )}

        {/* Provider-spesifit kentät */}
        {isProvider && (
          <>
            {/* Oppiaineet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Oppiaineet *</Text>
              {isEditing ? (
                <TagSelector
                  tags={SUBJECTS}
                  selectedTags={profileData?.subjects || []}
                  onTagPress={(tags) => setProfileData(prev => ({ ...prev, subjects: tags }))}
                  multiSelect={true}
                />
              ) : (
                <View style={styles.tagsDisplay}>
                  {profileData?.subjects?.length > 0 ? (
                    profileData.subjects.map((subjectId, index) => {
                      const subject = SUBJECTS.find(s => s.id === subjectId);
                      return (
                        <View key={index} style={[styles.tagChip, { backgroundColor: roleColors.primary + '20' }]}>
                          <Text style={[styles.tagChipText, { color: roleColors.primary }]}>{subject?.label || subjectId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>Ei valittuja aineita</Text>
                  )}
                </View>
              )}
            </View>

            {/* Hinnoittelu ja kokemus */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hinnoittelu ja kokemus</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Tuntihinta (€) *</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={profileData?.hourlyRate?.toString() || ''}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, hourlyRate: text }))}
                  placeholder="Esim. 50"
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Kokemus (vuosia)</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={profileData?.experience?.toString() || ''}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, experience: text }))}
                  placeholder="Esim. 5"
                  keyboardType="numeric"
                  editable={isEditing}
                />
              </View>
            </View>

            {/* Kielet */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kielet</Text>
              {isEditing ? (
                <TagSelector
                  tags={LANGUAGES}
                  selectedTags={profileData?.languages || []}
                  onTagPress={(tags) => setProfileData(prev => ({ ...prev, languages: tags }))}
                  multiSelect={true}
                />
              ) : (
                <View style={styles.tagsDisplay}>
                  {profileData?.languages?.length > 0 ? (
                    profileData.languages.map((langId, index) => {
                      const lang = LANGUAGES.find(l => l.id === langId);
                      return (
                        <View key={index} style={[styles.tagChip, { backgroundColor: roleColors.primary + '20' }]}>
                          <Text style={[styles.tagChipText, { color: roleColors.primary }]}>{lang?.label || langId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>Ei valittuja kieliä</Text>
                  )}
                </View>
              )}
            </View>

            {/* Opetusmenetelmät */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Opetusmenetelmät</Text>
              {isEditing ? (
                <TagSelector
                  tags={TEACHING_METHODS}
                  selectedTags={profileData?.teachingMethods || []}
                  onTagPress={(tags) => setProfileData(prev => ({ ...prev, teachingMethods: tags }))}
                  multiSelect={true}
                />
              ) : (
                <View style={styles.tagsDisplay}>
                  {profileData?.teachingMethods?.length > 0 ? (
                    profileData.teachingMethods.map((methodId, index) => {
                      const method = TEACHING_METHODS.find(m => m.id === methodId);
                      return (
                        <View key={index} style={[styles.tagChip, { backgroundColor: roleColors.primary + '20' }]}>
                          <Text style={[styles.tagChipText, { color: roleColors.primary }]}>{method?.label || methodId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>Ei valittuja menetelmiä</Text>
                  )}
                </View>
              )}
            </View>

            {/* Saatavuus */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saatavuus</Text>
              {isEditing ? (
                <TagSelector
                  tags={AVAILABILITY}
                  selectedTags={profileData?.availability || []}
                  onTagPress={(tags) => setProfileData(prev => ({ ...prev, availability: tags }))}
                  multiSelect={true}
                />
              ) : (
                <View style={styles.tagsDisplay}>
                  {profileData?.availability?.length > 0 ? (
                    profileData.availability.map((availId, index) => {
                      const avail = AVAILABILITY.find(a => a.id === availId);
                      return (
                        <View key={index} style={[styles.tagChip, { backgroundColor: roleColors.primary + '20' }]}>
                          <Text style={[styles.tagChipText, { color: roleColors.primary }]}>{avail?.label || availId}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>Ei valittua saatavuutta</Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    ...commonStyles.rowBetween,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 5,
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  roleBadge: {
    ...commonStyles.badge,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 15,
  },
  roleBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addRoleButton: {
    ...commonStyles.row,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 15,
    borderWidth: 1,
  },
  addRoleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    ...commonStyles.card,
    marginHorizontal: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  field: {
    ...commonStyles.formGroup,
  },
  label: {
    ...commonStyles.label,
  },
  input: {
    ...commonStyles.input,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundDark,
    color: colors.textSecondary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    ...commonStyles.emptyStateText,
    fontStyle: 'italic',
  },
});

export default ProfileScreen;
