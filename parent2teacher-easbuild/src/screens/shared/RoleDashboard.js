/**
 * RoleDashboard - Dynamic role-based dashboard
 * 
 * Universal dashboard that adapts based on the user's role.
 * Replaces separate TeacherDashboard and ParentDashboard.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { getRoleConfig, getRoleColors, getCanonicalRole } from '../../config/roleConfig';
import { useAuth } from '../../hooks/useAuth';
import SimpleDrawer from '../../components/SimpleDrawer';
import { fetchTeacherBookings, fetchParentBookings, selectBookings, updateBookingStatus, approveAllRecurringBookings, startBookingsListener, stopBookingsListener } from '../../store/slices/bookingsSlice';
import { fetchNotifications, startNotificationListener, stopNotificationListener } from '../../store/slices/notificationsSlice';
import { useAppData } from '../../hooks/useAppData';

const RoleDashboard = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const bookings = useSelector(selectBookings) || [];
  const unreadNotifications = useSelector(state => state.notifications.unreadCount);
  const { logout } = useAuth();
  const { getParentById } = useAppData();
  const { getFavoriteTeachers } = useAppData();
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [bookingToDecline, setBookingToDecline] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleConfig = getRoleConfig(role);
  const roleColors = getRoleColors(role);
  const isProvider = role === 'service_provider';

  // Safety check - if no roleConfig, show error
  if (!roleConfig) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#E74C3C" />
          <Text style={styles.errorText}>Unable to load role configuration</Text>
          <Text style={styles.errorSubtext}>Role: {role || 'undefined'}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={logout}>
            <Text style={styles.errorButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Real-time bookings listener (auto-updates when new bookings arrive)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = startBookingsListener(user.uid, isProvider, dispatch);
    
    return () => {
      stopBookingsListener();
    };
  }, [dispatch, user?.uid, isProvider]);

  // Real-time notification listener (replaces 10-second polling to save battery)
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = startNotificationListener(user.uid, dispatch);
    
    return () => {
      stopNotificationListener();
    };
  }, [dispatch, user?.uid]);

  // Calculate stats from real booking data
  useEffect(() => {
    loadDashboardData();
  }, [bookings, user?.uid]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // Refresh notifications - silently fail if auth not ready
      if (user?.uid) {
        try {
          await dispatch(fetchNotifications(user.uid)).unwrap();
        } catch (error) {
          // Silent fail - auth might not be ready yet
        }
      }
      
      // Calculate real stats from bookings
      const now = new Date();
      const confirmedBookings = bookings.filter(b => 
        b.status === 'accepted' || b.status === 'confirmed'
      );
      const upcomingBookings = confirmedBookings.filter(b => {
        const bookingDate = new Date(b.start || b.date);
        return bookingDate >= now;
      });
      const calculatedPendingBookings = bookings.filter(b => 
        b.status === 'pending' || b.status === 'booked'
      );
      
      // Update pending bookings state
      setPendingBookings(calculatedPendingBookings);
      
      // Group pending bookings by recurringBookingId for providers
      if (isProvider) {
        const recurringGroups = {};
        const standalonePending = [];
        
        calculatedPendingBookings.forEach(booking => {
          if (booking.recurringBookingId) {
            if (!recurringGroups[booking.recurringBookingId]) {
              recurringGroups[booking.recurringBookingId] = [];
            }
            recurringGroups[booking.recurringBookingId].push(booking);
          } else {
            standalonePending.push(booking);
          }
        });
        
        // Convert recurring groups to array
        const recurringRequests = Object.entries(recurringGroups).map(([id, bookings]) => ({
          type: 'recurring',
          recurringBookingId: id,
          bookings: bookings.sort((a, b) => new Date(a.date) - new Date(b.date)),
          parentId: bookings[0].parentId,
          notes: bookings[0].notes
        }));
        
        // Combine: recurring first, then standalone
        const combinedPending = [
          ...recurringRequests,
          ...standalonePending.map(b => ({ type: 'single', booking: b }))
        ];
        
        setPendingBookings(combinedPending);
      }
      
      let calculatedStats = {};
      
      if (isProvider) {
        // Provider stats
        const uniqueClients = new Set(bookings.map(b => b.parentId)).size;
        calculatedStats = {
          activeBookings: confirmedBookings.length,
          totalClients: uniqueClients,
          unreadMessages: 0, // TODO: Get from messages
          upcomingSessions: upcomingBookings.length,
          pendingRequests: calculatedPendingBookings.length,
          totalBookings: bookings.length,
        };
      } else {
        // Client stats
        const favorites = getFavoriteTeachers?.() || [];
        calculatedStats = {
          upcomingBookings: upcomingBookings.length,
          totalBookings: bookings.length,
          favoriteProviders: favorites.length,
          unreadMessages: 0, // TODO: Get from messages
          pendingRequests: calculatedPendingBookings.length,
          confirmedSessions: confirmedBookings.length,
        };
      }
      
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAcceptBooking = async (booking) => {
    console.log('📋 RoleDashboard: Accepting booking:', booking.id);
    console.log('👤 RoleDashboard: Parent ID:', booking.parentId);
    console.log('👨‍🏫 RoleDashboard: Teacher name:', user?.displayName || user?.name || roleConfig.name);
    
    await dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'accepted',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || roleConfig.name,
      date: booking.date
    }));
    
    console.log('✅ RoleDashboard: updateBookingStatus dispatched');
    
    // Refresh bookings to update UI
    if (isProvider) {
      await dispatch(fetchTeacherBookings());
    }
    
    // Show confirmation
    alert(`✅ Booking accepted!\n\nVideo meeting link will be available in Upcoming Sessions`);
  };

  const handleAcceptAll = async (recurringBookingId) => {
    try {
      await dispatch(approveAllRecurringBookings({ recurringBookingId })).unwrap();
      alert('✅ All recurring bookings accepted!');
      // Refresh bookings
      if (isProvider) {
        await dispatch(fetchTeacherBookings());
      }
    } catch (error) {
      alert('❌ Failed to accept recurring bookings: ' + error);
    }
  };

  const handleDeclineBooking = async (booking) => {
    setBookingToDecline(booking);
    setDeclineModalVisible(true);
  };

  const confirmDecline = async () => {
    if (!declineReason.trim()) {
      Alert.alert('Puuttuva syy', 'Kirjoita lyhyt syy, miksi et voi hyväksyä tätä varausta.');
      return;
    }

    try {
      console.log('❌ RoleDashboard: Declining booking:', bookingToDecline.id);
      console.log('👤 RoleDashboard: Parent ID:', bookingToDecline.parentId);
      
      await dispatch(updateBookingStatus({ 
        bookingId: bookingToDecline.id, 
        status: 'declined',
        parentId: bookingToDecline.parentId,
        teacherName: user?.displayName || user?.name || roleConfig.name,
        date: bookingToDecline.date,
        declineReason: declineReason.trim()
      })).unwrap();
      
      console.log('✅ RoleDashboard: Decline dispatched');
      
      setDeclineModalVisible(false);
      setBookingToDecline(null);
      setDeclineReason('');
      
      // Refresh bookings to update UI
      if (isProvider) {
        await dispatch(fetchTeacherBookings());
      }
      
      Alert.alert('Hylätty', 'Varaus hylätty. Oppilas saa ilmoituksen.');
    } catch (error) {
      Alert.alert('Virhe', 'Varauksen hylkääminen epäonnistui: ' + error);
    }
  };

  const renderStatCard = (statConfig) => {
    const { key, label, icon } = statConfig;
    const value = stats[key] || 0;

    return (
      <View
        key={key}
        style={[styles.statCard, { backgroundColor: roleColors.card }]}
      >
        <View style={[styles.statIconContainer, { backgroundColor: roleColors.primary + '20' }]}>
          <Ionicons name={icon} size={28} color={roleColors.primary} />
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statValue, { color: roleColors.text }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: roleColors.textSecondary }]}>
            {label}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuickAction = (navItem) => {
    const { name, icon, screen } = navItem;

    return (
      <TouchableOpacity
        key={screen}
        style={[styles.quickAction, { borderColor: roleColors.primary + '30' }]}
        onPress={() => navigation.navigate(screen)}
      >
        <Ionicons name={icon} size={24} color={roleColors.primary} />
        <Text style={[styles.quickActionText, { color: roleColors.text }]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Build drawer menu items with all navigation options
  const menuItems = [
    // Role-specific navigation items (excluding Dashboard since we're already there)
    ...Object.values(roleConfig.navigation)
      .filter(nav => 
        nav.screen !== roleConfig.navigation.dashboard.screen && 
        nav.screen !== 'Calendar' // Skip generic Calendar if role has TeacherCalendar
      )
      .map(nav => ({
        label: nav.name,
        icon: nav.icon,
        screen: nav.screen
      })),
    // Common items for all roles (Notifications in header, so skip here)
    { label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: roleColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity onPress={() => setDrawerVisible(true)}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name={roleConfig.icon} size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{roleConfig.nameLocalized}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* SimpleDrawer */}
      <SimpleDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        menuItems={menuItems}
        userType={roleConfig.legacyName}
        onLogout={logout}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadDashboardData}
            tintColor={roleColors.primary}
          />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: roleColors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: roleColors.text }]}>
            {user?.displayName || 'User'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {roleConfig.dashboardStats.map(stat => renderStatCard(stat))}
        </View>

        {/* Pending Requests (Provider only) */}
        {roleConfig.id === 'service_provider' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: roleColors.text }]}>
                Pending Requests
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
                <Text style={[styles.seeAll, { color: roleColors.primary }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            
            {pendingBookings.length === 0 ? (
              <View style={[styles.emptyRequestsCard, { backgroundColor: roleColors.card }]}>
                <Ionicons name="calendar-outline" size={40} color={roleColors.textSecondary} />
                <Text style={[styles.emptyRequestsText, { color: roleColors.textSecondary }]}>
                  No pending requests
                </Text>
              </View>
            ) : (
              pendingBookings.slice(0, 3).map((request, idx) => {
                if (request.type === 'recurring') {
                  // Recurring booking group
                  const parent = getParentById(request.parentId);
                  const firstDate = new Date(request.bookings[0].date);
                  const lastDate = new Date(request.bookings[request.bookings.length - 1].date);
                  
                  return (
                    <View key={`recurring-${request.recurringBookingId}`} style={[styles.requestCard, { backgroundColor: roleColors.card }]}>
                      <View style={styles.requestHeader}>
                        <View style={styles.recurringHeaderLeft}>
                          <Ionicons name="repeat" size={20} color={roleColors.primary} />
                          <Text style={[styles.requestStudent, { color: roleColors.text, marginLeft: 8 }]}>
                            {parent?.name || parent?.fullName || parent?.displayName || 'Parent'}
                          </Text>
                        </View>
                        <View style={[styles.requestBadge, { backgroundColor: roleColors.primary }]}>
                          <Text style={styles.requestBadgeText}>{request.bookings.length}x</Text>
                        </View>
                      </View>
                      {request.notes && (
                        <Text style={[styles.requestSubject, { color: roleColors.textSecondary }]} numberOfLines={1}>{request.notes}</Text>
                      )}
                      <Text style={[styles.requestTime, { color: roleColors.textSecondary }]}>
                        {firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={[styles.recurringDates, { color: roleColors.textSecondary }]}>
                        {request.bookings.length} sessions • Every week
                      </Text>
                      <View style={styles.requestActions}>
                        <TouchableOpacity 
                          style={[styles.acceptButton, { backgroundColor: roleColors.primary }]}
                          onPress={() => handleAcceptAll(request.recurringBookingId)}
                        >
                          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptButtonText}>Accept All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.declineButton, { borderColor: roleColors.primary }]}
                          onPress={() => navigation.navigate('Bookings', { filterRecurring: request.recurringBookingId })}
                        >
                          <Ionicons name="list" size={18} color={roleColors.primary} />
                          <Text style={[styles.declineButtonText, { color: roleColors.primary }]}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                } else {
                  // Single booking
                  const booking = request.booking || request;
                  const parent = getParentById(booking.parentId);
                  const bookingDate = new Date(booking.date);
                  
                  return (
                    <View key={booking.id} style={[styles.requestCard, { backgroundColor: roleColors.card }]}>
                      <View style={styles.requestHeader}>
                        <Text style={[styles.requestStudent, { color: roleColors.text }]}>
                          {parent?.name || parent?.fullName || parent?.displayName || 'Parent/Student'}
                        </Text>
                        <View style={[styles.requestBadge, { backgroundColor: roleColors.primary }]}>
                          <Text style={styles.requestBadgeText}>New</Text>
                        </View>
                      </View>
                      {booking.notes && (
                        <Text style={[styles.requestSubject, { color: roleColors.textSecondary }]} numberOfLines={1}>
                          {booking.notes}
                        </Text>
                      )}
                      <Text style={[styles.requestTime, { color: roleColors.textSecondary }]}>
                        Requested: {bookingDate.toLocaleString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <View style={styles.requestActions}>
                        <TouchableOpacity 
                          style={[styles.acceptButton, { backgroundColor: roleColors.primary }]}
                          onPress={() => handleAcceptBooking(booking)}
                        >
                          <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          <Text style={styles.acceptButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.declineButton, { borderColor: '#F44336' }]}
                          onPress={() => handleDeclineBooking(booking)}
                        >
                          <Ionicons name="close" size={18} color="#F44336" />
                          <Text style={[styles.declineButtonText, { color: '#F44336' }]}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }
              })
            )}
          </View>
        )}

        {/* Upcoming Sessions (Provider only) */}
        {roleConfig.id === 'service_provider' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: roleColors.text }]}>
                Upcoming Sessions
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                <Text style={[styles.seeAll, { color: roleColors.primary }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            
            {(() => {
              const now = new Date();
              const upcomingSessions = bookings
                .filter(b => (b.status === 'accepted' || b.status === 'confirmed') && new Date(b.date || b.start) >= now)
                .sort((a, b) => new Date(a.date || a.start) - new Date(b.date || b.start))
                .slice(0, 3);
              
              if (upcomingSessions.length === 0) {
                return (
                  <View style={[styles.emptyRequestsCard, { backgroundColor: roleColors.card }]}>
                    <Ionicons name="calendar-outline" size={40} color={roleColors.textSecondary} />
                    <Text style={[styles.emptyRequestsText, { color: roleColors.textSecondary }]}>
                      No upcoming sessions
                    </Text>
                  </View>
                );
              }
              
              return upcomingSessions.map((session) => {
                const parent = getParentById(session.parentId);
                const sessionDate = new Date(session.date || session.start);
                const hasStarted = sessionDate <= new Date();
                
                return (
                  <View key={session.id} style={[styles.lessonCard, { backgroundColor: roleColors.card }]}>
                    <View style={styles.lessonHeader}>
                      <View style={styles.lessonInfo}>
                        <Text style={[styles.lessonStudent, { color: roleColors.text }]}>
                          {parent?.name || parent?.fullName || parent?.displayName || 'Student'}
                        </Text>
                        {session.notes && (
                          <Text style={[styles.lessonSubject, { color: roleColors.textSecondary }]} numberOfLines={1}>
                            {session.notes}
                          </Text>
                        )}
                        <Text style={[styles.lessonTime, { color: roleColors.textSecondary }]}>
                          {sessionDate.toLocaleString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                      {session.meetingUrl && (
                        <TouchableOpacity 
                          style={[styles.videoButton, { 
                            backgroundColor: hasStarted ? roleColors.primary : roleColors.primary + '40'
                          }]}
                          onPress={() => {
                            if (session.meetingUrl) {
                              const { Linking } = require('react-native');
                              Linking.openURL(session.meetingUrl);
                            }
                          }}
                        >
                          <Ionicons 
                            name="videocam" 
                            size={24} 
                            color="#FFFFFF" 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    {session.meetingUrl && (
                      <View style={[styles.meetingInfo, { backgroundColor: roleColors.primary + '10' }]}>
                        <Ionicons name="videocam" size={14} color={roleColors.primary} />
                        <Text style={[styles.meetingPassword, { color: roleColors.primary }]}>
                          Video meeting ready - Click camera to join
                        </Text>
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: roleColors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {/* Palkkaaminen button for parents only */}
            {roleConfig.id === 'parent' && (
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: roleColors.card }]}
                onPress={() => navigation.navigate('FindProviders')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#10B981' + '20' }]}>
                  <Ionicons name="search" size={24} color="#10B981" />
                </View>
                <Text style={[styles.quickActionTitle, { color: roleColors.text }]}>
                  Palkkaaminen
                </Text>
                <Text style={[styles.quickActionSubtitle, { color: roleColors.textSecondary }]}>
                  Find teachers
                </Text>
              </TouchableOpacity>
            )}
            {Object.values(roleConfig.navigation)
              .filter(nav => nav.screen !== 'Dashboard')
              .slice(0, 5)
              .map(nav => renderQuickAction(nav))}
          </View>
        </View>

        {/* Decline Modal */}
        <Modal
          visible={declineModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDeclineModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Ionicons name="close-circle" size={32} color="#F44336" />
                <Text style={styles.modalTitle}>Hylkää varaus</Text>
              </View>
              
              <Text style={styles.modalLabel}>Kerro oppilaalle, miksi et voi hyväksyä tätä varausta:</Text>
              
              <TextInput
                style={styles.modalTextInput}
                placeholder="Esim: En ole saatavilla kyseisen aikana"
                placeholderTextColor="#999"
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setDeclineModalVisible(false);
                    setBookingToDecline(null);
                    setDeclineReason('');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Peruuta</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalConfirmButton}
                  onPress={confirmDecline}
                >
                  <Text style={styles.modalConfirmButtonText}>Hylkää varaus</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: roleColors.text }]}>
              Recent Activity
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAll, { color: roleColors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.emptyState, { backgroundColor: roleColors.card }]}>
            <Ionicons name="time-outline" size={48} color={roleColors.textSecondary} />
            <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>
              No recent activity
            </Text>
          </View>
        </View>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyRequestsCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyRequestsText: {
    marginTop: 8,
    fontSize: 14,
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestStudent: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requestBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestSubject: {
    fontSize: 14,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  lessonCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonInfo: {
    flex: 1,
    marginRight: 12,
  },
  lessonStudent: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lessonSubject: {
    fontSize: 14,
    marginBottom: 4,
  },
  lessonTime: {
    fontSize: 12,
  },
  videoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  meetingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  meetingPassword: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#E74C3C',
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  modalLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    minHeight: 100,
    marginBottom: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#7F8C8D',
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  recurringHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurringDates: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
});

export default RoleDashboard;
