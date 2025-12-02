import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { generateAvailabilitySlots } from '../../services/availabilityService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

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
  const [durationMin, setDurationMin] = useState(60);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(false);
  // Subjects selection
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  // Fetch teacher's subjects from Firestore profile
  useEffect(() => {
    async function fetchSubjects() {
      if (!user?.uid) return;
      try {
        console.log('🔍 Fetching subjects for UID:', user.uid);
        const docRef = doc(db, 'teachers', user.uid);
        const snap = await getDoc(docRef);
        console.log('📄 Document exists:', snap.exists());
        if (snap.exists()) {
          const data = snap.data();
          console.log('📦 Full document data keys:', Object.keys(data));
          console.log('📚 data.subjects:', data.subjects);
          console.log('📚 data.profile?.subjects:', data.profile?.subjects);
          
          // Try both root and nested profile
          const subjects = data.subjects || data.profile?.subjects || [];
          console.log('✅ Final subjects array:', subjects);
          
          if (Array.isArray(subjects) && subjects.length > 0) {
            setProfileSubjects(subjects);
          } else {
            console.warn('⚠️ No valid subjects found');
            setProfileSubjects([]);
          }
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
    if (selectedSubjects.length === 0) {
      return Alert.alert('Error', 'Please select at least one subject');
    }
    const startTimeStr = formatTime(startHour, startMinute);
    const endTimeStr = formatTime(endHour, endMinute);
    // Check that end time is after start time
    const startMins = startHour * 60 + startMinute;
    const endMins = endHour * 60 + endMinute;
    if (endMins <= startMins) {
      return Alert.alert('Error', 'End time must be after start time');
    }
    setLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + rangeDays);
      const result = await generateAvailabilitySlots(
        user.uid,
        { daysOfWeek, startTime: startTimeStr, endTime: endTimeStr, durationMin, subjects: selectedSubjects },
        start,
        end,
        { locationType: 'online' }
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Select Days</Text>
        <View style={styles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity 
              key={d.id} 
              style={[styles.dayChip, daysOfWeek.includes(d.id) && styles.dayChipSelected]} 
              onPress={() => toggleDay(d.id)}
            >
              <Text style={[styles.dayChipText, daysOfWeek.includes(d.id) && styles.dayChipTextSelected]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subjects selection - only from teacher profile */}
        <Text style={styles.sectionTitle}>Select Subjects</Text>
        <View style={styles.daysRow}>
          {profileSubjects.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              No subjects found in your profile. Add subjects to your profile to enable slot creation.
            </Text>
          ) : (
            profileSubjects.map(subject => (
              <TouchableOpacity
                key={subject}
                style={[styles.dayChip, selectedSubjects.includes(subject) && styles.dayChipSelected]}
                onPress={() => toggleSubject(subject)}
              >
                <Text style={[styles.dayChipText, selectedSubjects.includes(subject) && styles.dayChipTextSelected]}>
                  {subject}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Start Time */}
        <View style={styles.timeSection}>
          <Text style={styles.label}>Start Time</Text>
          <Text style={styles.timeDisplay}>{formatTime(startHour, startMinute)}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeControl}>
              <Text style={styles.timeLabel}>Hour</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setStartHour(Math.max(0, startHour - 1))}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.controlValue}>{startHour}</Text>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setStartHour(Math.min(23, startHour + 1))}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timeControl}>
              <Text style={styles.timeLabel}>Minute</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setStartMinute(Math.max(0, startMinute - 15))}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.controlValue}>{startMinute}</Text>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setStartMinute(Math.min(45, startMinute + 15))}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* End Time */}
        <View style={styles.timeSection}>
          <Text style={styles.label}>End Time</Text>
          <Text style={styles.timeDisplay}>{formatTime(endHour, endMinute)}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeControl}>
              <Text style={styles.timeLabel}>Hour</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setEndHour(Math.max(0, endHour - 1))}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.controlValue}>{endHour}</Text>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setEndHour(Math.min(23, endHour + 1))}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timeControl}>
              <Text style={styles.timeLabel}>Minute</Text>
              <View style={styles.controlRow}>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setEndMinute(Math.max(0, endMinute - 15))}
                >
                  <Ionicons name="remove" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.controlValue}>{endMinute}</Text>
                <TouchableOpacity 
                  style={styles.controlButton} 
                  onPress={() => setEndMinute(Math.min(45, endMinute + 15))}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Lesson Duration */}
        <View style={styles.timeSection}>
          <Text style={styles.label}>Lesson Duration</Text>
          <Text style={styles.timeDisplay}>{durationMin} min</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setDurationMin(Math.max(15, durationMin - 15))}
            >
              <Ionicons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.controlValue}>{durationMin} min</Text>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setDurationMin(Math.min(180, durationMin + 15))}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Range Days */}
        <View style={styles.timeSection}>
          <Text style={styles.label}>Generate for Next</Text>
          <Text style={styles.timeDisplay}>{rangeDays} days</Text>
          <View style={styles.controlRow}>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setRangeDays(Math.max(1, rangeDays - 7))}
            >
              <Ionicons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.controlValue}>{rangeDays} days</Text>
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={() => setRangeDays(Math.min(90, rangeDays + 7))}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
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
  header: { backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backButton: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.text },
  dayChipTextSelected: { color: colors.white },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 6,
    textAlign: 'center',
  },
  timeSection: { 
    marginBottom: 24, 
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.white, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  timeDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginVertical: 12,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
    justifyContent: 'space-around',
  },
  timeControl: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 60,
    textAlign: 'center',
  },
  generateButton: { 
    backgroundColor: colors.secondary, 
    padding: 16, 
    borderRadius: 10, 
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  generateButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});