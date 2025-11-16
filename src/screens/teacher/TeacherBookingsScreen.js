import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeacherBookings, selectBookings, selectBookingsLoading, updateBookingStatus } from '../../store/slices/bookingsSlice';
import { useAuth } from '../../hooks/useAuth';
import { useAppData } from '../../hooks/useAppData';

const TeacherBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings);
  const loading = useSelector(selectBookingsLoading);
  const { getParentById, getParents } = useAppData();
  const { user } = useAuth();

  useEffect(() => {
    // Ensure parents are loaded so we can resolve parentId -> parent data
    (async () => {
      await getParents().catch(() => {});
      dispatch(fetchTeacherBookings());
    })();
  }, [dispatch]);

  const accept = (booking) => {
    dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'accepted',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || 'Opettaja',
      date: booking.date
    }));
  };
  
  const decline = (booking) => {
    dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'declined',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || 'Opettaja',
      date: booking.date
    }));
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
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#F44336' }]} onPress={() => decline(item)}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requests</Text>
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
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptyText}>You will see booking requests here</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => dispatch(fetchTeacherBookings())}
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
});

export default TeacherBookingsScreen;
