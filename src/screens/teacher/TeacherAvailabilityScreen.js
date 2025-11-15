import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import TagSelector from '../../components/TagSelector';
import { AVAILABILITY } from '../../constants/tags';
import { generateAvailabilitySlots } from '../../services/availabilityService';

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
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [durationMin, setDurationMin] = useState('60');
  const [rangeDays, setRangeDays] = useState('30');
  const [loading, setLoading] = useState(false);

  const toggleDay = (dayId) => {
    setDaysOfWeek(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
  };

  const handleGenerate = async () => {
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');
    const dur = parseInt(durationMin, 10);
    const rdays = parseInt(rangeDays, 10);
    if (!dur || dur < 15) return Alert.alert('Error', 'Duration must be at least 15 minutes');
    if (!rdays || rdays < 1) return Alert.alert('Error', 'Range days must be >= 1');

    setLoading(true);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + rdays);

      const result = await generateAvailabilitySlots(
        user.uid,
        { daysOfWeek, startTime, endTime, durationMin: dur },
        start,
        end,
        { locationType: 'online' }
      );

      Alert.alert('Slots generated', `${result.createdCount} slots created/updated`);
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
        <Text style={styles.sectionTitle}>Weekly template</Text>
        <View style={styles.daysRow}>
          {DAYS.map(d => (
            <TouchableOpacity key={d.id} style={[styles.dayChip, daysOfWeek.includes(d.id) && styles.dayChipSelected]} onPress={() => toggleDay(d.id)}>
              <Text style={[styles.dayChipText, daysOfWeek.includes(d.id) && styles.dayChipTextSelected]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start time</Text>
            <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End time</Text>
            <TextInput style={styles.input} value={endTime} onChangeText={setEndTime} placeholder="16:00" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Slot duration (min)</Text>
            <TextInput style={styles.input} value={durationMin} onChangeText={setDurationMin} keyboardType="number-pad" placeholder="60" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Generate next (days)</Text>
            <TextInput style={styles.input} value={rangeDays} onChangeText={setRangeDays} keyboardType="number-pad" placeholder="30" />
          </View>
        </View>

        <TouchableOpacity style={[styles.generateButton, loading && { opacity: 0.6 }]} onPress={handleGenerate} disabled={loading}>
          <Text style={styles.generateButtonText}>{loading ? 'Generating…' : 'Generate slots'}</Text>
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
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  dayChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { color: colors.text },
  dayChipTextSelected: { color: colors.white },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: { backgroundColor: colors.white, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border },
  generateButton: { backgroundColor: colors.secondary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  generateButtonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
});