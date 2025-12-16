import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';
import { useAuth } from '../../hooks/useAuth';
import RecurringBookingModal from '../../components/RecurringBookingModal';
import { useDispatch } from 'react-redux';
import { createRecurringBooking } from '../../store/slices/bookingsSlice';
import { showToast } from '../../store/slices/toastSlice';
import { collectionGroup, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

// SÄÄDÄ TÄSTÄ FONTTIKOKOA
const SLOT_TIME_FONT_SIZE = 12;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

function getDayName(date) {
  return date.toLocaleDateString('fi-FI', { weekday: 'short' });
}

function getDayNumber(date) {
  return date.getDate();
}

export default function ProviderWeeklyAvailabilityScreen({ route, navigation }) {
  const { teacherId, teacherName, teacherRole } = route.params || {};
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [bookedSlotData, setBookedSlotData] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [providerProfile, setProviderProfile] = useState(null);
  const dispatch = useDispatch();

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [weekStart]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const role = teacherRole || 'teacher';
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
        const profileRef = doc(db, 'serviceTypes', serviceType, collectionName, teacherId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          setProviderProfile(profileSnap.data());
        }
      } catch (error) {

      }
    };
    loadProfile();
  }, [teacherId, teacherRole]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAvailableSlots(teacherId, weekStart, weekEnd);
      
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      
      const validSlots = data.filter(s => {
        const slotStart = new Date(s.start);
        return slotStart > twoHoursFromNow;
      });
      
      setSlots(validSlots);
    } catch (e) {

      Alert.alert('Error', e.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [teacherId, weekStart, weekEnd]);

  useEffect(() => { load(); }, [load]);

  const onPressSlot = async (slot) => {
    if (bookingInProgress) return;
    
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const slotStart = new Date(slot.start);
    if (slotStart <= twoHoursFromNow) {
      Alert.alert('Cannot Book', 'This time slot is too soon. Please book at least 2 hours in advance.');
      return;
    }

    const availableServices = providerProfile?.subjects || providerProfile?.specializations || [];
    const serviceLabel = teacherRole === 'therapist' ? 'therapy type' : 
                        teacherRole === 'coach' ? 'coaching service' : 'subject';
    
    let selectedService = null;
    if (Array.isArray(availableServices) && availableServices.length > 0) {
      if (availableServices.length === 1) {
        selectedService = availableServices[0];
      } else {
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
        if (!selectedService) return;
      }
    }

    setBookedSlotData({
      teacherId,
      teacherName: teacherName || 'Teacher',
      date: new Date(slot.start),
      notes: selectedService ? `Subject: ${selectedService}` : '',
      slotStart: new Date(slot.start),
      slotId: slot.id,
      subject: selectedService,
    });
    
    setShowRecurringModal(true);
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
      
      const { bookings, skippedBookings } = result;
      
      // Show toast with booking details
      const firstDate = new Date(bookedSlotData.date);
      const dateStr = firstDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric' });
      const timeStr = firstDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
      
      let toastMessage = `Bookings confirmed ✅\n${bookedSlotData.teacherName}\n${bookings.length} sessions starting ${dateStr} at ${timeStr}`;
      if (skippedBookings && skippedBookings.length > 0) {
        toastMessage += `\n⚠️ ${skippedBookings.length} slots unavailable`;
      }
      
      dispatch(showToast({
        message: toastMessage,
        type: 'success'
      }));
      
      // Navigate immediately
      navigation.navigate('Dashboard');
    } catch (e) {

      Alert.alert('Error', e.message || 'Failed to create recurring booking');
    }
  };

  const handleRecurringSkip = async () => {
    if (bookingInProgress) return;
    if (!bookedSlotData) return;
    
    // Skip confirmation dialog - book immediately for better UX
    setBookingInProgress(true);
    setShowRecurringModal(false);
    
    // Show toast immediately with booking details
    const startDate = new Date(bookedSlotData.slotStart);
    const endTime = new Date(startDate.getTime() + 45 * 60 * 1000);
    const dateStr = startDate.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const timeStr = `${startDate.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}`;
    
    dispatch(showToast({
      message: `Booking confirmed ✅\n${bookedSlotData.teacherName}\n${dateStr} at ${timeStr}`,
      type: 'success'
    }));
    
    // Navigate immediately
    navigation.navigate('Dashboard');
    
    // Handle booking in background
    const clientRole = user.role || user.userType || 'parent';
    bookSlot(bookedSlotData.slotId, user.uid, { 
      subject: bookedSlotData.subject || bookedSlotData.notes || '', 
      clientRole 
    }).then(() => {

      setBookingInProgress(false);
    }).catch((e) => {

      Alert.alert('Error', e.message || 'Failed to create booking');
      setBookingInProgress(false);
    });
  };

  const handleRecurringCancel = () => {
    setShowRecurringModal(false);
    setBookedSlotData(null);
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
    const fmt = (d) => d.toLocaleDateString('fi-FI', { month: 'short', day: 'numeric' });
    return `${fmt(weekStart)} - ${fmt(weekEnd)}`;
  }, [weekStart, weekEnd]);

  const getSlotsForDay = (day) => {
    return slots.filter(slot => {
      const slotDate = new Date(slot.start);
      return slotDate.toDateString() === day.toDateString();
    }).sort((a, b) => new Date(a.start) - new Date(b.start));
  };

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

      <ScrollView style={styles.scrollView}>
        {weekDays.map((day, index) => {
          const daySlots = getSlotsForDay(day);
          const isToday = day.toDateString() === new Date().toDateString();
          
          return (
            <View key={index} style={styles.dayContainer}>
              <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                  {getDayName(day)}
                </Text>
                <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                  {getDayNumber(day)}
                </Text>
              </View>
              
              {daySlots.length > 0 && (
                <View style={styles.slotsContainer}>
                  {daySlots.map((slot) => {
                    const start = new Date(slot.start);
                    const end = new Date(slot.end);
                    const startTime = start.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
                    const endTime = end.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={styles.slotCard}
                        onPress={() => onPressSlot(slot)}
                      >
                        <Text style={[styles.slotTime, { fontSize: SLOT_TIME_FONT_SIZE }]}>
                          {startTime} - {endTime}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {!loading && slots.length === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="information-circle-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No available times this week</Text>
          <Text style={styles.emptyText}>
            This teacher hasn't published availability for this week.
          </Text>
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    backgroundColor: colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  headerBtn: { 
    padding: 6 
  },
  headerBtnPlaceholder: { 
    width: 28 
  },
  headerCenter: { 
    alignItems: 'center' 
  },
  headerTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.text 
  },
  headerSub: { 
    marginTop: 2, 
    fontSize: 12, 
    color: colors.textSecondary 
  },
  weekNav: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    backgroundColor: colors.white, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  navChip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5F5F5', 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 14 
  },
  navText: { 
    color: colors.text, 
    fontSize: 13, 
    fontWeight: '600' 
  },
  scrollView: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  dayHeaderToday: {
    backgroundColor: colors.secondary + '20',
  },
  dayName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  dayNameToday: {
    color: colors.secondary,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dayNumberToday: {
    color: colors.secondary,
  },
  slotsContainer: {
    gap: 8,
  },
  slotCard: {
    backgroundColor: '#E8E8E8',
    borderColor: '#757575',
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  slotTime: {
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyOverlay: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    top: 160, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 24 
  },
  emptyTitle: { 
    marginTop: 10, 
    fontSize: 16, 
    fontWeight: '600', 
    color: colors.text 
  },
  emptyText: { 
    marginTop: 6, 
    fontSize: 13, 
    color: colors.textSecondary, 
    textAlign: 'center' 
  },
});
