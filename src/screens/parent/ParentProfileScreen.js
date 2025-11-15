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
import MessageModal from '../../components/MessageModal';
import GradeModal from '../../components/GradeModal';
import { sendMessage, addGrade, listMessagesForConversation, listGradesForParentTeacher } from '../../services/communicationService';
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
} from '../../constants/tags';

const ParentProfileScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  // Jos opettaja avaa tämän näkymän Students-listasta, route.params.parentId on asetettu
  const parentIdParam = route?.params?.parentId;
  const isTeacher = user?.type === 'teacher' || user?.userType === 'teacher';
  const viewingOtherParent = isTeacher && parentIdParam && parentIdParam !== user?.uid;
  const targetParentId = viewingOtherParent ? parentIdParam : user?.uid; // kenen profiili haetaan
  const readOnly = viewingOtherParent; // Opettajan näkymä on vain luku - ei muokkausta
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.displayName || user?.name || '',
    email: user?.email || '',
    phone: '',
    childrenAges: '',
    childrenGrades: [],
    subjectsNeeded: [],
    lookingFor: [],
    preferredTeachingStyle: [],
    budget: '',
    priceRange: '',
    location: [],
    learningPreferences: [],
    specialNeeds: [],
    availability: [],
    languages: [],
    goals: '',
    notes: '',
    acceptMarketing: false,
    isGoogleAuth: false,
  });

  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentMessages, setRecentMessages] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);

  useEffect(() => {
    loadProfile();
  }, [targetParentId]);

  useEffect(() => {
    if (viewingOtherParent) {
      refreshCommunication();
    }
  }, [viewingOtherParent, targetParentId]);

  const loadProfile = async () => {
    if (!db || !targetParentId) return;
    try {
      const docRef = doc(db, 'parents', targetParentId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn('ℹ️ ParentProfile: no parent document found');
        return;
      }
      const raw = docSnap.data();
      const nested = raw.profile || {};
      const doubleNested = nested.profile || {};
      const merged = { ...raw, ...nested, ...doubleNested };
      console.log('🟢 ParentProfile loaded keys:', Object.keys(raw));
      if (raw.profile) console.log('🟢 ParentProfile nested keys:', Object.keys(raw.profile));
      const toArray = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
        return [];
      };
      setProfileData(prev => ({
        ...prev,
        name: merged.name || prev.name,
        email: merged.email || prev.email,
        phone: merged.phone || merged.phoneNumber || prev.phone,
        childrenAges: merged.childrenAges || prev.childrenAges,
        childrenGrades: toArray(merged.childrenGrades) || prev.childrenGrades,
        subjectsNeeded: toArray(merged.subjectsNeeded).length ? toArray(merged.subjectsNeeded) : toArray(merged.lookingFor),
        lookingFor: toArray(merged.lookingFor),
        preferredTeachingStyle: toArray(merged.preferredTeachingStyle),
        budget: merged.budget || prev.budget,
        priceRange: merged.priceRange || prev.priceRange,
        location: toArray(merged.location),
        learningPreferences: toArray(merged.learningPreferences),
        specialNeeds: toArray(merged.specialNeeds).length ? toArray(merged.specialNeeds) : (merged.specificNeeds ? [merged.specificNeeds] : []),
        availability: toArray(merged.availability),
        languages: toArray(merged.languages),
        goals: merged.goals || prev.goals,
        notes: merged.notes || merged.specificNeeds || prev.notes,
        acceptMarketing: merged.acceptMarketing || false,
        isGoogleAuth: !!merged.isGoogleAuth,
      }));
    } catch (error) {
      console.error('Error loading parent profile:', error);
    }
  };

  const saveProfile = async () => {
    if (readOnly) {
      Alert.alert('Info', 'Teacher cannot edit parent profile.');
      return;
    }
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
  const userDocRef = doc(db, 'parents', user.uid);
      
      // Build the update payload with proper structure
      // Save to both root level AND nested profile for compatibility
      const updatePayload = {
        // Root-level fields for easy access
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        childrenAges: profileData.childrenAges,
        childrenGrades: profileData.childrenGrades,
        subjectsNeeded: profileData.subjectsNeeded,
        lookingFor: profileData.lookingFor,
        preferredTeachingStyle: profileData.preferredTeachingStyle,
        learningPreferences: profileData.learningPreferences,
        specialNeeds: profileData.specialNeeds,
        goals: profileData.goals,
        budget: profileData.budget,
        priceRange: profileData.priceRange,
        location: profileData.location,
        availability: profileData.availability,
        languages: profileData.languages,
        notes: profileData.notes,
        acceptMarketing: profileData.acceptMarketing,
        isGoogleAuth: profileData.isGoogleAuth,
        updatedAt: new Date().toISOString(),
        // Keep nested profile structure for backward compatibility
        profile: {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          phoneNumber: profileData.phone,
          childrenAges: profileData.childrenAges,
          childrenGrades: profileData.childrenGrades,
          subjectsNeeded: profileData.subjectsNeeded,
          lookingFor: profileData.lookingFor,
          preferredTeachingStyle: profileData.preferredTeachingStyle,
          learningPreferences: profileData.learningPreferences,
          specialNeeds: profileData.specialNeeds,
          specificNeeds: profileData.notes, // Legacy field
          goals: profileData.goals,
          budget: profileData.budget,
          priceRange: profileData.priceRange,
          location: profileData.location,
          availability: profileData.availability,
          languages: profileData.languages,
          notes: profileData.notes,
          acceptMarketing: profileData.acceptMarketing,
          isGoogleAuth: profileData.isGoogleAuth,
        }
      };

      console.log('💾 Saving parent profile with fields:', Object.keys(updatePayload));
      await setDoc(userDocRef, updatePayload, { merge: true });
      console.log('✅ Parent profile saved successfully');
      
      Alert.alert('Success', 'Profile saved successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('❌ Error saving parent profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const refreshCommunication = async () => {
    try {
      if (!user?.uid || !parentIdParam) return;
      const msgs = await listMessagesForConversation(user.uid, parentIdParam, 10);
      setRecentMessages(msgs);
      const grades = await listGradesForParentTeacher(user.uid, parentIdParam);
      setRecentGrades(grades.slice(0,5));
    } catch (e) {
      console.warn('Communication refresh failed:', e.message);
    }
  };

  const handleSendMessage = async (text) => {
    if (!text) return;
    setActionLoading(true);
    try {
      await sendMessage({ teacherId: user.uid, parentId: parentIdParam, senderType: 'teacher', text });
      setMessageModalVisible(false);
      refreshCommunication();
    } catch (e) {
      Alert.alert('Virhe', e.message || 'Viestin lähetys epäonnistui');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddGrade = async ({ subject, score, maxScore, notes }) => {
    setActionLoading(true);
    try {
      await addGrade({ teacherId: user.uid, parentId: parentIdParam, subject, score, maxScore, notes });
      setGradeModalVisible(false);
      refreshCommunication();
    } catch (e) {
      Alert.alert('Virhe', e.message || 'Arvosanan tallennus epäonnistui');
    } finally {
      setActionLoading(false);
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
        {readOnly ? (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('ConversationThread', { teacherId: user.uid, parentId: parentIdParam })}>
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => setGradeModalVisible(true)}>
              <Ionicons name="school" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
            disabled={loading}
          >
            <Ionicons name="checkmark" size={24} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
        {readOnly && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Viestit (uusimmat)</Text>
            {recentMessages.length === 0 ? (
              <Text style={styles.infoValue}>Ei viestejä.</Text>
            ) : (
              recentMessages.map(m => (
                <View key={m.id} style={styles.messageItem}>
                  <Text style={styles.messageMeta}>{m.senderType === 'teacher' ? 'Opettaja' : 'Vanhempi'} · {m.createdAt?.seconds ? new Date(m.createdAt.seconds*1000).toLocaleDateString() : ''}</Text>
                  <Text style={styles.messageText}>{m.text}</Text>
                </View>
              ))
            )}
          </View>
        )}
        {readOnly && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Arvosanat (uusimmat)</Text>
            {recentGrades.length === 0 ? (
              <Text style={styles.infoValue}>Ei arvosanoja.</Text>
            ) : (
              recentGrades.map(g => (
                <View key={g.id} style={styles.gradeItem}>
                  <Text style={styles.gradeTitle}>{g.subject}: {g.score}/{g.maxScore}</Text>
                  {!!g.notes && <Text style={styles.gradeNotes}>{g.notes}</Text>}
                </View>
              ))
            )}
          </View>
        )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Contact</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Name:</Text><Text style={styles.infoValue}>{profileData.name || 'Not set'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Email:</Text><Text style={styles.infoValue}>{profileData.email || 'Not set'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone:</Text><Text style={styles.infoValue}>{profileData.phone || 'Not provided'}</Text></View>
          {profileData.acceptMarketing && (<View style={styles.badge}><Text style={styles.badgeText}>Marketing Opt-in</Text></View>)}
          {profileData.isGoogleAuth && (<View style={[styles.badge,{backgroundColor:'#1A73E8'}]}><Text style={styles.badgeText}>Google</Text></View>)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children Information</Text>
          {readOnly ? (
            <>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Ages:</Text><Text style={styles.infoValue}>{profileData.childrenAges || 'Not set'}</Text></View>
              {!!profileData.childrenGrades.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>School Grades/Levels</Text>
                  <View style={styles.chipContainer}>
                    {profileData.childrenGrades.map((g, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{g}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.subjectsNeeded.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Subjects Needed</Text>
                  <View style={styles.chipContainer}>
                    {profileData.subjectsNeeded.map((s, idx) => (
                      <View key={idx} style={[styles.displayChip,{backgroundColor:'#E8F5E9'}]}><Text style={styles.displayChipText}>{s}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Preferences</Text>
          {readOnly ? (
            <>
              {!!profileData.preferredTeachingStyle.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferred Teaching Styles</Text>
                  <View style={styles.chipContainer}>
                    {profileData.preferredTeachingStyle.map((t, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.learningPreferences.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Learning Methods</Text>
                  <View style={styles.chipContainer}>
                    {profileData.learningPreferences.map((t, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.specialNeeds.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Special Needs / Difficulties</Text>
                  <View style={styles.chipContainer}>
                    {profileData.specialNeeds.map((t, idx) => (
                      <View key={idx} style={[styles.displayChip,{backgroundColor:'#FFE0B2'}]}><Text style={styles.displayChipText}>{t}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {profileData.goals ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Learning Goals</Text>
                  <Text style={styles.infoValue}>{profileData.goals}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practical Details</Text>
          {readOnly ? (
            <>
              {profileData.budget ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Budget:</Text><Text style={styles.infoValue}>{profileData.budget} € / h</Text></View>
              ) : null}
              {profileData.priceRange ? (
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Price Range:</Text><Text style={styles.infoValue}>{profileData.priceRange}</Text></View>
              ) : null}
              {!!profileData.location.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Preferred Locations</Text>
                  <View style={styles.chipContainer}>
                    {profileData.location.map((l, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{l}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.availability.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Availability</Text>
                  <View style={styles.chipContainer}>
                    {profileData.availability.map((l, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{l}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.languages.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Languages Preferred</Text>
                  <View style={styles.chipContainer}>
                    {profileData.languages.map((l, idx) => (
                      <View key={idx} style={[styles.displayChip,{backgroundColor:'#F3E5F5'}]}><Text style={styles.displayChipText}>{l}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          {readOnly ? (
            <>
              {profileData.notes ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes</Text>
                  <Text style={styles.infoValue}>{profileData.notes}</Text>
                </View>
              ) : null}
              {!!profileData.lookingFor.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Services / Support Needed</Text>
                  <View style={styles.chipContainer}>
                    {profileData.lookingFor.map((item, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{item}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.specialNeeds.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Special Needs</Text>
                  <View style={styles.chipContainer}>
                    {profileData.specialNeeds.map((item, idx) => (
                      <View key={idx} style={[styles.displayChip,{backgroundColor:'#FFE0B2'}]}><Text style={styles.displayChipText}>{item}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
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
              {!!profileData.lookingFor.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Services / Support Needed</Text>
                  <View style={styles.chipContainer}>
                    {profileData.lookingFor.map((item, idx) => (
                      <View key={idx} style={styles.displayChip}><Text style={styles.displayChipText}>{item}</Text></View>
                    ))}
                  </View>
                </View>
              )}
              {!!profileData.specialNeeds.length && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Special Needs</Text>
                  <View style={styles.chipContainer}>
                    {profileData.specialNeeds.map((item, idx) => (
                      <View key={idx} style={[styles.displayChip,{backgroundColor:'#FFE0B2'}]}><Text style={styles.displayChipText}>{item}</Text></View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        {!readOnly && (
          <TouchableOpacity
            style={styles.saveProfileButton}
            onPress={saveProfile}
            disabled={loading}
          >
            <Text style={styles.saveProfileButtonText}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      {/* Modals */}
      <MessageModal
        visible={messageModalVisible}
        loading={actionLoading}
        onSend={handleSendMessage}
        onClose={() => !actionLoading && setMessageModalVisible(false)}
      />
      <GradeModal
        visible={gradeModalVisible}
        loading={actionLoading}
        onSave={handleAddGrade}
        onClose={() => !actionLoading && setGradeModalVisible(false)}
      />
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
  iconButton: { padding: 5, marginLeft: 6 },
  messageItem: { backgroundColor: '#F5F5F5', padding:12, borderRadius:8, marginBottom:10 },
  messageMeta: { fontSize:11, color: colors.textSecondary, marginBottom:4 },
  messageText: { fontSize:14, color: colors.text },
  gradeItem: { backgroundColor:'#E8F5E9', padding:12, borderRadius:8, marginBottom:10 },
  gradeTitle: { fontSize:14, fontWeight:'600', color: colors.text },
  gradeNotes: { fontSize:12, color: colors.textSecondary, marginTop:4 },
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
  infoRow: { flexDirection:'row', marginBottom:6 },
  infoLabel: { fontWeight:'600', width:90, color: colors.text },
  infoValue: { flex:1, color: colors.text },
  badge: { alignSelf:'flex-start', backgroundColor: colors.primary, paddingHorizontal:10, paddingVertical:4, borderRadius:12, marginTop:6, marginRight:6 },
  badgeText: { color: colors.white, fontSize:11, fontWeight:'600', letterSpacing:0.5 },
  chipContainer: { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:6 },
  displayChip: { backgroundColor:'#E3F2FD', paddingHorizontal:10, paddingVertical:6, borderRadius:14, marginBottom:8 },
  displayChipText: { fontSize:12, color: colors.text },
});

export default ParentProfileScreen;