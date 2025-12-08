import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated
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
import WatercolorBackground from '../../components/WatercolorBackground';
import BookingsScreen from '../shared/BookingsScreen';
import { colors, commonStyles } from '../../styles/commonStyles';

const TeacherDashboard = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings) || [];
  const { getParentById } = useAppData();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);
  const menuButtonScale = new Animated.Value(1);

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
    { label: 'My Profile', screen: 'Profile', icon: 'person' },
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
      screen: 'Profile'
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
      <WatercolorBackground />
      
      {/* Floating Header */}
      <View style={styles.floatingHeader}>
        <Animated.View 
          style={[
            styles.floatingHeaderLeft,
            {
              opacity: scrollY.interpolate({
                inputRange: [0, 100],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            }
          ]}
        >
          <View>
            <Text style={styles.floatingHeaderTitle}>Welcome,</Text>
            <Text style={styles.floatingHeaderName}>{user?.name || 'Teacher'}!</Text>
          </View>
        </Animated.View>
        <View style={styles.floatingHeaderRight}>
          <NotificationBell />
          <TouchableOpacity 
            activeOpacity={0.8}
            onPressIn={() => {
              Animated.spring(menuButtonScale, {
                toValue: 0.85,
                useNativeDriver: true,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(menuButtonScale, {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
              }).start();
            }}
            onPress={() => setDrawerVisible(true)}
          >
            <Animated.View 
              style={[
                styles.menuButton,
                { transform: [{ scale: menuButtonScale }] }
              ]}
            >
              <Ionicons name="menu" size={28} color={colors.primary} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Upcoming Lessons */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Varaukset</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TeacherBookings')}>
              <Text style={styles.seeAllText}>Näytä kaikki</Text>
            </TouchableOpacity>
          </View>
          {(() => {
            const now = Date.now();
            const isUpcoming = (b) => (b.status === 'accepted' || b.status === 'confirmed') && new Date(b.date).getTime() >= now;
            const isJoinable = (b) => {
              if (!b.date || !b.meetingUrl) return false;
              if (b.status !== 'approved' && b.status !== 'accepted' && b.status !== 'confirmed') return false;
              const bookingDate = new Date(b.date);
              const diffInMinutes = (bookingDate - now) / (1000 * 60);
              return diffInMinutes <= 60 && diffInMinutes >= -30;
            };
            
            const joinableBookings = bookings.filter(isJoinable);
            const upcomingBookings = bookings.filter(isUpcoming).sort((a,b)=> new Date(a.date) - new Date(b.date));
            const upcoming = upcomingBookings.slice(0,3);
            
            // Show joinable bookings first
            const displayBookings = joinableBookings.length > 0 
              ? [...joinableBookings.slice(0, 2), ...upcoming.slice(0, 3 - joinableBookings.length)]
              : upcoming;
            
            if (displayBookings.length === 0) {
              return (
                <View style={styles.emptyRequestsCard}>
                  <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
                  <Text style={styles.emptyRequestsText}>Ei tulevia tunteja</Text>
                  <TouchableOpacity 
                    style={styles.viewAllBookingsButton}
                    onPress={() => navigation.navigate('TeacherBookings')}
                  >
                    <Text style={styles.viewAllBookingsText}>Näytä kaikki varaukset</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            
            return (
              <>
                {joinableBookings.length > 0 && (
                  <View style={styles.joinableBanner}>
                    <Ionicons name="videocam" size={20} color="#FFFFFF" />
                    <Text style={styles.joinableBannerText}>
                      {joinableBookings.length} {joinableBookings.length === 1 ? 'tapaaminen' : 'tapaamista'} johon voit liittyä nyt
                    </Text>
                  </View>
                )}
                {displayBookings.map(b => {
              // Use b.start for the full timestamp, fallback to date if start is not available
              const d = new Date(b.start || b.date);
              const parent = getParentById(b.parentId);
              const dayLabel = new Date().toDateString() === d.toDateString() ? 'Today' : d.toLocaleDateString('en-US', { weekday:'short' });
              const timeLabel = d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
              const canJoin = isJoinable(b);
              return (
                <View key={b.id} style={[styles.lessonCard, canJoin && styles.joinableLessonCard]}>
                  {canJoin && (
                    <View style={styles.joinableBadge}>
                      <Ionicons name="time" size={12} color="#FFFFFF" />
                      <Text style={styles.joinableBadgeText}>Liity nyt</Text>
                    </View>
                  )}
                  <View style={styles.lessonTimeContainer}>
                    <Text style={styles.lessonTime}>{timeLabel}</Text>
                    <Text style={styles.lessonDate}>{dayLabel}</Text>
                  </View>
                  <View style={styles.lessonDetails}>
                    <Text style={styles.lessonStudent}>{parent?.name || parent?.fullName || parent?.displayName || 'Oppilas'}</Text>
                    {b.notes ? (
                      <Text style={styles.lessonSubject} numberOfLines={1}>{b.notes}</Text>
                    ) : null}
                  </View>
                  {canJoin && b.meetingUrl ? (
                    <TouchableOpacity style={[styles.lessonAction, styles.joinButton]} onPress={() => Linking.openURL(b.meetingUrl)}>
                      <Ionicons name="videocam" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  ) : b.meetingUrl ? (
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
            })}
              </>
            );
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
  floatingHeader: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  floatingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingHeaderTitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  floatingHeaderName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  floatingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  content: {
    padding: 20,
    paddingTop: 100,
    paddingBottom: 40,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  lessonCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
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
    minWidth: 60,
  },
  lessonTime: {
    fontSize: 18,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  lessonSubject: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  lessonAction: {
    padding: 8,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  emptyRequestsCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  emptyRequestsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
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
    padding: 16,
    alignItems: 'center',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  joinableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  joinableBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  joinableLessonCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#F0F4FF',
  },
  joinableBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  joinableBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 8,
  },
  viewAllBookingsButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  viewAllBookingsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
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