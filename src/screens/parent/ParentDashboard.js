import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/NotificationBell';
import SimpleDrawer from '../../components/SimpleDrawer';
import { useAppData } from '../../hooks/useAppData';
import { fetchParentBookings, selectBookings } from '../../store/slices/bookingsSlice';
import * as NotificationService from '../../services/notificationService';
import { initDeviceLocation } from '../../store/slices/locationSlice';
import { colors, commonStyles } from '../../styles/commonStyles';

const ParentDashboard = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings) || [];
  const { getFavoriteTeachers, loadFavorites, getTeacherById } = useAppData();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchParentBookings());
    }
  }, [dispatch, user?.uid]);

  // Initialize device location (non-blocking)
  useEffect(() => {
    dispatch(initDeviceLocation());
  }, [dispatch]);

  // Schedule notifications for upcoming bookings (parent role)
  useEffect(() => {
    if (bookings.length > 0) {
      console.log('📅 Scheduling notifications for parent bookings...');
      NotificationService.scheduleAllUpcomingReminders(bookings, 'parent');
    }
  }, [bookings]);

  // Get upcoming confirmed/accepted bookings
  const upcomingBookings = bookings
    .filter(b => {
      const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
      const bookingDate = new Date(b.date);
      const now = new Date();
      return isConfirmed && bookingDate >= now;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 3); // Show max 3

  console.log('👨‍👩‍👧 Parent Dashboard - Upcoming Lessons:', {
    totalBookings: bookings.length,
    upcomingCount: upcomingBookings.length,
    withMeetingUrl: upcomingBookings.filter(b => b.meetingUrl).length,
    sample: upcomingBookings[0] ? {
      id: upcomingBookings[0].id,
      status: upcomingBookings[0].status,
      date: upcomingBookings[0].date,
      hasMeetingUrl: !!upcomingBookings[0].meetingUrl,
      meetingUrl: upcomingBookings[0].meetingUrl
    } : 'none'
  });

  const drawerMenuItems = [
    { label: 'Dashboard', screen: 'ParentDashboard', icon: 'home' },
    { label: 'Find Teachers', screen: 'FindTeachers', icon: 'search' },
    { label: 'My Profile', screen: 'ParentMyProfile', icon: 'person' },
    { label: 'Favorites', screen: 'ParentFavorites', icon: 'heart' },
    { label: 'Messages', screen: 'Conversations', icon: 'chatbubbles' },
    { label: 'Notifications', screen: 'Notifications', icon: 'notifications' },
    { label: 'Settings', screen: 'Settings', icon: 'settings' },
  ];

  const favorites = getFavoriteTeachers();

  React.useEffect(() => {
    loadFavorites().catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      if (user?.uid) {
        await dispatch(fetchParentBookings());
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const menuItems = [
    {
      id: 1,
      title: 'Find Teachers',
      subtitle: 'Discover teachers worldwide',
      icon: 'search',
      color: '#E91E63',
      screen: 'FindTeachers'
    },
    {
      id: 2,
      title: 'Favorites',
      subtitle: 'Saved teachers',
      icon: 'heart',
      color: '#F44336',
      screen: 'Favorites'
    },
    {
      id: 3,
      title: 'Messages',
      subtitle: 'Chat with teachers',
      icon: 'chatbubbles',
      color: '#2196F3',
      screen: 'Messages'
    },
    {
      id: 4,
      title: 'Bookings',
      subtitle: 'Scheduled lessons and events',
      icon: 'calendar',
      color: '#4CAF50',
      screen: 'Bookings'
    },
    {
      id: 5,
      title: 'Calendar',
      subtitle: 'Monthly overview',
      icon: 'calendar',
      color: '#3F51B5',
      screen: 'Calendar'
    },
    {
      id: 6,
      title: 'My Profile',
      subtitle: 'Information and settings',
      icon: 'person-circle',
      color: '#607D8B',
      screen: 'Profile'
    }
  ];

  const handleMenuPress = (item) => {
    if (item.screen === 'FindTeachers') {
      navigation.navigate('FindTeachers');
    } else if (item.screen === 'Profile') {
      navigation.navigate('ParentMyProfile');
    } else if (item.screen === 'Favorites') {
      navigation.navigate('ParentFavorites');
    } else if (item.screen === 'Bookings') {
      navigation.navigate('ParentBookings');
    } else if (item.screen === 'Calendar') {
      navigation.navigate('Calendar');
    } else if (item.screen === 'Messages') {
      navigation.navigate('Conversations');
    } else {
      // Other functions coming soon
      alert(`Function: ${item.title} - Coming Soon!`);
    }
  };

  const handleLogout = async () => {
    console.log('🚪 ParentDashboard: Logout button pressed');
    try {
      const result = await logout();
      if (result.success) {
        console.log('✅ ParentDashboard: Logout successful');
        // Navigointi tapahtuu automaattisesti App.js:ssä kun isAuthenticated muuttuu
      } else {
        console.error('❌ ParentDashboard: Logout failed:', result.error);
        alert('Logout failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ ParentDashboard: Logout error:', error);
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
            <Text style={styles.headerName}>{user?.name || 'Parent'}!</Text>
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
        {/* Upcoming Lessons */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No upcoming lessons</Text>
            </View>
          ) : (
            upcomingBookings.map(booking => {
              const bookingDate = new Date(booking.date);
              const teacher = getTeacherById(booking.teacherId);
              const now = new Date();
              const isToday = now.toDateString() === bookingDate.toDateString();
              const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === bookingDate.toDateString();
              
              let dayLabel;
              if (isToday) dayLabel = 'Today';
              else if (isTomorrow) dayLabel = 'Tomorrow';
              else dayLabel = bookingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              
              const timeLabel = bookingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              return (
                <View key={booking.id} style={styles.lessonCard}>
                  <View style={styles.lessonTimeContainer}>
                    <Text style={styles.lessonTime}>{timeLabel}</Text>
                    <Text style={styles.lessonDate}>{dayLabel}</Text>
                  </View>
                  <View style={styles.lessonDetails}>
                    <Text style={styles.lessonTeacher}>
                      {teacher?.name || teacher?.fullName || teacher?.displayName || 'Teacher'}
                    </Text>
                    {booking.notes && (
                      <Text style={styles.lessonSubject} numberOfLines={1}>{booking.notes}</Text>
                    )}
                  </View>
                  {booking.meetingUrl ? (
                    <TouchableOpacity style={styles.lessonAction} onPress={() => Linking.openURL(booking.meetingUrl)}>
                      <Ionicons name="videocam" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.lessonAction} onPress={() => navigation.navigate('Calendar')}>
                      <Ionicons name="calendar" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Recent Grades & Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackInfo}>
                <Text style={styles.feedbackSubject}>Mathematics</Text>
                <Text style={styles.feedbackTeacher}>Ms. Anderson</Text>
              </View>
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeText}>A</Text>
              </View>
            </View>
            <Text style={styles.feedbackComment}>
              "Excellent progress in algebra! Emma shows great understanding of equations."
            </Text>
            <Text style={styles.feedbackDate}>2 days ago</Text>
          </View>

          <View style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <View style={styles.feedbackInfo}>
                <Text style={styles.feedbackSubject}>English</Text>
                <Text style={styles.feedbackTeacher}>Mr. Thompson</Text>
              </View>
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeText}>B+</Text>
              </View>
            </View>
            <Text style={styles.feedbackComment}>
              "Good essay writing skills. Focus on grammar for improvement."
            </Text>
            <Text style={styles.feedbackDate}>5 days ago</Text>
          </View>
        </View>

        {/* Learning Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressSubject}>Mathematics</Text>
              <Text style={styles.progressPercentage}>75%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '75%', backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.progressDetails}>12 of 16 lessons completed</Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressSubject}>English Literature</Text>
              <Text style={styles.progressPercentage}>50%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '50%', backgroundColor: colors.secondary }]} />
            </View>
            <Text style={styles.progressDetails}>6 of 12 lessons completed</Text>
          </View>
        </View>

        {/* Recommended Teachers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FindTeachers')}>
              <Text style={styles.seeAllText}>Explore</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.teacherCard}>
              <View style={styles.teacherAvatar}>
                <Ionicons name="person" size={32} color={colors.white} />
              </View>
              <Text style={styles.teacherName}>Dr. Smith</Text>
              <Text style={styles.teacherSubject}>Physics</Text>
              <View style={styles.teacherRating}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>4.9</Text>
              </View>
            </View>

            <View style={styles.teacherCard}>
              <View style={styles.teacherAvatar}>
                <Ionicons name="person" size={32} color={colors.white} />
              </View>
              <Text style={styles.teacherName}>Ms. Garcia</Text>
              <Text style={styles.teacherSubject}>Spanish</Text>
              <View style={styles.teacherRating}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>4.8</Text>
              </View>
            </View>

            <View style={styles.teacherCard}>
              <View style={styles.teacherAvatar}>
                <Ionicons name="person" size={32} color={colors.white} />
              </View>
              <Text style={styles.teacherName}>Mr. Lee</Text>
              <Text style={styles.teacherSubject}>Chemistry</Text>
              <View style={styles.teacherRating}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>5.0</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('FindTeachers')}
            >
              <Ionicons name="search-outline" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>Find Teachers</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ParentBookings')}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={styles.actionButtonText}>My Bookings</Text>
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
        userType="parent"
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
    backgroundColor: '#E91E63',
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
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
    fontSize: 24,
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
    padding: 20,
  },
  locationCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: {
    fontSize: 14,
    color: colors.text,
  },
  manualLocationContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualLocationLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  manualButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  manualStatus: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
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
  lessonTeacher: {
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
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  feedbackCard: {
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
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackInfo: {
    flex: 1,
  },
  feedbackSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  feedbackTeacher: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  gradeContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  feedbackComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressCard: {
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
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  teacherCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  teacherAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  teacherSubject: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  teacherRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    fontWeight: '500',
  },
});

export default ParentDashboard;