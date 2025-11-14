import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchNotifications, markAsRead, markAllAsRead } from '../../store/slices/notificationsSlice';
import { colors } from '../../styles/commonStyles';

/**
 * NotificationsScreen - Display all user notifications
 * 
 * Shows list of notifications with ability to mark as read
 */
const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { notifications, loading } = useSelector(state => state.notifications);
  const currentUser = useSelector(state => state.auth.user);

  useEffect(() => {
    if (currentUser?.uid) {
      dispatch(fetchNotifications(currentUser.uid));
    }
  }, [currentUser?.uid, dispatch]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    if (currentUser?.uid) {
      dispatch(markAllAsRead(currentUser.uid));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_request':
        return 'calendar';
      case 'booking_accepted':
        return 'checkmark-circle';
      case 'booking_declined':
        return 'close-circle';
      case 'message':
        return 'mail';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking_request':
        return colors.primary;
      case 'booking_accepted':
        return '#4CAF50';
      case 'booking_declined':
        return '#F44336';
      case 'message':
        return '#2196F3';
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Juuri nyt';
    if (diffMins < 60) return `${diffMins} min sitten`;
    if (diffHours < 24) return `${diffHours} h sitten`;
    if (diffDays < 7) return `${diffDays} pv sitten`;
    
    return date.toLocaleDateString('fi-FI', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderItem = ({ item }) => {
    const iconColor = getNotificationColor(item.type);
    
    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.unreadCard]}
        onPress={() => {
          if (!item.read) {
            handleMarkAsRead(item.id);
          }
          if (item.navigationTarget) {
            const state = navigation.getState?.();
            const routeNames = state?.routeNames || [];
            let target = item.navigationTarget;
            if (!routeNames.includes(target)) {
              // Fallback logic: choose a bookings/calendar route that exists
              if (routeNames.includes('ParentBookings')) target = 'ParentBookings';
              else if (routeNames.includes('TeacherBookings')) target = 'TeacherBookings';
              else if (routeNames.includes('Calendar')) target = 'Calendar';
              else target = null;
            }
            if (target) {
              navigation.navigate(target, item.navigationParams);
            }
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={getNotificationIcon(item.type)} size={24} color={iconColor} />
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
        </View>
        
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ilmoitukset</Text>
        <TouchableOpacity onPress={handleMarkAllAsRead}>
          <Text style={styles.markAllText}>Lue kaikki</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={54} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Ei ilmoituksia</Text>
            <Text style={styles.emptyText}>Saat ilmoituksen kun joku varaa aikaa tai lähettää viestin</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={() => currentUser?.uid && dispatch(fetchNotifications(currentUser.uid))}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold'
  },
  markAllText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600'
  },
  listContent: {
    padding: 16
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  contentContainer: {
    flex: 1
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4
  },
  unreadTitle: {
    fontWeight: '700'
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: 8,
    marginTop: 4
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40
  }
});

export default NotificationsScreen;
