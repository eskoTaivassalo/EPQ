import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
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
      Alert.alert('Success! 🎉', `${result.createdCount} time slots created`);
      navigation.goBack();
    } catch (e) {
      console.error('Generate slots error', e);
      Alert.alert('Error', e.message || 'Failed to generate slots');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('ManageSlots')}>
          <Ionicons name="list" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Days */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Days</Text>
          <View style={styles.chipsContainer}>
            {DAYS.map(d => (
              <TouchableOpacity 
                key={d.id} 
                style={[styles.chip, daysOfWeek.includes(d.id) && styles.chipActive]} 
                onPress={() => toggleDay(d.id)}
              >
                <Text style={[styles.chipText, daysOfWeek.includes(d.id) && styles.chipTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subjects removed - client selects during booking */}

        {/* Time Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Time Settings</Text>
          
          <View style={styles.timeGrid}>
            {/* Start Time */}
            <View style={styles.timeBoxWide}>
              <Text style={styles.timeBoxLabel}>Start Time</Text>
              <TouchableOpacity 
                style={styles.timePickerBox}
                onPress={() => setStartHour(startHour === 23 ? 0 : startHour + 1)}
                onLongPress={() => setStartHour(Math.max(0, startHour - 1))}
              >
                <Text style={styles.timeBoxValue}>
                  {startHour.toString().padStart(2, '0')}:{startMinute.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timeBoxHint}>tap to change</Text>
              </TouchableOpacity>
              <View style={styles.quickMinutes}>
                {[0, 15, 30, 45].map(min => (
                  <TouchableOpacity 
                    key={min}
                    style={[styles.minuteChip, startMinute === min && styles.minuteChipActive]}
                    onPress={() => setStartMinute(min)}
                  >
                    <Text style={[styles.minuteChipText, startMinute === min && styles.minuteChipTextActive]}>
                      :{min.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Duration */}
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Duration</Text>
              <TouchableOpacity 
                style={styles.timePickerBox}
                onPress={() => setDurationMin(durationMin >= 180 ? 15 : durationMin + 15)}
                onLongPress={() => setDurationMin(Math.max(15, durationMin - 15))}
              >
                <Text style={styles.timeBoxValue}>{durationMin}</Text>
                <Text style={styles.timeBoxHint}>minutes</Text>
              </TouchableOpacity>
              <View style={styles.quickMinutes}>
                {[30, 45, 60, 90].map(dur => (
                  <TouchableOpacity 
                    key={dur}
                    style={[styles.minuteChip, durationMin === dur && styles.minuteChipActive]}
                    onPress={() => setDurationMin(dur)}
                  >
                    <Text style={[styles.minuteChipText, durationMin === dur && styles.minuteChipTextActive]}>
                      {dur}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sessions Per Day */}
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Sessions/Day</Text>
              <TouchableOpacity 
                style={styles.timePickerBox}
                onPress={() => setSessionsPerDay(sessionsPerDay >= 10 ? 1 : sessionsPerDay + 1)}
                onLongPress={() => setSessionsPerDay(Math.max(1, sessionsPerDay - 1))}
              >
                <Text style={styles.timeBoxValue}>{sessionsPerDay}</Text>
                <Text style={styles.timeBoxHint}>tap to change</Text>
              </TouchableOpacity>
            </View>

            {/* Range */}
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxLabel}>Range</Text>
              <TouchableOpacity 
                style={styles.timePickerBox}
                onPress={() => setRangeDays(rangeDays >= 90 ? 7 : rangeDays + 7)}
                onLongPress={() => setRangeDays(Math.max(7, rangeDays - 7))}
              >
                <Text style={styles.timeBoxValue}>{rangeDays}</Text>
                <Text style={styles.timeBoxHint}>days</Text>
              </TouchableOpacity>
              <View style={styles.quickMinutes}>
                {[7, 14, 30, 60].map(days => (
                  <TouchableOpacity 
                    key={days}
                    style={[styles.minuteChip, rangeDays === days && styles.minuteChipActive]}
                    onPress={() => setRangeDays(days)}
                  >
                    <Text style={[styles.minuteChipText, rangeDays === days && styles.minuteChipTextActive]}>
                      {days}d
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* End Time - Calculated Display */}
            <View style={styles.timeBoxWide}>
              <Text style={styles.timeBoxLabel}>Daily Schedule</Text>
              <View style={[styles.timePickerBox, styles.calculatedBox]}>
                <Text style={styles.timeBoxValue}>
                  {(() => {
                    const totalMinutes = startHour * 60 + startMinute + (60 * sessionsPerDay);
                    const endH = Math.floor(totalMinutes / 60) % 24;
                    const endM = totalMinutes % 60;
                    return `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                  })()}
                </Text>
                <Text style={styles.timeBoxHint}>{sessionsPerDay} × {durationMin}min + breaks (hourly blocks)</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.generateButton, loading && { opacity: 0.6 }]} 
          onPress={handleGenerate} 
          disabled={loading}
        >
          <Ionicons name="calendar" size={20} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.generateButtonText}>
            {loading ? 'Generating...' : 'Generate Time Slots'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    backgroundColor: colors.secondary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 12, 
    paddingTop: 6, 
    paddingBottom: 10 
  },
  backButton: { padding: 4 },
  headerTitle: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  content: { padding: 12 },
  
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBox: {
    width: '48%',
    minWidth: 150,
  },
  timeBoxWide: {
    width: '100%',
  },
  calculatedBox: {
    backgroundColor: colors.textSecondary + '10',
    borderColor: colors.textSecondary + '30',
  },
  timeBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePickerBox: {
    backgroundColor: colors.primary + '15',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '30',
    marginBottom: 3,
  },
  timeBoxValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  timeBoxHint: {
    fontSize: 8,
    color: colors.textSecondary,
    marginTop: 1,
    fontStyle: 'italic',
  },
  quickMinutes: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
  },
  minuteChip: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  minuteChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  minuteChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.text,
  },
  minuteChipTextActive: {
    color: colors.white,
  },
  
  generateButton: { 
    backgroundColor: colors.secondary, 
    padding: 12, 
    borderRadius: 10, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generateButtonText: { 
    color: colors.white, 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});