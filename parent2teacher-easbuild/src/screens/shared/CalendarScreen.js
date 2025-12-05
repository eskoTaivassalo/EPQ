import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Linking } from 'react-native';
import WatercolorBackground from '../../components/WatercolorBackground';
import BookingCalendar from '../../components/BookingCalendar';
import BookingParticipantCard from '../../components/BookingParticipantCard';
import { useSelector, useDispatch } from 'react-redux';
import { colors } from '../../styles/commonStyles';
import { fetchParentBookings, fetchTeacherBookings, selectBookings, selectBookingsLoading, cancelBooking } from '../../store/slices/bookingsSlice';

// Assumes bookings stored in bookings slice with items containing { id, date, status, teacherName, parentName }
export default function CalendarScreen() {
  const dispatch = useDispatch();
  const authUser = useSelector(state => state.auth.user);
  // Determine role (supports legacy userType field)
  const role = authUser?.role || authUser?.type || authUser?.userType;
  // Single bookings array in slice
  const bookingsSliceData = useSelector(selectBookings);
  const loading = useSelector(selectBookingsLoading);

  // Fetch appropriate bookings on mount / role change if empty
  useEffect(() => {
    if (!role) return;
    if (bookingsSliceData.length === 0) {
      if (role === 'teacher') {
        dispatch(fetchTeacherBookings());
      } else {
        dispatch(fetchParentBookings());
      }
    }
  }, [role, bookingsSliceData.length, dispatch]);

  const bookings = bookingsSliceData; // Already scoped by whichever fetch ran

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const onSelectDate = useCallback((iso, dayBookings) => {
    setSelectedDate(iso);
    setSelectedBookings(dayBookings);
    // Collect counterpart IDs
    const ids = new Set();
    dayBookings.forEach(b => {
      if (role === 'teacher' && b.parentId) ids.add(b.parentId);
      if (role === 'parent' && b.teacherId) ids.add(b.teacherId);
    });
    const missing = [...ids].filter(id => !profiles[id]);
    if (missing.length > 0) {
      // Dynamic import minimal overhead (could move to top-level)
      Promise.all(missing.map(async id => {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../../config/firebaseConfig');
          const colName = role === 'teacher' ? 'parents' : 'teachers';
          const snap = await getDoc(doc(db, colName, id));
          if (snap.exists()) return { id, ...snap.data() };
        } catch (e) { console.log('Profile fetch error', e); }
        return { id };
      })).then(results => {
        const map = {}; results.forEach(p => { map[p.id] = p; });
        setProfiles(prev => ({ ...prev, ...map }));
      });
    }
  }, [role, profiles]);

  const handleCancel = useCallback((booking) => {
    setBookingToCancel(booking);
    setCancelReason('');
    setShowCancelModal(true);
  }, []);

  const confirmCancel = () => {
    if (bookingToCancel) {
      dispatch(cancelBooking({ bookingId: bookingToCancel.id, reason: cancelReason.trim() }));
    }
    setShowCancelModal(false);
    setBookingToCancel(null);
    setCancelReason('');
  };

  const handleEdit = useCallback((booking) => {
    alert('Muokkaus tulossa myöhemmin');
  }, []);

  return (
    <View style={styles.container}>
      <WatercolorBackground />
      <BookingCalendar bookings={bookings} onSelectDate={onSelectDate} />
      {loading && <Text style={styles.loadingText}>Ladataan varauksia...</Text>}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#FFC107'}]} /><Text style={styles.legendLabel}>Odottaa</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#4CAF50'}]} /><Text style={styles.legendLabel}>Vahvistettu</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#F44336'}]} /><Text style={styles.legendLabel}>Hylätty</Text></View>
      </View>
      <Modal visible={!!selectedDate} transparent animationType="slide" onRequestClose={() => setSelectedDate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDate ? new Date(selectedDate).toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)} style={styles.closeIconBtn}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📅</Text>
                <Text style={styles.emptyText}>Ei varauksia tälle päivälle</Text>
              </View>
            ) : (
              <FlatList
                data={selectedBookings}
                keyExtractor={b => b.id}
                contentContainerStyle={styles.bookingsList}
                renderItem={({ item }) => (
                  <View style={styles.bookingCard}>
                    <BookingParticipantCard
                      profile={profiles[ role === 'teacher' ? item.parentId : item.teacherId ]}
                      roleLabel={role === 'teacher' ? 'Vanhempi' : 'Opettaja'}
                      booking={item}
                    />
                    <View style={styles.bookingActions}>
                      {(item.status === 'accepted' || item.status === 'confirmed') && item.meetingUrl && (
                        <TouchableOpacity style={styles.joinBtn} onPress={() => Linking.openURL(item.meetingUrl)}>
                          <Text style={styles.joinBtnText}>Liity videoon</Text>
                        </TouchableOpacity>
                      )}
                      {canCancel(item, authUser?.uid) && !isFinal(item.status) && (
                        <View style={styles.actionRow}>
                          {(item.status === 'pending' || item.status === 'booked') && (
                            <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                              <Text style={styles.editBtnText}>Muokkaa</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                            <Text style={styles.cancelBtnText}>Peruuta</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={[styles.modalBackdrop, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.cancelCard}>
            <Text style={styles.modalTitle}>⚠️ Peruuta varaus</Text>
            <Text style={styles.reasonLabel}>Peruutuksen syy</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Esim. Sairastapaus, tekninen ongelma..."
              placeholderTextColor="#999"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.cancelActions}>
              <TouchableOpacity style={styles.cancelSecondary} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.cancelSecondaryText}>Takaisin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelPrimary} onPress={confirmCancel}>
                <Text style={styles.cancelPrimaryText}>Vahvista peruutus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function statusText(status) {
  switch(status) {
    case 'pending': return 'Odottaa';
    case 'confirmed':
    case 'accepted':
      return 'Vahvistettu';
    case 'declined': return 'Hylätty';
    case 'cancelled_by_teacher': return 'Peruutettu (opettaja)';
    case 'cancelled_by_parent': return 'Peruutettu (vanhempi)';
    default: return status || 'Tuntematon';
  }
}

function isFinal(status) {
  return ['declined','cancelled_by_teacher','cancelled_by_parent'].includes(status);
}

function canCancel(booking, uid) {
  if (!uid) return false;
  return uid === booking.teacherId || uid === booking.parentId;
}

function counterpartLabel(booking, role) {
  if (role === 'teacher') return booking.parentName || 'Vanhempi';
  if (role === 'parent') return booking.teacherName || 'Opettaja';
  return 'Osapuoli';
}

const handleEdit = (booking) => {
  // Future: navigate to edit flow; placeholder alert for now
  alert('Muokkaus tulossa myöhemmin');
};

function handleCancel(booking) {
  // Simple prompt for reason
  const reason = prompt('Peruuta varaus - syy (esim. sairaus):') || '';
  // dispatch cancel
  // We cannot access dispatch here directly since function outside component; will refactor inline.
}


const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: colors.background },
  loadingText: { marginTop: 8, fontSize: 12, color: colors.textSecondary },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingHorizontal: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  legendLabel: { fontSize: 11, color: colors.textSecondary },
  
  // Modal backdrop
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  
  // Day view modal
  modalCard: { 
    backgroundColor: colors.white, 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: colors.text,
    textTransform: 'capitalize',
    flex: 1
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: { 
    color: colors.textSecondary, 
    fontSize: 16,
    fontWeight: '500'
  },
  
  // Bookings list
  bookingsList: {
    paddingBottom: 10
  },
  bookingCard: { 
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8'
  },
  bookingActions: {
    marginTop: 12,
    gap: 8
  },
  
  // Action buttons
  actionRow: { 
    flexDirection: 'row', 
    gap: 10,
    marginTop: 4
  },
  joinBtn: { 
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  joinBtnText: { 
    color: colors.white, 
    fontWeight: 'bold',
    fontSize: 15
  },
  cancelBtn: { 
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  cancelBtnText: { 
    color: colors.white, 
    fontSize: 15, 
    fontWeight: 'bold'
  },
  editBtn: { 
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  editBtnText: { 
    color: colors.white, 
    fontSize: 15, 
    fontWeight: 'bold'
  },
  
  // Cancel modal
  cancelCard: { 
    backgroundColor: colors.white, 
    borderRadius: 10, 
    padding: 20, 
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  reasonLabel: { 
    fontSize: 14, 
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8
  },
  reasonInput: { 
    minHeight: 100,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 15,
    textAlignVertical: 'top',
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  cancelActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    marginTop: 20, 
    gap: 10 
  },
  cancelSecondary: { 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    borderRadius: 8
  },
  cancelSecondaryText: { 
    color: colors.textSecondary, 
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelPrimary: { 
    backgroundColor: colors.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  cancelPrimaryText: { 
    color: colors.white, 
    fontWeight: 'bold',
    fontSize: 16
  },
  cancelReason: { 
    fontSize: 11, 
    color: '#F44336', 
    marginTop: 4 
  }
});
