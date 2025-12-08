/**
 * TeacherCalendarScreen - Unified calendar view for teachers
 * 
 * Shows:
 * - Personal availability slots (what teacher has set as available)
 * - Booked sessions (confirmed bookings with students)
 * - Pending requests (booking requests waiting for approval)
 * - Blocked time (unavailable periods)
 * 
 * Synchronizes with:
 * - Firestore availability slots
 * - Bookings collection
 * - Future: Google Calendar, Outlook, Apple Calendar
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-big-calendar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getRoleColors, getCanonicalRole } from '../../config/roleConfig';
import WatercolorBackground from '../../components/WatercolorBackground';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const TeacherCalendarScreen = ({ navigation }) => {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleColors = getRoleColors(role);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'available', 'booked', 'pending'
  const [calendarMode, setCalendarMode] = useState('week'); // 'day', 'week', 'month'

  // Calculate date range based on calendar mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (calendarMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (calendarMode === 'week') {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (calendarMode === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  }, [currentDate, calendarMode]);

  // Load calendar data
  const loadCalendarData = useCallback(async () => {
    if (!user?.uid || !db) return;

    try {
      setLoading(true);
      const { start, end } = dateRange;
      const fromISO = start.toISOString().split('T')[0];
      const toISO = end.toISOString().split('T')[0];

      const allEvents = [];

      // 1. Load availability slots (teacher's available times)
      const slotsQuery = query(
        collection(db, 'availabilitySlots'),
        where('teacherId', '==', user.uid),
        where('date', '>=', fromISO),
        where('date', '<=', toISO),
        orderBy('date', 'asc')
      );
      const slotsSnapshot = await getDocs(slotsQuery);
      
      slotsSnapshot.docs.forEach(doc => {
        const slot = doc.data();
        const eventType = slot.status === 'available' ? 'available' : 
                         slot.status === 'booked' ? 'booked' : 'blocked';
        
        allEvents.push({
          id: doc.id,
          title: slot.status === 'available' ? '🟢 Available' : 
                 slot.status === 'booked' ? '🔵 Booked' : '⚫ Blocked',
          start: new Date(slot.start),
          end: new Date(slot.end),
          type: eventType,
          status: slot.status,
          data: slot,
        });
      });

      // 2. Load bookings (confirmed and pending sessions)
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('teacherId', '==', user.uid),
        where('date', '>=', fromISO),
        where('date', '<=', toISO),
        orderBy('date', 'asc')
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      
      for (const doc of bookingsSnapshot.docs) {
        const booking = doc.data();
        
        // Get student name
        let studentName = 'Student';
        if (booking.parentId) {
          try {
            const parentDoc = await getDocs(
              query(collection(db, 'parents'), where('userId', '==', booking.parentId))
            );
            if (!parentDoc.empty) {
              const parentData = parentDoc.docs[0].data();
              studentName = parentData.name || parentData.fullName || 'Student';
            }
          } catch (error) {
            console.log('Could not fetch student name:', error);
          }
        }

        const isPending = booking.status === 'pending';
        const isConfirmed = booking.status === 'confirmed' || booking.status === 'booked';
        const isCancelled = booking.status === 'cancelled';
        
        if (!isCancelled) {
          allEvents.push({
            id: doc.id,
            title: isPending ? `⏳ ${studentName} (Pending)` : 
                   isConfirmed ? `✅ ${studentName}` : `📅 ${studentName}`,
            start: new Date(booking.start),
            end: new Date(booking.end),
            type: isPending ? 'pending' : 'booked',
            status: booking.status,
            data: booking,
            studentName,
          });
        }
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, dateRange]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  // Filter events based on filter type
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    return events.filter(event => event.type === filterType);
  }, [events, filterType]);

  // Event styling
  const eventStyle = (event) => {
    const baseStyle = {
      borderRadius: 8,
      padding: 4,
      borderLeftWidth: 4,
    };

    switch (event.type) {
      case 'available':
        return {
          ...baseStyle,
          backgroundColor: '#d4edda',
          borderLeftColor: '#28a745',
        };
      case 'booked':
        return {
          ...baseStyle,
          backgroundColor: '#d1ecf1',
          borderLeftColor: '#17a2b8',
        };
      case 'pending':
        return {
          ...baseStyle,
          backgroundColor: '#fff3cd',
          borderLeftColor: '#ffc107',
        };
      case 'blocked':
        return {
          ...baseStyle,
          backgroundColor: '#f8d7da',
          borderLeftColor: '#dc3545',
        };
      default:
        return baseStyle;
    }
  };

  const handleEventPress = (event) => {
    const { type, data, studentName } = event;
    
    if (type === 'pending') {
      Alert.alert(
        'Booking Request',
        `${studentName} wants to book:\n${new Date(event.start).toLocaleString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Details', 
            onPress: () => navigation.navigate('Bookings')
          },
        ]
      );
    } else if (type === 'booked') {
      Alert.alert(
        'Booked Session',
        `Session with ${studentName}\n${new Date(event.start).toLocaleString()}`,
        [
          { text: 'OK' },
          { 
            text: 'View Details', 
            onPress: () => navigation.navigate('Bookings')
          },
        ]
      );
    } else if (type === 'available') {
      Alert.alert(
        'Available Slot',
        `This time slot is available for booking\n${new Date(event.start).toLocaleString()}`,
        [
          { text: 'OK' },
          { 
            text: 'Block Time', 
            onPress: () => {
              // TODO: Implement block time functionality
              Alert.alert('Coming Soon', 'Block time feature will be added');
            }
          },
        ]
      );
    }
  };

  const renderStats = () => {
    const stats = {
      available: events.filter(e => e.type === 'available').length,
      booked: events.filter(e => e.type === 'booked').length,
      pending: events.filter(e => e.type === 'pending').length,
    };

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: '#28a745' }]} />
          <Text style={styles.statLabel}>Available</Text>
          <Text style={styles.statValue}>{stats.available}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: '#17a2b8' }]} />
          <Text style={styles.statLabel}>Booked</Text>
          <Text style={styles.statValue}>{stats.booked}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statDot, { backgroundColor: '#ffc107' }]} />
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={styles.statValue}>{stats.pending}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Calendar</Text>
        <TouchableOpacity onPress={loadCalendarData}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All', icon: 'calendar' },
          { key: 'available', label: 'Available', icon: 'time' },
          { key: 'booked', label: 'Booked', icon: 'checkmark-circle' },
          { key: 'pending', label: 'Pending', icon: 'hourglass' },
        ].map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              filterType === filter.key && { backgroundColor: roleColors.primary },
            ]}
            onPress={() => setFilterType(filter.key)}
          >
            <Ionicons 
              name={filter.icon} 
              size={18} 
              color={filterType === filter.key ? '#FFFFFF' : roleColors.text} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === filter.key && styles.filterButtonTextActive,
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Calendar Mode Selector */}
      <View style={styles.modeSelector}>
        {['day', 'week', 'month'].map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              calendarMode === mode && { backgroundColor: roleColors.primary },
            ]}
            onPress={() => setCalendarMode(mode)}
          >
            <Text style={[
              styles.modeButtonText,
              calendarMode === mode && { color: '#FFFFFF' },
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendar */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={roleColors.primary} />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      ) : (
        <Calendar
          events={filteredEvents}
          height={600}
          mode={calendarMode}
          date={currentDate}
          onPressEvent={handleEventPress}
          onChangeDate={setCurrentDate}
          eventCellStyle={eventStyle}
          swipeEnabled={true}
        />
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: roleColors.primary }]}
          onPress={() => navigation.navigate('Availability')}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Set Availability</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: roleColors.secondary }]}
          onPress={() => {
            Alert.alert('Coming Soon', 'Sync with Google Calendar feature will be added');
          }}
        >
          <Ionicons name="sync" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Sync Calendar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6C757D',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TeacherCalendarScreen;
