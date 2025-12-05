import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeacherBookings, selectBookings, selectBookingsLoading, updateBookingStatus, approveAllRecurringBookings } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../hooks/useAuth';
import { useAppData } from '../../hooks/useAppData';
import DateTimePicker from '@react-native-community/datetimepicker';

const TeacherBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings);
  const loading = useSelector(selectBookingsLoading);
  const { getParentById, getParents } = useAppData();
  const { user } = useAuth();

  // Decline modal state
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [suggestNewTime, setSuggestNewTime] = useState(false);
  const [suggestedDate, setSuggestedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    // Ensure parents are loaded so we can resolve parentId -> parent data
    (async () => {
      await getParents().catch(() => {});
      dispatch(fetchTeacherBookings());
    })();
  }, [dispatch]);

  // Group recurring bookings
  const recurringGroups = React.useMemo(() => {
    const groups = {};
    bookings.forEach(booking => {
      if (booking.recurringBookingId && booking.status === 'pending') {
        if (!groups[booking.recurringBookingId]) {
          groups[booking.recurringBookingId] = [];
        }
        groups[booking.recurringBookingId].push(booking);
      }
    });
    return groups;
  }, [bookings]);

  // Single bookings (non-recurring pending)
  const singleBookings = React.useMemo(() => {
    return bookings.filter(b => !b.recurringBookingId || b.status !== 'pending');
  }, [bookings]);

  const handleApproveAllRecurring = async (recurringBookingId) => {
    const group = recurringGroups[recurringBookingId];
    if (!group || group.length === 0) return;

    Alert.alert(
      'Approve All Bookings',
      `Approve all ${group.length} bookings from this recurring series?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve All',
          onPress: async () => {
            try {
              await dispatch(approveAllRecurringBookings({ recurringBookingId })).unwrap();
              Alert.alert('Success', `${group.length} bookings approved!`);
            } catch (err) {
              Alert.alert('Error', 'Failed to approve bookings: ' + err);
            }
          }
        }
      ]
    );
  };

  const accept = (booking) => {
    dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'accepted',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || 'Opettaja',
      date: booking.date
    }));
  };
  
  const openDeclineModal = (booking) => {
    setSelectedBooking(booking);
    setDeclineReason('');
    setSuggestNewTime(false);
    setSuggestedDate(new Date(booking.date || Date.now()));
    setDeclineModalVisible(true);
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for declining');
      return;
    }

    const declineData = {
      bookingId: selectedBooking.id,
      status: 'declined',
      parentId: selectedBooking.parentId,
      teacherName: user?.displayName || user?.name || 'Teacher',
      date: selectedBooking.date,
      declineReason: declineReason.trim(),
    };

    // Add suggested time if checkbox is checked
    if (suggestNewTime) {
      declineData.suggestedDate = suggestedDate.toISOString();
      declineData.suggestedDateFormatted = suggestedDate.toLocaleString();
    }

    dispatch(updateBookingStatus(declineData));
    setDeclineModalVisible(false);
    setSelectedBooking(null);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSuggestedDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(suggestedDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setSuggestedDate(newDate);
    }
  };

  const renderItem = ({ item }) => {
    const when = new Date(item.date);
    const parent = getParentById(item.parentId);
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.parentBox}>
            <View style={styles.avatarContainer}>
              {parent?.photoURL ? (
                <Image source={{ uri: parent.photoURL }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={26} color={colors.white} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.parentName} numberOfLines={1}>
                {parent?.name || parent?.fullName || parent?.displayName || 'Parent'}
              </Text>
              {parent?.email && (
                <Text style={styles.parentMeta} numberOfLines={1}>{parent.email}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
          <Text style={styles.date}>{when.toLocaleString()}</Text>
        </View>
        {item.notes && item.notes.trim() && (
          <Text style={styles.notes} numberOfLines={2}>Notes: {item.notes}</Text>
        )}
        {(item.status === 'pending' || item.status === 'booked') && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4CAF50' }]} onPress={() => accept(item)}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#F44336' }]} onPress={() => openDeclineModal(item)}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderRecurringGroup = (recurringBookingId, groupBookings) => {
    const parent = getParentById(groupBookings[0]?.parentId);
    const firstDate = new Date(groupBookings[0]?.date);
    const dayName = firstDate.toLocaleDateString('en-US', { weekday: 'long' });
    const timeStr = firstDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <View key={recurringBookingId} style={styles.recurringCard}>
        <View style={styles.recurringHeader}>
          <View style={styles.recurringIconCircle}>
            <Ionicons name="repeat" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recurringTitle}>Recurring Booking Request</Text>
            <Text style={styles.recurringSubtitle}>
              {parent?.name || 'Student'} • {dayName}s at {timeStr}
            </Text>
          </View>
        </View>

        <View style={styles.recurringCount}>
          <Ionicons name="calendar" size={18} color={colors.primary} />
          <Text style={styles.recurringCountText}>{groupBookings.length} sessions requested</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recurringDates}>
          {groupBookings.map((booking, idx) => (
            <View key={booking.id} style={styles.dateChip}>
              <Text style={styles.dateChipText}>
                {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.approveAllButton}
          onPress={() => handleApproveAllRecurring(recurringBookingId)}
        >
          <Ionicons name="checkmark-done" size={20} color={colors.white} />
          <Text style={styles.approveAllButtonText}>Approve All {groupBookings.length} Bookings</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Recurring Bookings Section */}
        {Object.keys(recurringGroups).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="repeat" size={18} color={colors.primary} /> Recurring Requests
            </Text>
            {Object.entries(recurringGroups).map(([recurringId, groupBookings]) =>
              renderRecurringGroup(recurringId, groupBookings)
            )}
          </View>
        )}

        {/* Single Bookings Section */}
        {singleBookings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="calendar-outline" size={18} color={colors.text} /> Individual Requests
            </Text>
            {singleBookings.map(item => (
              <View key={item.id}>
                {renderItem({ item })}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {bookings.length === 0 && !loading && (
          <View style={styles.empty}> 
            <Ionicons name="calendar-outline" size={54} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>You will see booking requests here</Text>
          </View>
        )}
      </ScrollView>

      {/* Decline Modal */}
      <Modal
        visible={declineModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Booking</Text>
              <TouchableOpacity onPress={() => setDeclineModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Reason for declining *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="E.g., I'm sick, family emergency, already booked..."
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={4}
                maxLength={300}
              />

              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setSuggestNewTime(!suggestNewTime)}
                >
                  <Ionicons
                    name={suggestNewTime ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={suggestNewTime ? colors.primary : colors.textSecondary}
                  />
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Suggest alternative time</Text>
              </View>

              {suggestNewTime && (
                <View style={styles.dateTimeSection}>
                  <Text style={styles.label}>Suggested Date & Time</Text>
                  
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {suggestedDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                    <Text style={styles.dateButtonText}>
                      {suggestedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={suggestedDate}
                      mode="date"
                      display="default"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                    />
                  )}

                  {showTimePicker && (
                    <DateTimePicker
                      value={suggestedDate}
                      mode="time"
                      display="default"
                      onChange={onTimeChange}
                    />
                  )}

                  <Text style={styles.helpText}>
                    Parent can accept this new time to confirm the booking
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.declineButton]}
                onPress={handleDecline}
              >
                <Text style={styles.declineButtonText}>Decline Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12 },
  headerRow: { marginBottom: 12 },
  parentBox: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  parentName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 2 },
  parentMeta: { fontSize: 13, color: colors.textSecondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#EEE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, color: colors.text },
  date: { fontSize: 14, fontWeight: '600', color: colors.text },
  notes: { fontSize: 13, color: colors.textSecondary, marginTop: 8, marginBottom: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnText: { color: colors.white, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 15,
    color: colors.text,
  },
  dateTimeSection: {
    marginTop: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border || '#E0E0E0',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  declineButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  // Recurring booking styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recurringIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recurringTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  recurringSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recurringCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  recurringCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  recurringDates: {
    marginBottom: 16,
  },
  dateChip: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  approveAllButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveAllButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default TeacherBookingsScreen;
