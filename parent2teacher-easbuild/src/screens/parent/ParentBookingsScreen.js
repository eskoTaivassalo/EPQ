import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useDispatch, useSelector } from 'react-redux';
import { fetchParentBookings, selectBookings, selectBookingsLoading, updateBookingStatus, addExceptionDate } from '../../store/slices/bookingsSlice';
import { useAppData } from '../../hooks/useAppData';
import ExceptionDateModal from '../../components/ExceptionDateModal';
import { Alert } from 'react-native';

const ParentBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings);
  const loading = useSelector(selectBookingsLoading);
  const { getTeacherById, getTeachers } = useAppData();
  
  const [exceptionModalVisible, setExceptionModalVisible] = React.useState(false);
  const [selectedRecurringBookingId, setSelectedRecurringBookingId] = React.useState(null);

  useEffect(() => {
    // Ensure teachers are loaded so we can resolve teacherId -> teacher data
    (async () => {
      await getTeachers().catch(() => {});
      dispatch(fetchParentBookings());
    })();
  }, [dispatch]);

  // Group recurring bookings
  const recurringGroups = React.useMemo(() => {
    const groups = {};
    bookings.forEach(booking => {
      if (booking.recurringBookingId) {
        if (!groups[booking.recurringBookingId]) {
          groups[booking.recurringBookingId] = [];
        }
        groups[booking.recurringBookingId].push(booking);
      }
    });
    return groups;
  }, [bookings]);

  // Get booked dates for a recurring series
  const getRecurringBookedDates = (recurringBookingId) => {
    return recurringGroups[recurringBookingId]?.map(b => b.date) || [];
  };

  const cancel = async (bookingId) => {
    try {
      await dispatch(updateBookingStatus({ bookingId, status: 'cancelled' })).unwrap();
    } catch (e) {
      alert('Cancel failed: ' + e);
    }
  };

  const handleOpenExceptionModal = (recurringBookingId) => {
    setSelectedRecurringBookingId(recurringBookingId);
    setExceptionModalVisible(true);
  };

  const handleConfirmException = async ({ date, reason }) => {
    if (!selectedRecurringBookingId) return;

    try {
      await dispatch(addExceptionDate({
        recurringBookingId: selectedRecurringBookingId,
        exceptionDate: date.toISOString(),
        reason,
      })).unwrap();

      Alert.alert('Success', 'Your teacher has been notified');
      setExceptionModalVisible(false);
      setSelectedRecurringBookingId(null);
      
      // Refresh bookings
      dispatch(fetchParentBookings());
    } catch (err) {
      Alert.alert('Error', 'Failed to add exception: ' + err);
    }
  };

  const renderItem = ({ item }) => {
    const when = new Date(item.date);
    const teacher = getTeacherById(item.teacherId);
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.teacherBox}>
            <View style={styles.avatarContainer}>
              {teacher?.photoURL ? (
                <Image source={{ uri: teacher.photoURL }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Ionicons name="person" size={26} color={colors.white} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teacherName} numberOfLines={1}>
                {teacher?.name || teacher?.fullName || teacher?.displayName || 'Teacher'}
              </Text>
              <Text style={styles.teacherMeta} numberOfLines={1}>
                {teacher?.subjects?.slice(0, 2).join(', ') || '—'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewBtn} onPress={() => navigation.navigate('TeacherWeeklyAvailability', { 
            teacherId: item.teacherId,
            teacherName: teacher?.name || teacher?.fullName || teacher?.displayName || 'Teacher'
          })}>
            <Ionicons name="calendar" size={18} color={colors.white} />
            <Text style={styles.viewBtnText}>See calendar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <View style={styles.badge}><Text style={styles.badgeText}>{item.status}</Text></View>
          <Text style={styles.date}>{when.toLocaleString()}</Text>
        </View>
        
        {/* Decline reason */}
        {item.status === 'declined' && item.declineReason && (
          <View style={styles.declineReasonBox}>
            <Ionicons name="information-circle" size={16} color="#F44336" />
            <Text style={styles.declineReasonText}>{item.declineReason}</Text>
          </View>
        )}
        
        {/* Suggested new time */}
        {item.status === 'declined' && item.suggestedDate && item.awaitingReschedule && (
          <View style={styles.suggestedTimeBox}>
            <View style={styles.suggestedTimeHeader}>
              <Ionicons name="time" size={18} color={colors.primary} />
              <Text style={styles.suggestedTimeTitle}>New Time Suggested</Text>
            </View>
            <Text style={styles.suggestedTimeText}>
              {new Date(item.suggestedDate).toLocaleString()}
            </Text>
            <View style={styles.suggestedActions}>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#4CAF50', flex: 1 }]}
                onPress={() => {/* TODO: Accept suggested time */}}
              >
                <Text style={styles.btnText}>Accept New Time</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: '#999', flex: 1 }]}
                onPress={() => cancel(item.id)}
              >
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#999' }]} onPress={() => cancel(item.id)}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {item.isRecurring && item.recurringBookingId && item.status === 'accepted' && (
            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: '#FF9800' }]} 
              onPress={() => handleOpenExceptionModal(item.recurringBookingId)}
            >
              <Ionicons name="alert-circle" size={16} color={colors.white} />
              <Text style={styles.btnText}>Cannot Attend</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Recurring indicator */}
        {item.isRecurring && (
          <View style={styles.recurringIndicator}>
            <Ionicons name="repeat" size={14} color={colors.primary} />
            <Text style={styles.recurringIndicatorText}>Recurring booking</Text>
          </View>
        )}
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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}> 
            <Ionicons name="calendar-outline" size={54} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>Find a teacher and schedule your first lesson</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => dispatch(fetchParentBookings())}
      />

      <ExceptionDateModal
        visible={exceptionModalVisible}
        onConfirm={handleConfirmException}
        onClose={() => {
          setExceptionModalVisible(false);
          setSelectedRecurringBookingId(null);
        }}
        bookedDates={selectedRecurringBookingId ? getRecurringBookedDates(selectedRecurringBookingId) : []}
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
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  teacherBox: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10, overflow: 'hidden' },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  teacherName: { fontSize: 15, fontWeight: '600', color: colors.text },
  teacherMeta: { fontSize: 12, color: colors.textSecondary },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  viewBtnText: { color: colors.white, fontWeight: '600', marginLeft: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { backgroundColor: '#EEE', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 12, color: colors.text },
  date: { fontSize: 14, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnText: { color: colors.white, fontWeight: '600' },
  declineReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  declineReasonText: {
    flex: 1,
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
  },
  suggestedTimeBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  suggestedTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  suggestedTimeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  suggestedTimeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  suggestedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  recurringIndicatorText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
});

export default ParentBookingsScreen;
