import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification, 
  clearReadNotifications,
  deleteOldNotifications 
} from '../../store/slices/notificationsSlice';
import { colors } from '../../styles/commonStyles';
import { Swipeable } from 'react-native-gesture-handler';

/**
 * NotificationsScreen - Display all user notifications
 * 
 * Shows list of notifications with ability to mark as read
 */
const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { notifications, loading } = useSelector(state => state.notifications);
  const currentUser = useSelector(state => state.auth.user);
  const [showMenu, setShowMenu] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState(null);

  useEffect(() => {
    if (currentUser?.uid) {
      dispatch(fetchNotifications(currentUser.uid));
      // Auto-cleanup old notifications on screen mount
      dispatch(deleteOldNotifications(currentUser.uid));
    }
  }, [currentUser?.uid, dispatch]);

  const handleMarkAsRead = (notificationId) => {
    dispatch(markAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    if (currentUser?.uid) {
      dispatch(markAllAsRead(currentUser.uid));
      setShowMenu(false);
    }
  };

  const handleDelete = (notificationId) => {
    dispatch(deleteNotification(notificationId));
  };

  const handleClearRead = () => {
    if (currentUser?.uid) {
      Alert.alert(
        'Poista luetut ilmoitukset',
        'Haluatko varmasti poistaa kaikki luetut ilmoitukset?',
        [
          { text: 'Peruuta', style: 'cancel' },
          { 
            text: 'Poista', 
            style: 'destructive',
            onPress: () => {
              dispatch(clearReadNotifications(currentUser.uid));
              setShowMenu(false);
            }
          }
        ]
      );
    }
  };

  const handleClearOld = () => {
    if (currentUser?.uid) {
      Alert.alert(
        'Poista vanhat ilmoitukset',
        'Poistetaan ilmoitukset jotka ovat yli 30 päivää vanhoja.',
        [
          { text: 'Peruuta', style: 'cancel' },
          { 
            text: 'Poista', 
            style: 'destructive',
            onPress: () => {
              dispatch(deleteOldNotifications(currentUser.uid));
              setShowMenu(false);
            }
          }
        ]
      );
    }
  };

  const handleClearAll = () => {
    if (currentUser?.uid) {
      Alert.alert(
        'Poista kaikki ilmoitukset',
        `Haluatko varmasti poistaa kaikki ${notifications.length} ilmoitusta?`,
        [
          { text: 'Peruuta', style: 'cancel' },
          { 
            text: 'Poista kaikki', 
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete all notifications one by one
                await Promise.all(
                  notifications.map(notif => dispatch(deleteNotification(notif.id)))
                );
                setShowMenu(false);
              } catch (err) {
                Alert.alert('Virhe', 'Ilmoitusten poistaminen epäonnistui');
              }
            }
          }
        ]
      );
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

  const groupNotificationsByDate = () => {
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    notifications.forEach(notif => {
      const date = new Date(notif.createdAt);
      const notifDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      if (notifDate.getTime() === today.getTime()) {
        groups.today.push(notif);
      } else if (notifDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(notif);
      } else if (date >= weekAgo) {
        groups.thisWeek.push(notif);
      } else {
        groups.older.push(notif);
      }
    });

    return groups;
  };

  const renderRightActions = (item) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(item.id)}
      >
        <Ionicons name="trash-outline" size={24} color="#FFF" />
        <Text style={styles.deleteText}>Poista</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const iconColor = getNotificationColor(item.type);
    
    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[styles.card, !item.read && styles.unreadCard]}
          onPress={() => {
            // Handle booking cancellation and declined notifications specially with modal
            if (item.type === 'booking_cancelled' || item.type === 'booking_declined') {
              if (!item.read) {
                handleMarkAsRead(item.id);
              }
              setSelectedCancellation(item);
              setCancelModalVisible(true);
            } else if (item.navigationTarget) {
              // Always use unified Bookings screen
              const target = item.navigationTarget === 'ParentBookings' || item.navigationTarget === 'TeacherBookings' 
                ? 'Bookings' 
                : item.navigationTarget;
              
              if (target) {
                // Navigate immediately for instant response
                navigation.push(target, item.navigationParams);
                
                // Mark as read asynchronously (don't wait)
                if (!item.read) {
                  handleMarkAsRead(item.id);
                }
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
      </Swipeable>
    );
  };

  const renderSectionHeader = (title) => {
    if (!title) return null;
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    );
  };

  const groups = groupNotificationsByDate();
  const flatData = [
    ...(groups.today.length > 0 ? [{ type: 'header', title: 'Tänään' }, ...groups.today] : []),
    ...(groups.yesterday.length > 0 ? [{ type: 'header', title: 'Eilen' }, ...groups.yesterday] : []),
    ...(groups.thisWeek.length > 0 ? [{ type: 'header', title: 'Tällä viikolla' }, ...groups.thisWeek] : []),
    ...(groups.older.length > 0 ? [{ type: 'header', title: 'Vanhemmat' }, ...groups.older] : []),
  ];

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return (
    <View style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          Ilmoitukset {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        
        <TouchableOpacity 
          onPress={() => setShowMenu(!showMenu)} 
          style={styles.menuButton}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.menuItem}>
            <Ionicons name="checkmark-done-outline" size={20} color={colors.text} />
            <Text style={styles.menuText}>Merkitse kaikki luetuiksi</Text>
          </TouchableOpacity>
          
          {readCount > 0 && (
            <TouchableOpacity onPress={handleClearRead} style={styles.menuItem}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.menuText, { color: '#FF3B30' }]}>
                Poista luetut ({readCount})
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleClearOld} style={styles.menuItem}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuText}>Poista yli 30 pv vanhat</Text>
          </TouchableOpacity>

          {notifications.length > 0 && (
            <>
              <View style={styles.menuDivider} />
              <TouchableOpacity onPress={handleClearAll} style={styles.menuItem}>
                <Ionicons name="trash-bin" size={20} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30', fontWeight: '700' }]}>
                  Poista kaikki ({notifications.length})
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <FlatList
        data={flatData}
        keyExtractor={(item, index) => item.id || `header-${index}`}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader(item.title);
          }
          return renderItem({ item });
        }}
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

      {/* Cancellation Details Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons 
                name={selectedCancellation?.type === 'booking_declined' ? "alert-circle" : "close-circle"} 
                size={32} 
                color={colors.error} 
              />
              <Text style={styles.modalTitle}>
                {selectedCancellation?.type === 'booking_declined' ? 'Varaus hylätty' : 'Varaus peruutettu'}
              </Text>
              <TouchableOpacity 
                onPress={() => setCancelModalVisible(false)} 
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {selectedCancellation?.type === 'booking_declined' ? (
                <>
                  <Text style={styles.modalLabel}>Opettaja hylkäsi varauksesi</Text>
                  <Text style={styles.modalReason}>
                    {(() => {
                      const msg = selectedCancellation?.message || '';
                      // Extract decline reason from message
                      const reasonMatch = msg.match(/Syy: (.+?)(?:\n|$)/i);
                      if (reasonMatch) {
                        return reasonMatch[1].trim();
                      }
                      // Fallback: show the whole message if no specific reason found
                      return msg.includes('Syy:') ? msg : 'Ei määritelty';
                    })()}
                  </Text>
                  <Text style={styles.modalInfo}>
                    💡 Voit varata uuden ajan opettajan kalenterista
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.modalLabel}>Peruutuksen syy:</Text>
                  <Text style={styles.modalReason}>
                    {(() => {
                      const msg = selectedCancellation?.message || '';
                      // Try both Finnish and English formats for cancellation
                      const reasonMatch = msg.match(/Reason: (.+?)(?:\. Would you like|$)/i) || 
                                         msg.match(/Syynä: (.+)$/i);
                      return reasonMatch ? reasonMatch[1].trim() : 'Ei määritelty';
                    })()}
                  </Text>
                  
                  {/* Only show rebooking option if teacherId is provided (meaning parent is viewing) */}
                  {selectedCancellation?.navigationParams?.teacherId && (
                    <Text style={styles.modalInfo}>
                      Haluatko varata uuden ajan samalta opettajalta?
                    </Text>
                  )}
                </>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Sulje</Text>
              </TouchableOpacity>
              {/* Show rebooking button for declined bookings (always for parents) or cancellations with teacherId */}
              {(selectedCancellation?.type === 'booking_declined' || selectedCancellation?.navigationParams?.teacherId) && (
                <TouchableOpacity 
                  style={styles.modalBookButton}
                  onPress={() => {
                    setCancelModalVisible(false);
                    // For declined bookings, try to get teacherId from navigationParams or data
                    const teacherId = selectedCancellation?.navigationParams?.teacherId || 
                                    selectedCancellation?.data?.teacherId;
                    if (teacherId) {
                      // Navigate to weekly calendar view (same as Schedule button in FindProviders)
                      navigation.navigate('ProviderWeeklyAvailability', { 
                        teacherId,
                        teacherName: selectedCancellation?.title?.includes('hylkäsi') 
                          ? selectedCancellation.title.split(' ')[0] 
                          : 'Opettaja'
                      });
                    } else {
                      // Fallback: navigate to find providers
                      navigation.navigate('FindProviders');
                    }
                  }}
                >
                  <Ionicons name="calendar" size={20} color={colors.white} />
                  <Text style={styles.modalBookButtonText}>Varaa uusi aika</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingTop: 48
  },
  backButton: {
    padding: 8,
    marginRight: 4
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1
  },
  menuButton: {
    padding: 8,
    marginLeft: 4
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
  },
  menu: {
    position: 'absolute',
    top: 100,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 250,
    maxWidth: 300
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  menuText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500'
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border || '#E0E0E0',
    marginVertical: 4,
    marginHorizontal: 12
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12
  },
  deleteText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textDark,
    flex: 1,
    marginLeft: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 8,
  },
  modalReason: {
    fontSize: 16,
    color: colors.textDark,
    backgroundColor: colors.lightGray,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfo: {
    fontSize: 15,
    color: colors.textDark,
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  modalBookButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalBookButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationsScreen;
