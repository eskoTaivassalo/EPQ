import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
import { getRoleColors, getCanonicalRole } from '../../config/roleConfig';
import { useAuth } from '../../hooks/useAuth';
import { generateAvailabilitySlots } from '../../services/availabilityService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

const DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export default function TeacherAvailabilityScreen({ navigation }) {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleColors = getRoleColors(role);
  const [daysOfWeek, setDaysOfWeek] = useState([1,2,3,4,5]);
  // Use hours as numbers for sliders (0-24)
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(16);
  const [endMinute, setEndMinute] = useState(0);
  const [durationMin, setDurationMin] = useState(45);
  const [rangeDays, setRangeDays] = useState(30);
  const [sessionsPerDay, setSessionsPerDay] = useState(1);
  const [loading, setLoading] = useState(false);
  // Subjects selection
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  // Fetch teacher's subjects from Firestore profile
  useEffect(() => {
    async function fetchSubjects() {
      if (!user?.uid) return;
      try {
        // Fetch from serviceTypes structure: serviceTypes/{serviceType}/{collectionName}/{userId}
        const role = user.role || user.userType || 'teacher';
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
        const docRef = doc(db, 'serviceTypes', serviceType, collectionName, user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          
          // Get subjects directly from role profile
          const subjects = data.subjects || [];
          
          if (Array.isArray(subjects) && subjects.length > 0) {
            console.log('✅ Loaded subjects from profile:', subjects);
            setProfileSubjects(subjects);
          } else {
            console.log('⚠️ No subjects found in profile');
            setProfileSubjects([]);
          }
        } else {
          console.log(`⚠️ Profile not found at serviceTypes/${serviceType}/${collectionName}/${user.uid}`);
          setProfileSubjects([]);
        }
      } catch (e) {
        console.error('❌ Error fetching subjects:', e);
        setProfileSubjects([]);
      }
    }
    fetchSubjects();
  }, [user?.uid]);

  const toggleDay = (dayId) => {
    setDaysOfWeek(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  };
  const toggleSubject = (subject) => {
    setSelectedSubjects(prev => prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]);
  };
  // Format time helpers
  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async () => {
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');
    // Validation
    if (daysOfWeek.length === 0) {
      return Alert.alert('Error', 'Please select at least one day');
    }
    // Subjects are optional - client will select when booking
    const startTimeStr = formatTime(startHour, startMinute);
    // Calculate end time: each session starts on the hour (60 min blocks including break)
    const totalMinutes = startHour * 60 + startMinute + (60 * sessionsPerDay);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endTimeStr = formatTime(endH, endM);
    
    setLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + rangeDays);
      const slotConfig = { 
        daysOfWeek, 
        startTime: startTimeStr, 
        endTime: endTimeStr, 
        durationMin,
        ...(selectedSubjects.length > 0 && { subjects: selectedSubjects })
      };
      const result = await generateAvailabilitySlots(
        user.uid,
        slotConfig,
        start,
        end,
        { locationType: 'online', userRole: user.role || user.userType || 'teacher' }
      );
      
      // Show appropriate message based on results
      if (result.createdCount === 0 && result.skippedCount > 0) {
        Alert.alert(
          'No Slots Created ⚠️', 
          `All ${result.skippedCount} time slots were skipped because they would overlap with existing bookings. Please choose different times or delete existing slots first.`
        );
      } else if (result.createdCount > 0 && result.skippedCount > 0) {
        Alert.alert(
          'Partially Created ⚠️', 
          `Created ${result.createdCount} new slots.\n\nSkipped ${result.skippedCount} slots due to overlaps with existing bookings.`
        );
      } else {
        Alert.alert('Success! 🎉', `${result.createdCount} time slots created`);
      }
      
      navigation.goBack();
    } catch (e) {
      console.error('Generate slots error', e);
      Alert.alert('Error', e.message || 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <WatercolorBackground />
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ManageSlots')}>
          <Ionicons name="list" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Select Days</Text>
          <View style={styles.daysRow}>
            {DAYS.map(d => (
              <TouchableOpacity 
                key={d.id} 
                style={[
                  styles.dayChip, 
                  daysOfWeek.includes(d.id) && { backgroundColor: roleColors.primary, borderColor: roleColors.primary }
                ]} 
                onPress={() => toggleDay(d.id)}
              >
                <Text style={[styles.dayText, daysOfWeek.includes(d.id) && styles.dayTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time & Session Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ Schedule</Text>
          
          {/* Start Time & Duration in one row */}
          <View style={styles.row}>
            <View style={styles.halfBox}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity 
                style={[styles.valueBubble, { backgroundColor: roleColors.primary + '18', borderColor: roleColors.primary + '40' }]}
                onPress={() => setStartHour(startHour === 23 ? 0 : startHour + 1)}
              >
                <Text style={[styles.valueText, { color: roleColors.primary }]}>
                  {startHour.toString().padStart(2, '0')}:{startMinute.toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
              <View style={styles.quickRow}>
                {[0, 15, 30, 45].map(min => (
                  <TouchableOpacity 
                    key={min}
                    style={[
                      styles.quickBtn, 
                      startMinute === min && { backgroundColor: roleColors.primary, borderColor: roleColors.primary }
                    ]}
                    onPress={() => setStartMinute(min)}
                  >
                    <Text style={[styles.quickText, startMinute === min && styles.quickTextActive]}>
                      :{min.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.halfBox}>
              <Text style={styles.label}>Duration</Text>
              <TouchableOpacity 
                style={[styles.valueBubble, { backgroundColor: roleColors.primary + '18', borderColor: roleColors.primary + '40' }]}
                onPress={() => setDurationMin(durationMin >= 90 ? 30 : durationMin + 15)}
              >
                <Text style={[styles.valueText, { color: roleColors.primary }]}>{durationMin}m</Text>
              </TouchableOpacity>
              <View style={styles.quickRow}>
                {[30, 45, 60, 90].map(dur => (
                  <TouchableOpacity 
                    key={dur}
                    style={[
                      styles.quickBtn, 
                      durationMin === dur && { backgroundColor: roleColors.primary, borderColor: roleColors.primary }
                    ]}
                    onPress={() => setDurationMin(dur)}
                  >
                    <Text style={[styles.quickText, durationMin === dur && styles.quickTextActive]}>
                      {dur}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Sessions & Range in one row */}
          <View style={styles.row}>
            <View style={styles.halfBox}>
              <Text style={styles.label}>Sessions/Day</Text>
              <TouchableOpacity 
                style={[styles.valueBubble, { backgroundColor: roleColors.primary + '18', borderColor: roleColors.primary + '40' }]}
                onPress={() => setSessionsPerDay(sessionsPerDay >= 10 ? 1 : sessionsPerDay + 1)}
              >
                <Text style={[styles.valueText, { color: roleColors.primary }]}>{sessionsPerDay}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfBox}>
              <Text style={styles.label}>Period</Text>
              <TouchableOpacity 
                style={[styles.valueBubble, { backgroundColor: roleColors.primary + '18', borderColor: roleColors.primary + '40' }]}
                onPress={() => setRangeDays(rangeDays >= 90 ? 7 : rangeDays + 7)}
              >
                <Text style={[styles.valueText, { color: roleColors.primary }]}>{rangeDays}d</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: roleColors.primary + '10' }]}>
            <Ionicons name="information-circle" size={16} color={roleColors.primary} />
            <Text style={styles.summaryText}>
              Daily: {startHour.toString().padStart(2, '0')}:{startMinute.toString().padStart(2, '0')} - {(() => {
                const totalMinutes = startHour * 60 + startMinute + (60 * sessionsPerDay);
                const endH = Math.floor(totalMinutes / 60) % 24;
                const endM = totalMinutes % 60;
                return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
              })()}  •  {sessionsPerDay} × {durationMin}min
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.generateButton,
            { backgroundColor: roleColors.secondary, shadowColor: roleColors.secondary },
            loading && styles.generateButtonDisabled
          ]} 
          onPress={handleGenerate} 
          disabled={loading}
        >
          <Ionicons name="calendar" size={22} color={colors.white} />
          <Text style={styles.generateButtonText}>
            {loading ? 'Creating Slots...' : 'Generate Time Slots'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    ...commonStyles.rowBetween,
    paddingHorizontal: 16, 
    paddingTop: 8, 
    paddingBottom: 12,
  },
  backButton: { padding: 8 },
  headerTitle: { 
    color: colors.white, 
    fontSize: 18, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: { 
    flex: 1,
    padding: 16,
  },
  
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 48,
    alignItems: 'center',
  },
  dayChipActive: {
    // Colors applied inline with roleColors
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.white,
  },
  
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfBox: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueBubble: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 6,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickBtnActive: {
    // Colors applied inline with roleColors
  },
  quickText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickTextActive: {
    color: colors.white,
  },
  
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  
  generateButton: { 
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 20,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: { 
    color: colors.white, 
    fontSize: 17, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});