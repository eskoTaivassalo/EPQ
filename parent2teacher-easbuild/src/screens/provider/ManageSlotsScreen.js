import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, writeBatch, collectionGroup } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';

/**
 * ManageSlotsScreen - Teacher can view and delete their availability slots
 * Allows teachers to manage vacation time, remove slots, etc.
 */
export default function ManageSlotsScreen({ navigation }) {
  const { user } = useAuth();
  const [allSlots, setAllSlots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // 'upcoming', 'booked', 'all'

  useEffect(() => {
    loadSlots();
  }, [user?.uid]);

  // Apply filter locally instead of refetching from Firestore
  useEffect(() => {
    applyFilter();
  }, [filter, allSlots]);

  const applyFilter = () => {
    const now = new Date().toISOString();
    let filtered = [...allSlots];
    
    if (filter === 'upcoming') {
      filtered = filtered.filter(s => 
        s.status === 'available' && s.start > now
      );
    } else if (filter === 'booked') {
      filtered = filtered.filter(s => s.status === 'booked');
    }
    
    setSlots(filtered);
  };

  const loadSlots = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Use collectionGroup to query across hierarchical structure
      let q = query(
        collectionGroup(db, 'availabilitySlots'),
        where('teacherId', '==', user.uid),
        orderBy('start', 'asc')
      );

      const snapshot = await getDocs(q);
      
      let fetchedSlots = snapshot.docs.map(doc => ({
        id: doc.id,
        ref: doc.ref, // Store reference for deletion
        ...doc.data()
      })).filter(slot => {
        // Filter out slots with invalid dates
        if (!slot.start || !slot.end) return false;
        try {
          const testStart = new Date(slot.start);
          const testEnd = new Date(slot.end);
          if (isNaN(testStart.getTime()) || isNaN(testEnd.getTime())) {
            return false;
          }
          return true;
        } catch (e) {
          return false;
        }
      });
      
      setAllSlots(fetchedSlots);
      
      // Apply filter immediately to show data
      const now = new Date().toISOString();
      let filtered = [...fetchedSlots];
      
      if (filter === 'upcoming') {
        filtered = filtered.filter(s => 
          s.status === 'available' && s.start > now
        );
      } else if (filter === 'booked') {
        filtered = filtered.filter(s => s.status === 'booked');
      }
      
      setSlots(filtered);
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load time slots');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteSlot = (slot) => {
    if (slot.status === 'booked') {
      Alert.alert(
        'Cannot Delete',
        'This time slot is already booked. Please cancel the booking first.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Time Slot',
      `Delete ${new Date(slot.start).toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(slot.ref);
              setAllSlots(prev => prev.filter(s => s.id !== slot.id));
              Alert.alert('Deleted', 'Time slot removed');
            } catch (error) {
              console.error('Error deleting slot:', error);
              Alert.alert('Error', 'Failed to delete slot');
            }
          }
        }
      ]
    );
  };

  const handleBulkDelete = () => {
    const availableSlots = slots.filter(s => s.status === 'available');
    if (availableSlots.length === 0) {
      Alert.alert('No Slots', 'No available slots to delete');
      return;
    }

    Alert.alert(
      'Bulk Delete',
      `Delete all ${availableSlots.length} available time slots?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              availableSlots.forEach(slot => {
                batch.delete(slot.ref);
              });
              await batch.commit();
              
              setAllSlots(prev => prev.filter(s => s.status !== 'available'));
              Alert.alert('Success', `${availableSlots.length} slots deleted`);
            } catch (error) {
              console.error('Error bulk deleting:', error);
              Alert.alert('Error', 'Failed to delete slots');
            }
          }
        }
      ]
    );
  };

  const handleDeleteDateRange = () => {
    Alert.prompt(
      'Delete Date Range',
      'Enter number of days from now (e.g., 7 for next week)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async (daysText) => {
            const days = parseInt(daysText);
            if (isNaN(days) || days <= 0) {
              Alert.alert('Invalid Input', 'Please enter a valid number');
              return;
            }

            const now = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            const slotsToDelete = slots.filter(s => 
              s.status === 'available' &&
              new Date(s.start) >= now &&
              new Date(s.start) <= endDate
            );

            if (slotsToDelete.length === 0) {
              Alert.alert('No Slots', `No available slots in the next ${days} days`);
              return;
            }

            Alert.alert(
              'Confirm Delete',
              `Delete ${slotsToDelete.length} slots in the next ${days} days?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const batch = writeBatch(db);
                      slotsToDelete.forEach(slot => {
                        batch.delete(slot.ref);
                      });
                      await batch.commit();
                      
                      setAllSlots(prev => prev.filter(s => !slotsToDelete.find(ds => ds.id === s.id)));
                      Alert.alert('Success', `${slotsToDelete.length} slots deleted`);
                    } catch (error) {
                      console.error('Error deleting range:', error);
                      Alert.alert('Error', 'Failed to delete slots');
                    }
                  }
                }
              ]
            );
          }
        }
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  const renderSlot = ({ item }) => {
    // Safety check for dates
    if (!item.start || !item.end) {
      return null;
    }
    
    const startDate = new Date(item.start);
    const endDate = new Date(item.end);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }
    
    const isBooked = item.status === 'booked';
    const isPast = startDate < new Date();

    return (
      <View style={[
        styles.slotCard,
        isBooked && styles.bookedSlot,
        isPast && styles.pastSlot
      ]}>
        <View style={styles.slotInfo}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotDate}>
              {startDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </Text>
            {isBooked && (
              <View style={styles.bookedBadge}>
                <Text style={styles.bookedBadgeText}>BOOKED</Text>
              </View>
            )}
            {isPast && !isBooked && (
              <View style={[styles.bookedBadge, { backgroundColor: '#9E9E9E' }]}>
                <Text style={styles.bookedBadgeText}>PAST</Text>
              </View>
            )}
          </View>
          <Text style={styles.slotTime}>
            {startDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })} - {endDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          {item.subjects && item.subjects.length > 0 && (
            <Text style={styles.slotSubjects}>
              {item.subjects.join(', ')}
            </Text>
          )}
        </View>
        
        {!isBooked && !isPast && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSlot(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#F44336" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <WatercolorBackground />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Time Slots</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert(
            'Manage Options',
            'Choose an action',
            [
              { text: 'Delete Date Range', onPress: handleDeleteDateRange },
              { text: 'Delete All Available', onPress: handleBulkDelete, style: 'destructive' },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text style={[styles.filterText, filter === 'upcoming' && styles.filterTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'booked' && styles.filterTabActive]}
          onPress={() => setFilter('booked')}
        >
          <Text style={[styles.filterText, filter === 'booked' && styles.filterTextActive]}>
            Booked
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Slots list */}
      <FlatList
        data={slots}
        keyExtractor={(item, index) => item.id || `slot-${index}`}
        renderItem={renderSlot}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={commonStyles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} style={commonStyles.emptyStateIcon} />
            <Text style={commonStyles.emptyStateText}>
              {filter === 'upcoming' ? 'No upcoming slots' : 
               filter === 'booked' ? 'No booked slots' : 'No slots found'}
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('Availability')}
            >
              <Text style={styles.createButtonText}>Create Time Slots</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadSlots();
            }}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    ...commonStyles.rowBetween,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.secondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  filterContainer: {
    ...commonStyles.row,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 20,
  },
  slotCard: {
    ...commonStyles.card,
    ...commonStyles.rowBetween,
    marginBottom: 12,
  },
  bookedSlot: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FBC02D',
  },
  pastSlot: {
    opacity: 0.5,
  },
  slotInfo: {
    flex: 1,
  },
  slotHeader: {
    ...commonStyles.row,
    marginBottom: 4,
  },
  slotDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  bookedBadge: {
    ...commonStyles.badge,
    backgroundColor: '#FBC02D',
  },
  bookedBadgeText: {
    ...commonStyles.badgeText,
    fontSize: 10,
  },
  slotTime: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  slotSubjects: {
    fontSize: 12,
    color: colors.textLight,
  },
  deleteButton: {
    padding: 8,
  },
  createButton: {
    ...commonStyles.button,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
