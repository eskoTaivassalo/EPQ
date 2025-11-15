import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Agenda } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';

/**
 * Calendar-based view for a teacher's availability.
 * - Shows the next 30 days.
 * - Each day lists available slots; tapping a slot books it.
 */
export default function TeacherAvailabilityCalendarScreen({ route, navigation }) {
  const { teacherId, teacherName } = route.params || {};
  const { user } = useAuth();
  const [items, setItems] = useState({});
  const [hasAnySlots, setHasAnySlots] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const data = await listAvailableSlots(teacherId, from, to);

      // Create base map with empty days (Agenda shows renderEmptyDate for these)
      const base = {};
      const cursor = new Date(from);
      while (cursor <= to) {
        const iso = cursor.toISOString().slice(0,10);
        base[iso] = [];
        cursor.setDate(cursor.getDate() + 1);
      }

      // Group slots by ISO date (YYYY-MM-DD)
      const grouped = { ...base };
      for (const s of data) {
        const d = (s.date || new Date(s.start).toISOString().slice(0,10));
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push({
          name: `${new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(s.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          slot: s,
          height: 60,
        });
      }
      setItems(grouped);
      setHasAnySlots((data || []).length > 0);
    } catch (e) {
      console.error('Load calendar slots error', e);
      Alert.alert('Error', e.message || 'Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [teacherId]);

  const onItemPress = async (it) => {
    const s = it.slot;
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');

    const ok = await new Promise(resolve => {
      Alert.alert(
        'Confirm booking',
        `${new Date(s.start).toLocaleString()} - ${new Date(s.end).toLocaleTimeString()}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Book', onPress: () => resolve(true) },
        ]
      );
    });
    if (!ok) return;

    try {
      await bookSlot(s.id, user.uid, {});
      Alert.alert('Booked', 'Your lesson has been booked');
      // Remove from calendar
      setItems(prev => {
        const d = s.date;
        const rest = (prev[d] || []).filter(x => x.slot.id !== s.id);
        return { ...prev, [d]: rest };
      });
    } catch (e) {
      console.error('Book slot error', e);
      Alert.alert('Error', e.message || 'Failed to book');
    }
  };

  const renderItem = (it) => (
    <View style={styles.item}>
      <Ionicons name="time" size={18} color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={styles.itemText} onPress={() => onItemPress(it)}>{it.name}</Text>
    </View>
  );

  const renderEmptyDate = () => (
    <View style={styles.emptyDate}><Text style={styles.emptyDateText}>No available times</Text></View>
  );

  const today = useMemo(() => new Date().toISOString().slice(0,10), []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{teacherName || 'Available times'}</Text>
      </View>
      {!loading && !hasAnySlots && (
        <View style={styles.emptyTopBanner}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.emptyTopBannerText}>This teacher hasn’t published availability yet. Please check back later.</Text>
        </View>
      )}
      <Agenda
        items={items}
        selected={today}
        refreshing={loading}
        renderItem={renderItem}
        renderEmptyDate={renderEmptyDate}
        theme={{
          selectedDayBackgroundColor: colors.secondary,
          todayTextColor: colors.secondary,
          agendaDayTextColor: colors.textSecondary,
          agendaDayNumColor: colors.textSecondary,
          agendaTodayColor: colors.secondary,
        }}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  item: { backgroundColor: colors.white, marginRight: 10, marginTop: 17, borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  itemText: { color: colors.text, fontSize: 14 },
  emptyDate: { height: 40, justifyContent: 'center', paddingLeft: 16 },
  emptyDateText: { color: colors.textSecondary },
  emptyTopBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, borderBottomColor: colors.border, borderBottomWidth: 1 },
  emptyTopBannerText: { color: colors.textSecondary, flex: 1 },
});
