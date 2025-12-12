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
import { collection, collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  // Week starts on Monday (ISO 8601 standard)
  // If Sunday (0), go back 6 days to previous Monday
  // Otherwise, go back (day - 1) days to get Monday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  // Week is Monday to Sunday (7 days)
  e.setDate(s.getDate() + 6); // Monday + 6 days = Sunday
  e.setHours(23, 59, 59, 999);
  return e;
}

export default function ProviderWeeklyAvailabilityScreen({ route, navigation }) {
  const { teacherId, teacherName, teacherRole } = route.params || {}; // TODO: rename to providerId, providerName
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [searchingNext, setSearchingNext] = useState(false);
  const autoJumpedRef = useRef(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [bookedSlotData, setBookedSlotData] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [providerProfile, setProviderProfile] = useState(null);
  const dispatch = useDispatch();

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);

  // Load provider profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const role = teacherRole || 'teacher';
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
        const profileRef = doc(db, 'serviceTypes', serviceType, collectionName, teacherId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          setProviderProfile(profileData);
          console.log('✅ Provider profile loaded:', {
            subjects: profileData.subjects,
            specializations: profileData.specializations
          });
        }
      } catch (error) {
        console.error('Error loading provider profile:', error);
      }
    };
    loadProfile();
  }, [teacherId, teacherRole]);

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
      
      const mapped = validSlots.map(s => {
        const startDate = new Date(s.start);
        const endDate = new Date(s.end);
        
        // Calculate duration in minutes
        const durationMinutes = (endDate - startDate) / (1000 * 60);
        
        // Create compact title showing time range with tap indicator
        const startTime = startDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
        const endTime = endDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
        const title = `📅 ${startTime}${durationMinutes > 30 ? `-${endTime}` : ''}\n👆 Tap to book`;
        
        return {
          id: s.id,
          title: title,
          start: startDate,
          end: endDate,
          slot: s,
        };
      });
      
      setEvents(mapped);
      
      // Reset next-available hint when current week has events
      if (mapped.length > 0) {
        setNextAvailable(null);
      }
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

  const onPressEvent = async (ev) => {
    if (bookingInProgress) return;
    
    const s = ev.slot;
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

    // Get available services from provider profile
    const availableServices = providerProfile?.subjects || providerProfile?.specializations || [];
    const serviceLabel = teacherRole === 'therapist' ? 'therapy type' : 
                        teacherRole === 'coach' ? 'coaching service' : 'subject';
    
    let selectedService = null;
    if (Array.isArray(availableServices) && availableServices.length > 0) {
      if (availableServices.length === 1) {
        selectedService = availableServices[0];
      } else {
        // Show service picker
        selectedService = await new Promise(resolve => {
          Alert.alert(
            `Select ${serviceLabel}`,
            `Choose your preferred ${serviceLabel}:`,
            [
              ...availableServices.map(service => ({ text: service, onPress: () => resolve(service) })),
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
            ]
          );
        });
        if (!selectedService) return; // User cancelled
      }
    }
    // If no services available, allow booking without selection
    // selectedService can be null

    // DON'T ask for confirmation here - just show recurring modal
    // Store data and show recurring modal first
    setBookedSlotData({
      teacherId,
      teacherName: teacherName || 'Teacher',
      date: new Date(s.start),
      notes: selectedService ? `Subject: ${selectedService}` : '',
      slotStart: new Date(s.start),
      slotId: s.id,
      subject: selectedService,
    });
    
    // Show recurring modal first
    setShowRecurringModal(true);
  };

  const handleRecurringConfirm = async ({ frequency, numberOfWeeks }) => {
    try {
      if (!bookedSlotData) return;
      
      // First, check how many slots are actually available
      const startDate = new Date(bookedSlotData.slotStart);
      const interval = frequency === 'weekly' ? 7 : 14;
      
      // Get teacher's available slots using collectionGroup to search across hierarchical structure
      const availableSlotsQuery = query(
        collectionGroup(db, 'availabilitySlots'),
        where('teacherId', '==', bookedSlotData.teacherId),
        where('status', '==', 'available')
      );
      const availableSlotsSnap = await getDocs(availableSlotsQuery);
      const availableSlots = availableSlotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log('🔍 Pre-check: Found', availableSlots.length, 'available slots for teacher');
      
      // Check which dates have available slots
      let availableCount = 0;
      const availableDates = [];
      const unavailableDates = [];
      
      for (let i = 0; i < numberOfWeeks; i++) {
        const bookingDate = new Date(startDate);
        bookingDate.setDate(bookingDate.getDate() + (i * interval));
        
        // Skip past dates
        if (bookingDate < new Date()) {
          unavailableDates.push(bookingDate);
          continue;
        }
        
        // Check if teacher has an available slot for this date/time
        const matchingSlot = availableSlots.find(slot => {
          const slotStart = new Date(slot.start);
          const timeDiff = Math.abs(slotStart.getTime() - bookingDate.getTime());
          return timeDiff < 30 * 60 * 1000 && slot.status === 'available';
        });
        
        if (matchingSlot) {
          availableCount++;
          availableDates.push(bookingDate);
        } else {
          unavailableDates.push(bookingDate);
        }
      }
      
      // Show confirmation with actual availability info
      const endTime = new Date(startDate.getTime() + 45 * 60 * 1000);
      const frequencyText = frequency === 'weekly' ? 'weekly' : 'every two weeks';
      
      let confirmMessage = `First booking:\n${startDate.toLocaleDateString('en-US')} at ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n\nSubject: ${bookedSlotData.subject || 'N/A'}\nFrequency: ${frequencyText}\n\n`;
      
      if (availableCount === numberOfWeeks) {
        confirmMessage += `✅ All ${numberOfWeeks} bookings can be created.`;
      } else if (availableCount > 0) {
        confirmMessage += `⚠️ Only ${availableCount}/${numberOfWeeks} bookings can be created.\nTeacher has no available slots for ${unavailableDates.length} dates.`;
      } else {
        Alert.alert('No Available Times', 'Teacher has no available slots for any of the requested dates.');
        return;
      }
      
      const ok = await new Promise(resolve => {
        Alert.alert(
          'Confirm Recurring Booking',
          confirmMessage,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Create Bookings', onPress: () => resolve(true) },
          ]
        );
      });
      
      if (!ok) return;
      
      const result = await dispatch(createRecurringBooking({
        teacherId: bookedSlotData.teacherId,
        firstDate: bookedSlotData.date,
        notes: bookedSlotData.notes,
        teacherName: bookedSlotData.teacherName,
        frequency,
        numberOfWeeks,
      })).unwrap();
      
      setShowRecurringModal(false);
      
      // Show detailed results with all booked dates
      const { bookings, skippedBookings } = result;
      
      let successMessage = `Created bookings (${bookings.length} total):\n\n`;
      bookings.forEach((booking, index) => {
        const date = new Date(booking.date);
        successMessage += `${index + 1}. ${date.toLocaleDateString('en-US')} at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
      });
      
      if (skippedBookings && skippedBookings.length > 0) {
        successMessage += `\n⚠️ Skipped dates (${skippedBookings.length} total):\nTeacher had no available slots for these times.`;
        Alert.alert('Bookings Created 📅', successMessage);
      } else {
        Alert.alert('Success! 🎉', successMessage);
      }
      
      // Reload to show updated calendar
      load();
    } catch (e) {
      console.error('Create recurring booking error:', e);
      Alert.alert('Error', e.message || 'Failed to create recurring booking');
    }
  };

  const handleRecurringSkip = async () => {
    // User chose single booking - show confirmation first
    if (bookingInProgress) return;
    
    if (!bookedSlotData) return;
    
    const startDate = new Date(bookedSlotData.slotStart);
    const endTime = new Date(startDate.getTime() + 45 * 60 * 1000); // Assuming 45 min slots
    
    const confirmMessage = `${startDate.toLocaleDateString('en-US')} at ${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\nSubject: ${bookedSlotData.subject || 'N/A'}`;
    
    const ok = await new Promise(resolve => {
      Alert.alert(
        'Confirm Booking',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Book', onPress: () => resolve(true) },
        ]
      );
    });
    
    if (!ok) return;
    
    setBookingInProgress(true);
    try {
      if (!bookedSlotData?.slotId) return;
      
      const clientRole = user.role || user.userType || 'parent';
      await bookSlot(
        bookedSlotData.slotId, 
        user.uid, 
        { 
          subject: bookedSlotData.subject || bookedSlotData.notes || '', 
          clientRole 
        }
      );
      
      setShowRecurringModal(false);
      Alert.alert('Booking Confirmed! ✅', 'Your booking has been created.', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
      
      // Reload to show updated calendar
      load();
    } catch (e) {
      console.error('Book slot error:', e);
      Alert.alert('Error', e.message || 'Failed to create booking');
      setShowRecurringModal(false);
    } finally {
      setBookingInProgress(false);
    }
  };

  const handleRecurringCancel = () => {
    // User clicked X - just close modal and restore the slot to calendar
    setShowRecurringModal(false);
    setBookedSlotData(null);
    // Reload to restore the slot
    load();
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
        height={750}
        hourRowHeight={70}
        onPressEvent={onPressEvent}
        swipeEnabled={false}
        showTime={true}
        weekStartsOn={1}
        ampm={false}
        scrollOffsetMinutes={480}
        hourStyle={{
          color: '#000000',
          fontSize: 11,
          fontWeight: '600',
        }}
        theme={{
          palette: {
            primary: { main: colors.secondary },
            gray: { 
              100: '#f5f5f5', 
              200: '#eee', 
              300: '#e0e0e0', 
              500: '#9e9e9e', 
              800: '#424242' 
            },
          },
          todayName: { 
            color: colors.secondary, 
            fontWeight: 'bold', 
            fontSize: 13 
          },
          hour: { 
            color: '#000000', 
            fontSize: 12,
            fontWeight: '700'
          },
        }}
        eventCellStyle={(event) => ({
          backgroundColor: '#4CAF50',
          borderLeftColor: '#2E7D32',
          borderLeftWidth: 5,
          borderRadius: 8,
          padding: 8,
          minHeight: 50,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        })}
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
        onClose={handleRecurringCancel}
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
