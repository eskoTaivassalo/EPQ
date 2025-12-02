import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTeacherBookings, selectBookings, updateBookingStatus } from '../../store/slices/bookingsSlice';
import { useAppData } from '../../hooks/useAppData';
import NotificationBell from '../../components/NotificationBell';
import SimpleDrawer from '../../components/SimpleDrawer';
import AppLogo from '../../components/AppLogo';
import { colors, commonStyles } from '../../styles/commonStyles';

const TeacherDashboard = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings) || [];
  const { getParentById } = useAppData();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Only fetch if user is authenticated
    if (user?.uid) {
      console.log('[TeacherDashboard] Fetching bookings for user:', user.uid);
      dispatch(fetchTeacherBookings());
    } else {
      console.log('[TeacherDashboard] Waiting for user authentication...');
    }
  }, [dispatch, user?.uid]);



  // Treat legacy 'booked' as pending as well
  const isPendingLike = (status) => status === 'pending' || status === 'booked';
  const pendingRequests = bookings.filter(b => isPendingLike(b.status)).slice(0, 3);

  // Calculate This Week stats from real bookings
  const getWeekBounds = () => {
    const now = new Date();
    // Use local date to avoid timezone issues
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Calculate days from Monday (handle Sunday as last day of week)
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    
    // Week start: Monday at 00:00 local time
    const weekStart = new Date(year, month, date + diffToMonday, 0, 0, 0, 0);
    
    // Week end: Sunday at 23:59 local time
    const weekEnd = new Date(year, month, date + diffToMonday + 6, 23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  };

  const { weekStart, weekEnd } = getWeekBounds();
  
  // Debug: log to understand data structure
  console.log('📅 This Week Debug:', {
    totalBookings: bookings.length,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    sampleBooking: bookings[0] || 'none'
  });

  const thisWeekBookings = bookings.filter(b => {
    if (!b.date) {
      console.log('⚠️ Booking missing date:', b.id);
      return false;
    }
    
    // Parse booking date - handle both ISO strings and date-only strings
    const bookingDate = new Date(b.date);
    
    // Extract just the date part for comparison (ignore time)
    const bookingDateOnly = new Date(
      bookingDate.getFullYear(),
      bookingDate.getMonth(),
      bookingDate.getDate()
    );
    
    const weekStartDateOnly = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate()
    );
    
    const weekEndDateOnly = new Date(
      weekEnd.getFullYear(),
      weekEnd.getMonth(),
      weekEnd.getDate()
    );
    
    const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
    const isInWeek = bookingDateOnly >= weekStartDateOnly && bookingDateOnly <= weekEndDateOnly;
    
    console.log('🔍 Checking booking:', {
      id: b.id,
      date: b.date,
      bookingDateOnly: bookingDateOnly.toISOString().split('T')[0],
      weekRange: `${weekStartDateOnly.toISOString().split('T')[0]} to ${weekEndDateOnly.toISOString().split('T')[0]}`,
      status: b.status,
      isConfirmed,
      isInWeek,
      matches: isConfirmed && isInWeek
    });
    
    return isConfirmed && isInWeek;
  });

  console.log('✅ This Week Bookings:', thisWeekBookings.length);

  // If this week has no lessons, calculate next week instead
  let displayWeekBookings = thisWeekBookings;
  let weekLabel = 'This Week';
  
  if (thisWeekBookings.length === 0) {
    console.log('📅 This week empty, calculating next week...');
    
    // Calculate next week bounds
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(weekEnd);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
    
    displayWeekBookings = bookings.filter(b => {
      if (!b.date) return false;
      const bookingDate = new Date(b.date);
      const bookingDateOnly = new Date(
        bookingDate.getFullYear(),
        bookingDate.getMonth(),
        bookingDate.getDate()
      );
      const nextWeekStartDateOnly = new Date(
        nextWeekStart.getFullYear(),
        nextWeekStart.getMonth(),
        nextWeekStart.getDate()
      );
      const nextWeekEndDateOnly = new Date(
        nextWeekEnd.getFullYear(),
        nextWeekEnd.getMonth(),
        nextWeekEnd.getDate()
      );
      const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
      const isInNextWeek = bookingDateOnly >= nextWeekStartDateOnly && bookingDateOnly <= nextWeekEndDateOnly;
      return isConfirmed && isInNextWeek;
    });
    
    weekLabel = 'Next Week';
    console.log('📅 Next Week Bookings:', displayWeekBookings.length);
  }

  const displayWeekLessons = displayWeekBookings.length;
  const displayWeekStudents = new Set(displayWeekBookings.map(b => b.parentId)).size;
  // Estimate total hours: assume 1 hour per lesson if duration not specified
  const displayWeekHours = displayWeekBookings.reduce((sum, b) => {
    return sum + (b.duration || 1);
  }, 0);

  const handleAccept = async (booking) => {
    const meetingUrl = `https://meet.jit.si/PTA-${booking.id}`;
    
    console.log('🎥 MEETING LINK CREATED:', meetingUrl);
    console.log('📋 Booking ID:', booking.id);
    console.log('🔗 Copy this link to test in browser:', meetingUrl);
    
    await dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'accepted',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || 'Opettaja',
      date: booking.date
    }));
    
    // Show confirmation with meeting link
    alert(`✅ Booking accepted!\n\n📹 Video meeting link:\n${meetingUrl}\n\nYou can join from Dashboard → Upcoming Lessons\n\n(Link also copied to console)`);
  };

  const handleDecline = (booking) => {
    dispatch(updateBookingStatus({ 
      bookingId: booking.id, 
      status: 'declined',
      parentId: booking.parentId,
      teacherName: user?.displayName || user?.name || 'Opettaja',
      date: booking.date
    }));
  };

  const drawerMenuItems = [
    { label: 'Dashboard', screen: 'TeacherDashboard', icon: 'home' },
    { label: 'My Profile', screen: 'TeacherMyProfile', icon: 'person' },
    { label: 'Students', screen: 'TeacherStudents', icon: 'people' },
    { label: 'Availability', screen: 'TeacherAvailability', icon: 'time' },
    { label: 'Messages', screen: 'Conversations', icon: 'chatbubbles' },
    { label: 'Notifications', screen: 'Notifications', icon: 'notifications' },
    { label: 'Settings', screen: 'Settings', icon: 'settings' },
  ];

  const menuItems = [
    {
      id: 1,
      title: 'Students',
      subtitle: 'Manage students',
      icon: 'people',
      color: colors.primary,
      screen: 'TeacherStudents'
    },
    {
      id: 2,
      title: 'Bookings & Requests',
      subtitle: 'Handle parent requests',
      icon: 'calendar',
      color: '#FF9800',
      screen: 'TeacherBookings'
    },
    {
      id: 3,
      title: 'Availability',
      subtitle: 'Publish your free times',
      icon: 'time',
      color: '#00BCD4',
      screen: 'TeacherAvailability'
    },
    {
      id: 4,
      title: 'Calendar',
      subtitle: 'Monthly lesson overview',
      icon: 'calendar',
      color: '#3F51B5',
      screen: 'Calendar'
    },
    {
      id: 5,
      title: 'Messages',
      subtitle: 'Chat with parents',
      icon: 'chatbubbles',
      color: '#4CAF50',
      screen: 'Conversations'
    },
    {
      id: 6,
      title: 'Profile',
      subtitle: 'Your teacher profile',
      icon: 'person-circle',
      color: '#607D8B',
      screen: 'TeacherMyProfile'
    }
  ];

  const handleMenuPress = (item) => navigation.navigate(item.screen);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh user data
      await refreshUser();
      // Refresh bookings
      if (user?.uid) {
        await dispatch(fetchTeacherBookings());
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    console.log('🚪 TeacherDashboard: Logout button pressed');
    try {
      const result = await logout();
      if (result.success) {
        console.log('✅ TeacherDashboard: Logout successful');
        // Navigointi tapahtuu automaattisesti App.js:ssä kun isAuthenticated muuttuu
      } else {
        console.error('❌ TeacherDashboard: Logout failed:', result.error);
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ TeacherDashboard: Logout error:', error);
      alert('An error occurred during logout.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Welcome,</Text>
            <Text style={styles.headerName}> {user?.name || 'User'}!</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setDrawerVisible(true)}
            >
              <Ionicons name="menu" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Upcoming Lessons (from accepted/confirmed bookings) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const now = Date.now();
            const isUpcoming = (b) => (b.status === 'accepted' || b.status === 'confirmed') && new Date(b.date).getTime() >= now;
            const upcoming = bookings.filter(isUpcoming).sort((a,b)=> new Date(a.date) - new Date(b.date)).slice(0,3);
            
            console.log('📋 Upcoming Lessons:', {
              totalBookings: bookings.length,
              upcomingCount: upcoming.length,
              upcomingWithMeetingUrl: upcoming.filter(b => b.meetingUrl).length,
              sample: upcoming[0] ? {
                id: upcoming[0].id,
                status: upcoming[0].status,
                date: upcoming[0].date,
                hasMeetingUrl: !!upcoming[0].meetingUrl,
                meetingUrl: upcoming[0].meetingUrl
              } : 'none'
            });
            
            if (upcoming.length === 0) {
              return (
                <View style={styles.emptyRequestsCard}>
                  <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
                  <Text style={styles.emptyRequestsText}>No upcoming lessons</Text>
                </View>
              );
            }
            return upcoming.map(b => {
              // Use b.start for the full timestamp, fallback to date if start is not available
              const d = new Date(b.start || b.date);
              const parent = getParentById(b.parentId);
              const dayLabel = new Date().toDateString() === d.toDateString() ? 'Today' : d.toLocaleDateString('en-US', { weekday:'short' });
              const timeLabel = d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
              return (
                <View key={b.id} style={styles.lessonCard}>
                  <View style={styles.lessonTimeContainer}>
                    <Text style={styles.lessonTime}>{timeLabel}</Text>
                    <Text style={styles.lessonDate}>{dayLabel}</Text>
                  </View>
                  <View style={styles.lessonDetails}>
                    <Text style={styles.lessonStudent}>{parent?.name || parent?.fullName || parent?.displayName || 'Parent'}</Text>
                    {b.notes ? (
                      <Text style={styles.lessonSubject} numberOfLines={1}>{b.notes}</Text>
                    ) : null}
                  </View>
                  {b.meetingUrl ? (
                    <TouchableOpacity style={styles.lessonAction} onPress={() => Linking.openURL(b.meetingUrl)}>
                      <Ionicons name="videocam" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.lessonAction} onPress={() => navigation.navigate('Calendar')}>
                      <Ionicons name="calendar" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            });
          })()}
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherBookings')}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {pendingRequests.length === 0 ? (
            <View style={styles.emptyRequestsCard}>
              <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyRequestsText}>No pending requests</Text>
            </View>
          ) : (
            pendingRequests.map((booking) => {
              const parent = getParentById(booking.parentId);
              const bookingDate = new Date(booking.date);
              return (
                <View key={booking.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestStudent}>
                      {parent?.name || parent?.fullName || parent?.displayName || 'Parent'}
                    </Text>
                    <View style={styles.requestBadge}>
                      <Text style={styles.requestBadgeText}>New</Text>
                    </View>
                  </View>
                  {booking.notes && (
                    <Text style={styles.requestSubject} numberOfLines={1}>{booking.notes}</Text>
                  )}
                  <Text style={styles.requestTime}>
                    Requested: {bookingDate.toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={styles.acceptButton}
                      onPress={() => handleAccept(booking)}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.declineButton}
                      onPress={() => handleDecline(booking)}
                    >
                      <Ionicons name="close" size={18} color={colors.error} />
                      <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{weekLabel}</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar" size={28} color={colors.primary} />
              <Text style={styles.statNumber}>{displayWeekLessons}</Text>
              <Text style={styles.statLabel}>Lessons</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people" size={28} color={colors.secondary} />
              <Text style={styles.statNumber}>{displayWeekStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={28} color="#00BCD4" />
              <Text style={styles.statNumber}>{displayWeekHours}h</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('TeacherBookings')}
            >
              <Ionicons name="list" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>All Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Conversations')}
            >
              <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Messages</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Simple Drawer */}
      <SimpleDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        navigation={navigation}
        menuItems={drawerMenuItems}
        userType="teacher"
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.secondary,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    opacity: 0.9,
  },
  headerName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  lessonCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  lessonTimeContainer: {
    marginRight: 16,
    alignItems: 'center',
    minWidth: 54,
  },
  lessonTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  lessonDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  lessonDetails: {
    flex: 1,
  },
  lessonStudent: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  lessonSubject: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  lessonAction: {
    padding: 8,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyRequestsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyRequestsText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestStudent: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  requestBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  requestBadgeText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: '600',
  },
  requestSubject: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 6,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acceptButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  declineButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  declineButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 13,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 11,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default TeacherDashboard;