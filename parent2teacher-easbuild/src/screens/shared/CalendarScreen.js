import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { fetchParentBookings, fetchTeacherBookings, selectBookings, cancelBooking } from '../../store/slices/bookingsSlice';

export default function CalendarScreen({ navigation }) {
  const dispatch = useDispatch();
  const authUser = useSelector(state => state.auth.user);
  const role = authUser?.role || authUser?.type || authUser?.userType;
  const bookingsData = useSelector(selectBookings);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch bookings on mount
  useEffect(() => {
    if (role === 'teacher') {
      dispatch(fetchTeacherBookings());
    } else {
      dispatch(fetchParentBookings());
    }
  }, [role, dispatch]);

  // Filter valid bookings
  const bookings = useMemo(() => {
    return bookingsData.filter(b => {
      if (!b.date) return false;
      try {
        const d = new Date(b.date);
        return !isNaN(d.getTime());
      } catch {
        return false;
      }
    });
  }, [bookingsData]);

  // Group bookings by date (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const grouped = {};
    bookings.forEach(booking => {
      try {
        // Use local date to avoid timezone issues
        const date = new Date(booking.date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dayOfWeek = date.getDay(); // 0 = Sunday
        const key = `${year}-${month}-${day}`;
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(booking);
      } catch (e) {
        // Failed to group booking
      }
    });
    
    return grouped;
  }, [bookings]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get starting day (0 = Sunday, 1 = Monday, etc.)
    const startDay = firstDay.getDay();
    // Convert to Monday-first (0 = Monday)
    const startOffset = startDay === 0 ? 6 : startDay - 1;
    
    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Use local date format to match bookingsByDate
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayBookings = bookingsByDate[dateKey] || [];
      
      days.push({
        day,
        date,
        dateKey,
        bookings: dayBookings,
        key: dateKey
      });
    }
    
    return days;
  }, [currentDate, bookingsByDate]);

  const monthYear = currentDate.toLocaleDateString('fi-FI', { month: 'long', year: 'numeric' });
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayPress = (dayData) => {
    if (dayData.empty) return;
    setSelectedDate(dayData.dateKey);
    setSelectedBookings(dayData.bookings);
  };

  const closeModal = () => {
    setSelectedDate(null);
    setSelectedBookings([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return '#4CAF50'; // Green
      case 'pending':
      case 'booked':
        return '#FFC107'; // Amber
      case 'cancelled_by_teacher':
      case 'cancelled_by_parent':
      case 'declined':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Gray
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'Vahvistettu';
      case 'pending':
        return 'Odottaa';
      case 'booked':
        return 'Varattu';
      case 'cancelled_by_teacher':
        return 'Peruutettu (Opettaja)';
      case 'cancelled_by_parent':
        return 'Peruutettu (Vanhempi)';
      case 'declined':
        return 'Hylätty';
      default:
        return status || 'Tuntematon';
    }
  };

  const openCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Virhe', 'Syötä peruutuksen syy');
      return;
    }

    try {
      await dispatch(cancelBooking({ 
        bookingId: bookingToCancel.id, 
        reason: cancelReason 
      })).unwrap();
      
      setCancelModalVisible(false);
      setBookingToCancel(null);
      setCancelReason('');
      
      // Refresh bookings
      if (role === 'teacher') {
        dispatch(fetchTeacherBookings());
      } else {
        dispatch(fetchParentBookings());
      }
      
      Alert.alert('Onnistui', 'Varaus peruutettu');
    } catch (error) {
      Alert.alert('Virhe', error.message || 'Varauksen peruutus epäonnistui');
    }
  };

  const renderBookingItem = ({ item }) => {
    const date = new Date(item.date);
    const timeStr = date.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={styles.bookingItem}>
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingTime}>{timeStr}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        {item.subject && (
          <Text style={styles.bookingSubject}>{item.subject}</Text>
        )}
        
        <Text style={styles.bookingWith}>
          {role === 'teacher' 
            ? `Vanhempi: ${item.parentName || 'Tuntematon'}`
            : `Opettaja: ${item.teacherName || 'Tuntematon'}`
          }
        </Text>
        
        {item.notes && (
          <Text style={styles.bookingNotes}>{item.notes}</Text>
        )}
        
        {role === 'teacher' && (item.status === 'accepted' || item.status === 'confirmed') && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => openCancelModal(item)}
          >
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <Text style={styles.cancelButtonText}>Peruuta varaus</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kalenteri</Text>
        <View style={styles.backButton} />
      </View>

      {/* Month Navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{monthYear}</Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Weekday Headers */}
      <View style={styles.weekdayHeader}>
        {['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'].map((day, idx) => (
          <Text key={idx} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <ScrollView style={styles.calendarScroll} contentContainerStyle={styles.calendarContent}>
        <View style={styles.calendarGrid}>
          {calendarDays.map((dayData) => {
            if (dayData.empty) {
              return <View key={dayData.key} style={styles.emptyDay} />;
            }

            const isToday = dayData.dateKey === today;
            const hasBookings = dayData.bookings.length > 0;

            return (
              <TouchableOpacity
                key={dayData.key}
                style={[
                  styles.dayCell,
                  isToday && styles.todayCell
                ]}
                onPress={() => handleDayPress(dayData)}
              >
                <Text style={[
                  styles.dayNumber,
                  isToday && styles.todayText
                ]}>
                  {dayData.day}
                </Text>
                
                {hasBookings && (
                  <View style={styles.dotsContainer}>
                    {dayData.bookings.slice(0, 3).map((booking, idx) => (
                      <View
                        key={booking.id || idx}
                        style={[
                          styles.bookingDot,
                          { backgroundColor: getStatusColor(booking.status) }
                        ]}
                      />
                    ))}
                    {dayData.bookings.length > 3 && (
                      <Text style={styles.moreCount}>+{dayData.bookings.length - 3}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Vahvistettu</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFC107' }]} />
          <Text style={styles.legendText}>Odottaa</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Peruutettu</Text>
        </View>
      </View>

      {/* Day Details Modal */}
      <Modal
        visible={!!selectedDate}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate && new Date(selectedDate + 'T12:00:00').toLocaleDateString('fi-FI', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            {selectedBookings.length === 0 ? (
              <View style={styles.emptyBookings}>
                <Ionicons name="calendar-outline" size={48} color={colors.textLight} />
                <Text style={styles.emptyText}>Ei varauksia tälle päivälle</Text>
              </View>
            ) : (
              <FlatList
                data={selectedBookings}
                renderItem={renderBookingItem}
                keyExtractor={(item, idx) => item.id || `booking-${idx}`}
                contentContainerStyle={styles.bookingsList}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Peruuta varaus</Text>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.cancelModalBody}>
              <Text style={styles.cancelLabel}>Peruutuksen syy *</Text>
              <TextInput
                style={styles.cancelTextArea}
                placeholder="Kerro miksi peruutat varauksen..."
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.cancelHelpText}>
                Oppilaa informoidaan peruutuksesta ja syystä
              </Text>
            </View>

            <View style={styles.cancelModalFooter}>
              <TouchableOpacity 
                style={styles.cancelModalBackButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.cancelModalBackButtonText}>Takaisin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelModalConfirmButton}
                onPress={handleCancelBooking}
              >
                <Text style={styles.cancelModalConfirmButtonText}>Peruuta varaus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    textTransform: 'capitalize',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMedium,
  },
  calendarScroll: {
    flex: 1,
  },
  calendarContent: {
    padding: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: colors.primaryLight + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 2,
  },
  todayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bookingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreCount: {
    fontSize: 8,
    color: colors.textMedium,
    marginLeft: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.textMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textDark,
    textTransform: 'capitalize',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  emptyBookings: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelModalBody: {
    padding: 20,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  cancelTextArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textDark,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  cancelHelpText: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
    fontStyle: 'italic',
  },
  cancelModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelModalBackButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalBackButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelModalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: colors.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalConfirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bookingsList: {
    padding: 20,
  },
  bookingItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textDark,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  bookingSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  bookingWith: {
    fontSize: 14,
    color: colors.textMedium,
    marginBottom: 4,
  },
  bookingNotes: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
