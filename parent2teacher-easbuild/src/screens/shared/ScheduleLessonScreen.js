import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../../styles/commonStyles';
import { useAppData } from '../../hooks/useAppData';
import { useSelector, useDispatch } from 'react-redux';
import { createBooking, createRecurringBooking, selectBookingsLoading } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../hooks/useAuth';
import RecurringBookingModal from '../../components/RecurringBookingModal';

const ScheduleLessonScreen = ({ navigation, route }) => {
  const { teacherId } = route.params || {};
  const { getTeacherById } = useAppData();
  const teacher = useMemo(() => getTeacherById(teacherId), [teacherId, getTeacherById]);

  const dispatch = useDispatch();
  // Defensive: avoid destructuring if hook returns undefined for any reason
  const authCtx = useAuth() || {}; 
  const user = authCtx.user; 
  console.log('[ScheduleLesson] user context:', user);
  const loading = useSelector(selectBookingsLoading);

  const [date, setDate] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [showIOSPicker, setShowIOSPicker] = useState(Platform.OS === 'ios');
  const [notes, setNotes] = useState('');
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [createdBookingData, setCreatedBookingData] = useState(null);

  // iOS inline picker handler
  const onIOSChange = (_event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowIOSPicker(true);
    setDate(currentDate);
  };

  // Android two-step flow: first date, then time
  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: 'date',
      is24Hour: true,
      onChange: (event, selectedDate) => {
        if (event.type !== 'set' || !selectedDate) return;
        const pickedDate = selectedDate;
        // Next open time picker
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          is24Hour: true,
          onChange: (event2, selectedTime) => {
            if (event2.type !== 'set' || !selectedTime) return;
            const final = new Date(pickedDate);
            final.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
            setDate(final);
          },
        });
      },
    });
  };

  const submit = async () => {
    try {
      const teacher = getTeacherById(teacherId);
      
      // Store booking data for recurring modal - DON'T create booking yet
      setCreatedBookingData({
        teacherId,
        date,
        notes,
        teacherName: teacher?.name || teacher?.displayName || 'Opettaja'
      });
      
      // Show recurring booking modal first
      setShowRecurringModal(true);
    } catch (e) {
      alert('Failed to prepare booking: ' + e);
    }
  };

  const handleRecurringConfirm = async ({ frequency, numberOfWeeks }) => {
    try {
      if (!createdBookingData) return;
      
      const result = await dispatch(createRecurringBooking({
        ...createdBookingData,
        firstDate: createdBookingData.date,
        frequency,
        numberOfWeeks,
      })).unwrap();
      
      setShowRecurringModal(false);
      
      // Show appropriate message based on results
      const { bookings, skippedBookings } = result;
      if (skippedBookings && skippedBookings.length > 0) {
        alert(`${bookings.length} bookings created successfully.\n${skippedBookings.length} dates were skipped because the teacher has no available slots for those times.`);
      }
      
      navigateToBookings();
    } catch (e) {
      alert('Failed to create recurring booking: ' + (e.message || e));
    }
  };

  const handleRecurringSkip = async () => {
    // User chose to book only single lesson - create it now
    try {
      if (!createdBookingData) return;
      
      await dispatch(createBooking({ 
        teacherId: createdBookingData.teacherId, 
        date: createdBookingData.date, 
        notes: createdBookingData.notes,
        teacherName: createdBookingData.teacherName
      })).unwrap();
      
      setShowRecurringModal(false);
      navigateToBookings();
    } catch (e) {
      alert('Failed to create booking: ' + e);
      setShowRecurringModal(false);
    }
  };

  const navigateToBookings = () => {
    // Route back based on current user role to avoid navigator mismatch
    const isTeacher = user?.type === 'teacher' || user?.userType === 'teacher';
    const targetRoute = isTeacher ? 'TeacherBookings' : 'ParentBookings';
    const routeNames = navigation.getState()?.routeNames || [];
    if (routeNames.includes(targetRoute)) {
      navigation.replace(targetRoute);
    } else {
      // Fallback: go back if target not in current stack (prevents "navigate with payload" error)
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Lesson</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.teacherCard}>
          <View style={styles.avatar}><Ionicons name="person" color={colors.white} size={22} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{teacher?.name || teacher?.fullName || teacher?.displayName || 'Teacher'}</Text>
            {teacher?.subjects?.length ? (
              <Text style={styles.sub}>{(teacher.subjects || []).slice(0,3).join(', ')}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.label}>Select date & time</Text>
        {Platform.OS !== 'ios' && (
          <TouchableOpacity style={styles.dateButton} onPress={openAndroidPicker}>
            <Ionicons name="calendar" size={18} color={colors.white} />
            <Text style={styles.dateButtonText}>{date.toLocaleString()}</Text>
          </TouchableOpacity>
        )}
        {Platform.OS === 'ios' && showIOSPicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            is24Hour={true}
            onChange={onIOSChange}
            minimumDate={new Date(Date.now() + 15 * 60 * 1000)}
          />
        )}

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.notes}
          placeholder="Anything the teacher should know..."
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity style={[styles.submit, loading && { opacity: 0.6 }]} disabled={loading} onPress={submit}>
          <Text style={styles.submitText}>{loading ? 'Scheduling...' : 'Schedule lesson'}</Text>
        </TouchableOpacity>
      </View>

      <RecurringBookingModal
        visible={showRecurringModal}
        selectedDate={createdBookingData?.date}
        onConfirm={handleRecurringConfirm}
        onSkip={handleRecurringSkip}
        onClose={handleRecurringSkip}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  body: { padding: 16 },
  teacherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, padding: 12, borderRadius: 10, marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  sub: { fontSize: 12, color: colors.textSecondary },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  dateButtonText: { color: colors.white, fontWeight: '600', marginLeft: 8 },
  notes: { backgroundColor: colors.white, borderRadius: 8, minHeight: 80, padding: 10, textAlignVertical: 'top' },
  submit: { backgroundColor: colors.secondary, paddingVertical: 14, alignItems: 'center', borderRadius: 8, marginTop: 20 },
  submitText: { color: colors.white, fontWeight: '700' },
});

export default ScheduleLessonScreen;
