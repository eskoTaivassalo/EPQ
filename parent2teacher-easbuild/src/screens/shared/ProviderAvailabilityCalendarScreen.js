import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Agenda } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';
import { toISODate } from '../../utils/dateUtils';

/**
 * Calendar-based view for a provider's availability.
 * - Shows the next 30 days.
 * - Each day lists available slots; tapping a slot books it.
 */
export default function ProviderAvailabilityCalendarScreen({ route, navigation }) {
  const { teacherId, teacherName } = route.params || {}; // TODO: rename to providerId, providerName
  const { user } = useAuth();
  const [items, setItems] = useState({});
  const [hasAnySlots, setHasAnySlots] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 30);
      
      console.log('🔍 Calendar view loading:', {
        from: from.toLocaleString(),
        to: to.toLocaleString()
      });
      
      const data = await listAvailableSlots(teacherId, from, to);
      console.log(`📦 Loaded ${data.length} slots from Firestore`);
      
      const sundaySlots = data.filter(s => new Date(s.start).getDay() === 0);
      if (sundaySlots.length > 0) {
        console.log(`📅 Found ${sundaySlots.length} Sunday slots:`, sundaySlots.map(s => ({
          date: s.date,
          start: s.start,
          id: s.id
        })));
      }

      // Create base map with empty days (Agenda shows renderEmptyDate for these)
      // IMPORTANT: Use toISODate to ensure Sunday dates are handled correctly (local timezone)
      const base = {};
      const cursor = new Date(from);
      while (cursor <= to) {
        const iso = toISODate(cursor);
        base[iso] = [];
        cursor.setDate(cursor.getDate() + 1);
      }

      // Group slots by ISO date (YYYY-MM-DD)
      const grouped = { ...base };
      let sundayGrouped = 0;
      for (const s of data) {
        // Validate slot dates
        if (!s.start || !s.end) {
          console.warn('Slot missing start/end:', s.id);
          continue;
        }
        
        try {
          const startDate = new Date(s.start);
          const endDate = new Date(s.end);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.warn('Invalid slot dates:', s.id, s.start, s.end);
            continue;
          }
          
          // IMPORTANT: Use toISODate to ensure Sunday slots appear on correct day (use local timezone, not UTC)
          const d = (s.date || toISODate(startDate));
          if (!grouped[d]) grouped[d] = [];
          grouped[d].push({
            name: `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            slot: s,
            height: 60,
          });
          
          if (startDate.getDay() === 0) {
            sundayGrouped++;
            console.log(`📅 Grouped Sunday slot under date: ${d}`, {
              slotDate: s.date,
              computedDate: d,
              startTime: startDate.toLocaleString()
            });
          }
        } catch (error) {
          console.warn('Error processing slot:', s.id, error);
        }
      }
      
      console.log(`✅ Calendar grouped ${sundayGrouped} Sunday slots`);
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

    // Validate dates before showing alert
    if (!s.start || !s.end) {
      return Alert.alert('Error', 'Invalid slot data');
    }
    
    try {
      const startDate = new Date(s.start);
      const endDate = new Date(s.end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return Alert.alert('Error', 'Invalid slot dates');
      }

      const ok = await new Promise(resolve => {
        Alert.alert(
          'Confirm booking',
          `${startDate.toLocaleString()} - ${endDate.toLocaleTimeString()}`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Book', onPress: () => resolve(true) },
          ]
        );
      });
      if (!ok) return;
    } catch (error) {
      console.error('Error formatting slot dates:', error);
      return Alert.alert('Error', 'Invalid slot data');
    }

    setBookingInProgress(true);
    try {
      await bookSlot(s.id, user.uid, {});
      Alert.alert('Booked', 'Your session has been booked');
      // Remove from calendar
      setItems(prev => {
        const d = s.date;
        const rest = (prev[d] || []).filter(x => x.slot.id !== s.id);
        return { ...prev, [d]: rest };
      });
    } catch (e) {
      console.error('Book slot error', e);
      Alert.alert('Error', e.message || 'Failed to book');
    } finally {
      setBookingInProgress(false);
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

  // IMPORTANT: Use toISODate to ensure today's date is in local timezone (Sunday fix)
  const today = useMemo(() => toISODate(new Date()), []);

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
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
