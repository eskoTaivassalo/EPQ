/**
 * Temporary debug component to clear all scheduled notifications
 * Add this as a button in your dashboard to test
 */

import React from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export default function ClearNotificationsButton() {
  const handleClear = async () => {
    try {
      // Get all scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Currently scheduled notifications:', scheduled.length);
      scheduled.forEach(notif => {
        console.log('  - ID:', notif.identifier, 'Trigger:', notif.trigger);
      });
      
      // Cancel all
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      Alert.alert('Success', `Cleared ${scheduled.length} scheduled notifications`);
      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <TouchableOpacity 
      onPress={handleClear}
      style={{
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        margin: 16
      }}
    >
      <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
        🗑️ Clear All Scheduled Notifications (Debug)
      </Text>
    </TouchableOpacity>
  );
}
