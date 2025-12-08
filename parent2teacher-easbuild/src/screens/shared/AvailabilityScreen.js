/**
 * AvailabilityScreen - Universal availability management screen for service providers
 * 
 * Allows providers (teachers, coaches, consultants) to set their weekly availability
 * Clients don't have access to this screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { 
  getRoleConfig, 
  getRoleColors, 
  getCanonicalRole,
  isServiceProvider,
  hasFeature 
} from '../../config/roleConfig';
import { useAuth } from '../../hooks/useAuth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00',
  '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

const AvailabilityScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Initialize availability from user data or default to empty
  const [availability, setAvailability] = useState(
    user?.weeklyAvailability || {}
  );

  const role = getCanonicalRole(user?.role || user?.userType);
  const roleConfig = getRoleConfig(role);
  const roleColors = getRoleColors(role);
  const isProvider = isServiceProvider(role);
  const canSetAvailability = hasFeature(role, 'canSetAvailability');

  // Redirect if user is not a provider
  useEffect(() => {
    if (!isProvider || !canSetAvailability) {
      Alert.alert(
        'Access Denied',
        'This feature is only available for teachers',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [isProvider, canSetAvailability]);

  const toggleTimeSlot = (day, time) => {
    setAvailability(prev => {
      const daySlots = prev[day] || [];
      const hasSlot = daySlots.includes(time);
      
      return {
        ...prev,
        [day]: hasSlot
          ? daySlots.filter(t => t !== time)
          : [...daySlots, time].sort()
      };
    });
  };

  const toggleDay = (day, enabled) => {
    setAvailability(prev => {
      if (enabled) {
        // Enable all time slots for this day
        return { ...prev, [day]: [...TIME_SLOTS] };
      } else {
        // Disable all time slots for this day
        return { ...prev, [day]: [] };
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!db || !user?.uid) {
        throw new Error('User not authenticated');
      }

      // Get collection name based on role
      const collectionName = roleConfig.collectionName || 'teachers';
      
      // Update user document with weekly availability
      const userDocRef = doc(db, collectionName, user.uid);
      await setDoc(userDocRef, {
        weeklyAvailability: availability,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      Alert.alert('Success', 'Availability updated successfully');
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const renderDayCard = (dayInfo) => {
    const daySlots = availability[dayInfo.key] || [];
    const isDayEnabled = daySlots.length > 0;

    return (
      <View
        key={dayInfo.key}
        style={[styles.dayCard, { backgroundColor: roleColors.card }]}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text style={[styles.dayLabel, { color: roleColors.text }]}>
              {dayInfo.label}
            </Text>
            <Text style={[styles.slotsCount, { color: roleColors.textSecondary }]}>
              {daySlots.length} slots
            </Text>
          </View>
          <Switch
            value={isDayEnabled}
            onValueChange={(value) => toggleDay(dayInfo.key, value)}
            trackColor={{ false: '#ccc', true: roleColors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {isDayEnabled && (
          <View style={styles.timeSlots}>
            {TIME_SLOTS.map(time => {
              const isSelected = daySlots.includes(time);
              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    {
                      backgroundColor: isSelected ? roleColors.primary : roleColors.background,
                      borderColor: roleColors.primary,
                    }
                  ]}
                  onPress={() => toggleTimeSlot(dayInfo.key, time)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      { color: isSelected ? '#FFFFFF' : roleColors.text }
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  if (!isProvider || !canSetAvailability) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: roleColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: roleColors.primary + '20' }]}>
        <Ionicons name="information-circle" size={24} color={roleColors.primary} />
        <Text style={[styles.infoText, { color: roleColors.text }]}>
          Select your weekly availability. Parents/Students will be able to book sessions during these times.
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: roleColors.primary }]}
            onPress={() => {
              // Enable all days with default working hours (9-17)
              const defaultSlots = TIME_SLOTS.filter(
                time => parseInt(time) >= 9 && parseInt(time) <= 17
              );
              const allDaysAvailable = {};
              DAYS_OF_WEEK.slice(0, 5).forEach(day => { // Mon-Fri only
                allDaysAvailable[day.key] = defaultSlots;
              });
              setAvailability(allDaysAvailable);
            }}
          >
            <Ionicons name="briefcase" size={20} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>Standard Hours (9-17, Mon-Fri)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: roleColors.secondary }]}
            onPress={() => {
              Alert.alert(
                'Clear All',
                'Are you sure you want to clear all availability?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => setAvailability({}) }
                ]
              );
            }}
          >
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.quickButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Days List */}
        {DAYS_OF_WEEK.map(day => renderDayCard(day))}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: roleColors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Availability</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dayCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  slotsCount: {
    fontSize: 14,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AvailabilityScreen;
