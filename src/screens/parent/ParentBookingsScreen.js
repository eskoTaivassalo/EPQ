import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useDispatch, useSelector } from 'react-redux';
import { fetchParentBookings, selectBookings, selectBookingsLoading, updateBookingStatus } from '../../store/slices/bookingsSlice';
import { useAppData } from '../../hooks/useAppData';

const ParentBookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings);
  const loading = useSelector(selectBookingsLoading);
  const { getTeacherById, getTeachers } = useAppData();

  useEffect(() => {
    // Ensure teachers are loaded so we can resolve teacherId -> teacher data
    (async () => {
      await getTeachers().catch(() => {});
      dispatch(fetchParentBookings());
    })();
  }, [dispatch]);

  const cancel = async (bookingId) => {
    try {
      await dispatch(updateBookingStatus({ bookingId, status: 'cancelled' })).unwrap();
    } catch (e) {
      alert('Cancel failed: ' + e);
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
        <View style={styles.actions}>
          {item.status === 'pending' && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#999' }]} onPress={() => cancel(item.id)}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
});

export default ParentBookingsScreen;
