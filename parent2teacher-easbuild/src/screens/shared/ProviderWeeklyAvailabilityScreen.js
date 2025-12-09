import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-big-calendar';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';
import { useAuth } from '../../hooks/useAuth';
import RecurringBookingModal from '../../components/RecurringBookingModal';
import { useDispatch } from 'react-redux';
import { createRecurringBooking } from '../../store/slices/bookingsSlice';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday as first day
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

export default function ProviderWeeklyAvailabilityScreen({ route, navigation }) {
  const { teacherId, teacherName } = route.params || {}; // TODO: rename to providerId, providerName
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [searchingNext, setSearchingNext] = useState(false);
  const autoJumpedRef = useRef(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [bookedSlotData, setBookedSlotData] = useState(null);
  const dispatch = useDispatch();

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAvailableSlots(teacherId, weekStart, weekEnd);
      
      // Filter out past slots and slots less than 2 hours from now
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      const validSlots = data.filter(s => {
        const slotStart = new Date(s.start);
        return slotStart > twoHoursFromNow;
      });
      
      const mapped = validSlots.map(s => ({
        id: s.id,
        title: 'Available',
        start: new Date(s.start),
        end: new Date(s.end),
        slot: s,
      }));
      setEvents(mapped);
      // Reset next-available hint when current week has events
      if (mapped.length > 0) {
        setNextAvailable(null);
      }
      
      console.log(`📅 Weekly view: Filtered ${data.length} slots to ${validSlots.length} valid slots (>2h from now)`);
    } catch (e) {
      console.error('Load weekly slots error', e);
      Alert.alert('Error', e.message || 'Failed to load weekly availability');
    } finally {
      setLoading(false);
    }
  }, [teacherId, weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  // When a week has no events, proactively search the next available week (up to 8 weeks ahead)
  useEffect(() => {
    const findNext = async () => {
      if (loading) return;
      if (events.length > 0) return;
      if (searchingNext) return;
      setSearchingNext(true);
      try {
        const from = new Date(weekEnd.getTime() + 1000); // start right after this week
        const horizon = new Date(from);
        horizon.setDate(horizon.getDate() + 7 * 8); // look 8 weeks ahead
        const data = await listAvailableSlots(teacherId, from, horizon);
        
        // Filter out past slots and slots less than 2 hours from now
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        const validSlots = data.filter(s => {
          const slotStart = new Date(s.start);
          return slotStart > twoHoursFromNow;
        });
        
        if (validSlots && validSlots.length > 0) {
          // Pick earliest slot
          const earliest = validSlots.reduce((min, s) => (new Date(s.start) < new Date(min.start) ? s : min), validSlots[0]);
          setNextAvailable(new Date(earliest.start));
          // Optionally auto-jump only on first screen mount
          if (!autoJumpedRef.current) {
            // Don't surprise users; keep as hint. If you want auto-jump, uncomment below:
            // setCurrentDate(new Date(earliest.start));
            autoJumpedRef.current = true;
          }
        } else {
          setNextAvailable(null);
        }
      } catch (e) {
        console.warn('Find next available week failed', e);
      } finally {
        setSearchingNext(false);
      }
    };
    findNext();
  }, [events, loading, teacherId, weekEnd, searchingNext]);

  const onPressEvent = async (evt) => {
    const s = evt.slot;
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');

    // Double-check that slot is still valid (at least 2 hours from now)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const slotStart = new Date(s.start);
    if (slotStart <= twoHoursFromNow) {
      Alert.alert(
        'Cannot Book',
        'This time slot is too soon. Please book a time at least 2 hours in advance.',
        [{ text: 'OK' }]
      );
      setEvents(prev => prev.filter(e => e.id !== s.id));
      return;
    }

    // Enforce subject selection
    let selectedSubject = null;
    if (Array.isArray(s.subjects) && s.subjects.length > 0) {
      if (s.subjects.length === 1) {
        selectedSubject = s.subjects[0];
      } else {
        // Show subject picker
        selectedSubject = await new Promise(resolve => {
          Alert.alert(
            'Valitse aine',
            'Valitse varattava aine tälle tunnille:',
            [
              ...s.subjects.map(subj => ({ text: subj, onPress: () => resolve(subj) })),
              { text: 'Peruuta', style: 'cancel', onPress: () => resolve(null) }
            ]
          );
        });
      }
    }
    if (!selectedSubject) {
      Alert.alert('Aine vaaditaan', 'Et voi varata aikaa ilman aineen valintaa.');
      return;
    }

    const ok = await new Promise(resolve => {
      Alert.alert(
        'Vahvista varaus',
        `${new Date(s.start).toLocaleString()} - ${new Date(s.end).toLocaleTimeString()}\nAine: ${selectedSubject}`,
        [
          { text: 'Peruuta', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Varaa', onPress: () => resolve(true) },
        ]
      );
    });
    if (!ok) return;

    try {
      // DON'T book yet - store data and show recurring modal first
      setBookedSlotData({
        teacherId,
        teacherName: teacherName || 'Teacher',
        date: new Date(s.start),
        notes: `Subject: ${selectedSubject}`,
        slotStart: new Date(s.start),
        slotId: s.id, // Store slot ID for single booking
      });
      
      // Show recurring modal first
      setShowRecurringModal(true);
      
      setEvents(prev => prev.filter(e => e.id !== s.id));
    } catch (e) {
      console.error('Book slot error', e);
      Alert.alert('Virhe', e.message || 'Varauksen tekeminen epäonnistui');
    }
  };

  const handleRecurringConfirm = async ({ frequency, numberOfWeeks }) => {
    try {
      if (!bookedSlotData) return;
      
      const result = await dispatch(createRecurringBooking({
        teacherId: bookedSlotData.teacherId,
        firstDate: bookedSlotData.date,
        notes: bookedSlotData.notes,
        teacherName: bookedSlotData.teacherName,
        frequency,
        numberOfWeeks,
      })).unwrap();
      
      setShowRecurringModal(false);
      
      // Show appropriate message based on results
      const { bookings, skippedBookings } = result;
      if (skippedBookings && skippedBookings.length > 0) {
        Alert.alert(
          'Partially Created 📅', 
          `${bookings.length} bookings created successfully.\n${skippedBookings.length} dates were skipped because the teacher has no available slots for those times.`
        );
      } else {
        Alert.alert('Success! 🎉', `${bookings.length} ${frequency} bookings created. Your teacher will review them.`);
      }
      
      // Reload to show updated calendar
      load();
    } catch (e) {
      console.error('Create recurring booking error:', e);
      Alert.alert('Error', e.message || 'Failed to create recurring booking');
    }
  };

  const handleRecurringSkip = async () => {
    // User chose single booking - book it now
    try {
      if (!bookedSlotData?.slotId) return;
      
      await bookSlot(bookedSlotData.slotId, user.uid, { subject: bookedSlotData.notes || '' });
      
      setShowRecurringModal(false);
      Alert.alert('Booking Confirmed! ✅', 'Your booking has been created.');
      
      // Reload to show updated calendar
      load();
    } catch (e) {
      console.error('Book slot error:', e);
      Alert.alert('Error', e.message || 'Failed to create booking');
      setShowRecurringModal(false);
    }
  };

  const goPrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const weekLabel = useMemo(() => {
    const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
  }, [weekStart, weekEnd]);

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{teacherName || 'Availability'}</Text>
          <Text style={styles.headerSub}>{weekLabel}</Text>
        </View>
        <View style={styles.headerBtnPlaceholder} />
      </View>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={goPrevWeek} style={styles.navChip}>
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={styles.navText}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentDate(new Date())} style={styles.navChip}>
          <Ionicons name="today" size={18} color={colors.text} />
          <Text style={styles.navText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNextWeek} style={styles.navChip}>
          <Text style={styles.navText}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Calendar
        events={events}
        date={currentDate}
        mode="week"
        height={620}
        eventMinHeight={40}
        onPressEvent={onPressEvent}
        swipeEnabled={false}
        showTime={true}
        theme={{
          palette: {
            primary: { main: colors.secondary },
            gray: { 100: '#f5f5f5', 200: '#eee', 300: '#e0e0e0', 500: '#9e9e9e', 800: '#424242' },
          },
          event: { color: '#E8F5E9', textColor: colors.text },
          todayName: { color: colors.secondary },
          hour: { color: colors.textSecondary },
        }}
        isRTL={false}
      />

      {!loading && events.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="information-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No available times this week</Text>
          <Text style={styles.emptyText}>
            This teacher hasn’t published availability for this week.
          </Text>
          {nextAvailable && (
            <TouchableOpacity
              style={styles.jumpButton}
              onPress={() => setCurrentDate(nextAvailable)}
              disabled={searchingNext}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.white} />
              <Text style={styles.jumpButtonText}>
                Go to next available week ({nextAvailable.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
              </Text>
            </TouchableOpacity>
          )}
          {!nextAvailable && (
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={[styles.emptyText, { marginBottom: 12 }]}>
                No upcoming availability found. Contact the teacher directly.
              </Text>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => {
                  navigation.navigate('ConversationThread', {
                    recipientId: teacherId,
                    recipientName: teacherName || 'Teacher'
                  });
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color={colors.white} />
                <Text style={styles.contactButtonText}>Contact Teacher</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <RecurringBookingModal
        visible={showRecurringModal}
        selectedDate={bookedSlotData?.slotStart}
        onConfirm={handleRecurringConfirm}
        onSkip={handleRecurringSkip}
        onClose={handleRecurringSkip}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { padding: 6 },
  headerBtnPlaceholder: { width: 28 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerSub: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  navChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  navText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  emptyOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  jumpButton: { marginTop: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  jumpButtonText: { color: colors.white, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
