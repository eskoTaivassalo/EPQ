import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Linking } from 'react-native';
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
      <BookingCalendar bookings={bookings} onSelectDate={onSelectDate} />
      {loading && <Text style={styles.loadingText}>Ladataan varauksia...</Text>}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#FFC107'}]} /><Text style={styles.legendLabel}>Odottaa</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#4CAF50'}]} /><Text style={styles.legendLabel}>Vahvistettu</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot,{backgroundColor:'#F44336'}]} /><Text style={styles.legendLabel}>Hylätty</Text></View>
      </View>
      <Modal visible={!!selectedDate} transparent animationType="fade" onRequestClose={() => setSelectedDate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedDate}</Text>
            {selectedBookings.length === 0 ? (
              <Text style={styles.emptyText}>Ei varauksia</Text>
            ) : (
              <FlatList
                data={selectedBookings}
                keyExtractor={b => b.id}
                renderItem={({ item }) => (
                  <View style={styles.bookingRow}>
                    <BookingParticipantCard
                      profile={profiles[ role === 'teacher' ? item.parentId : item.teacherId ]}
                      roleLabel={role === 'teacher' ? 'Vanhempi' : 'Opettaja'}
                      booking={item}
                    />
                    {(item.status === 'accepted' || item.status === 'confirmed') && item.meetingUrl && (
                      <TouchableOpacity style={styles.joinBtn} onPress={() => Linking.openURL(item.meetingUrl)}>
                        <Text style={styles.joinBtnText}>Liity</Text>
                      </TouchableOpacity>
                    )}
                    {canCancel(item, authUser?.uid) && !isFinal(item.status) && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                          <Text style={styles.cancelBtnText}>Peruuta</Text>
                        </TouchableOpacity>
                        {/* Only allow editing for requests that are not yet confirmed. */}
                        {/* TODO: In future, enable reschedule flow with mutual acknowledgment for confirmed bookings. */}
                        {(item.status === 'pending' || item.status === 'booked') && (
                          <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(item)}>
                            <Text style={styles.editBtnText}>Muokkaa</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              />
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedDate(null)}>
              <Text style={styles.closeBtnText}>Sulje</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.cancelCard}>
            <Text style={styles.modalTitle}>Peruuta varaus</Text>
            <Text style={styles.reasonLabel}>Peruutuksen syy</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Esim. Sairastapaus, tekninen ongelma..."
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
  container:{flex:1,padding:12,backgroundColor:colors.background},
  loadingText:{marginTop:8,fontSize:12,color:colors.textSecondary},
  legendRow:{flexDirection:'row',justifyContent:'space-around',marginTop:12,paddingHorizontal:8},
  legendItem:{flexDirection:'row',alignItems:'center'},
  legendDot:{width:10,height:10,borderRadius:5,marginRight:4},
  legendLabel:{fontSize:11,color:colors.textSecondary},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.45)',alignItems:'center',justifyContent:'center',padding:16},
  cancelCard:{backgroundColor:colors.white,borderRadius:12,padding:16,width:'90%'},
  reasonLabel:{fontSize:12,color:colors.textSecondary,marginBottom:4},
  reasonInput:{minHeight:80,backgroundColor:colors.background,borderRadius:8,padding:10,textAlignVertical:'top',color:colors.text},
  cancelActions:{flexDirection:'row',justifyContent:'flex-end',marginTop:12,gap:12},
  cancelSecondary:{paddingHorizontal:12,paddingVertical:10},
  cancelSecondaryText:{color:colors.textSecondary,fontWeight:'600'},
  cancelPrimary:{backgroundColor:colors.primary,paddingHorizontal:14,paddingVertical:10,borderRadius:8},
  cancelPrimaryText:{color:colors.white,fontWeight:'700'},
  modalCard:{backgroundColor:colors.white,borderRadius:12,padding:16,width:'90%',maxHeight:'70%'},
  modalTitle:{fontSize:16,fontWeight:'700',marginBottom:8,color:colors.text},
  emptyText:{color:colors.textSecondary,fontStyle:'italic'},
  bookingRow:{marginBottom:10,paddingBottom:6,borderBottomWidth:1,borderBottomColor:'#eee'},
  closeBtn:{marginTop:12,alignSelf:'flex-end',backgroundColor:colors.primary,paddingHorizontal:16,paddingVertical:8,borderRadius:8},
  closeBtnText:{color:colors.white,fontWeight:'600'},
  actionRow:{flexDirection:'row',gap:8,marginTop:8},
  joinBtn:{backgroundColor:colors.primary,paddingVertical:8,paddingHorizontal:12,borderRadius:8,alignSelf:'flex-start',marginTop:8},
  joinBtnText:{color:'#fff',fontWeight:'700'},
  cancelBtn:{backgroundColor:'#F44336',paddingHorizontal:12,paddingVertical:8,borderRadius:8},
  cancelBtnText:{color:colors.white,fontSize:12,fontWeight:'600'},
  editBtn:{backgroundColor:colors.secondary,paddingHorizontal:12,paddingVertical:8,borderRadius:8},
  editBtnText:{color:colors.white,fontSize:12,fontWeight:'600'},
  cancelReason:{fontSize:11,color:'#F44336',marginTop:4}
});
