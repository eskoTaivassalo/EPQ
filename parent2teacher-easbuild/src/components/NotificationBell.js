import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../styles/commonStyles';

/**
 * NotificationBell - Reusable bell icon component with badge
 * 
 * Shows notification count badge and navigates to notifications screen
 */
const NotificationBell = () => {
  const navigation = useNavigation();
  const unreadCount = useSelector(state => state.notifications.unreadCount);
  const notifications = useSelector(state => state.notifications.notifications);

  // Debug logging
  React.useEffect(() => {
    console.log('🔔 NotificationBell: unreadCount =', unreadCount);
    console.log('🔔 NotificationBell: total notifications =', notifications.length);
    console.log('🔔 NotificationBell: unread notifications =', notifications.filter(n => !n.read).length);
  }, [unreadCount, notifications]);

  const handlePress = () => {
    navigation.navigate('Notifications');
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <Ionicons name="notifications-outline" size={24} color="#F39C12" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 8,
    marginRight: 8
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.secondary
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold'
  }
});

export default NotificationBell;
