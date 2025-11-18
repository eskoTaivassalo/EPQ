import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';

export default function TeacherAvailableSlotsScreen({ route, navigation }) {
  const { teacherId, teacherName } = route.params || {};
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 30);
        const data = await listAvailableSlots(teacherId, from, to);
        
        // Filter out past slots and slots less than 2 hours from now
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours in milliseconds
        
        const validSlots = data.filter(slot => {
          const slotStart = new Date(slot.start);
          // Slot must be in the future AND at least 2 hours from now
          return slotStart > twoHoursFromNow;
        });
        
        console.log(`📅 Filtered ${data.length} slots to ${validSlots.length} valid slots (>2h from now)`);
        setSlots(validSlots);
      } catch (e) {
        console.error('Load slots error', e);
        Alert.alert('Error', e.message || 'Failed to load slots');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teacherId]);

  const handleBook = async (slot) => {
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');
    
    // Double-check that slot is still valid (at least 2 hours from now)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const slotStart = new Date(slot.start);
    
    if (slotStart <= twoHoursFromNow) {
      Alert.alert(
        'Cannot Book',
        'This time slot is too soon. Please book a time at least 2 hours in advance.',
        [{ text: 'OK' }]
      );
      // Remove this slot from the list
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      return;
    }
    
    try {
      const ok = await new Promise(resolve => {
        Alert.alert(
          'Confirm booking',
          `${new Date(slot.start).toLocaleString()} - ${new Date(slot.end).toLocaleTimeString()}`,
          [ { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Book', onPress: () => resolve(true) } ]
        );
      });
      if (!ok) return;

      const res = await bookSlot(slot.id, user.uid, {});
      Alert.alert('Booked', 'Your lesson has been booked');
      // remove from list
      setSlots(prev => prev.filter(s => s.id !== slot.id));
    } catch (e) {
      console.error('Book slot error', e);
      Alert.alert('Error', e.message || 'Failed to book');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.slot} onPress={() => handleBook(item)}>
      <Ionicons name="calendar" size={20} color={colors.primary} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text style={styles.slotDate}>{new Date(item.start).toLocaleDateString()}</Text>
        <Text style={styles.slotTime}>{new Date(item.start).toLocaleTimeString()} - {new Date(item.end).toLocaleTimeString()}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teacherName || 'Available times'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loading}><Text>Loading…</Text></View>
      ) : (
        <FlatList 
          data={slots} 
          keyExtractor={(i) => i.id} 
          renderItem={renderItem} 
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}> 
              <Ionicons name="information-circle-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No available times</Text>
              <Text style={styles.emptyText}>
                This teacher hasn't published availability yet, or all available times are within the next 2 hours.{'\n\n'}
                Bookings must be made at least 2 hours in advance.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backButton: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slot: { backgroundColor: colors.white, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  slotDate: { fontSize: 14, color: colors.text },
  slotTime: { fontSize: 12, color: colors.textLight },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
});