import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/NotificationBell';
import SimpleDrawer from '../../components/SimpleDrawer';
import { useAppData } from '../../hooks/useAppData';
import { fetchParentBookings, selectBookings } from '../../store/slices/bookingsSlice';
import { initDeviceLocation } from '../../store/slices/locationSlice';
import { colors, commonStyles } from '../../styles/commonStyles';
import { db } from '../../config/firebaseConfig';
import { collection, query, limit, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import ProfileImagePicker from '../../components/ProfileImagePicker';

const ParentDashboard = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings) || [];
  const { getFavoriteTeachers, loadFavorites, getTeacherById } = useAppData();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendedTeachers, setRecommendedTeachers] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      dispatch(fetchParentBookings());
    }
  }, [dispatch, user?.uid]);

  // Initialize device location (non-blocking)
  useEffect(() => {
    dispatch(initDeviceLocation());
  }, [dispatch]);

  // Get upcoming confirmed/accepted bookings
  const upcomingBookings = bookings
    .filter(b => {
      const isConfirmed = b.status === 'accepted' || b.status === 'confirmed';
      // Use b.start for accurate time, fallback to date if not available
      const bookingDate = new Date(b.start || b.date);
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

  // NOTIFICATIONS REMOVED

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

  // Load recommended teachers from Firestore with smart matching
  const loadRecommendedTeachers = async () => {
    if (!db) {
      console.warn('Firestore not initialized');
      return;
    }
    
    try {
      // First, load parent's preferences
      let parentPreferences = {};
      try {
        const parentDocRef = doc(db, 'parents', user.uid);
        const parentSnap = await getDoc(parentDocRef);
        if (parentSnap.exists()) {
          const parentData = parentSnap.data();
          const nested = parentData.profile || {};
          parentPreferences = { ...parentData, ...nested };
          console.log('👪 Parent preferences loaded:', {
            subjects: parentPreferences.subjectsNeeded,
            location: parentPreferences.location,
            languages: parentPreferences.preferredLanguages,
            methods: parentPreferences.preferredTeachingMethods,
            specialNeeds: parentPreferences.specialNeeds
          });
        }
      } catch (err) {
        console.warn('Could not load parent preferences:', err);
      }

      const teachersRef = collection(db, 'teachers');
      // Fetch more teachers for better matching
      const q = query(teachersRef, limit(50));
      const snapshot = await getDocs(q);
      
      console.log(`📚 Fetched ${snapshot.docs.length} teachers from Firestore`);
      
      let teachers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter out current user and invalid profiles
      const currentUserEmail = user?.email?.toLowerCase();
      const currentUserId = user?.uid;
      
      teachers = teachers.filter(teacher => {
        const teacherEmail = (teacher.email || '').toLowerCase();
        const teacherId = teacher.id;
        
        // Don't show if same email or same ID
        const isSameEmail = currentUserEmail && teacherEmail && teacherEmail === currentUserEmail;
        const isSameId = currentUserId && teacherId && teacherId === currentUserId;
        
        if (isSameEmail || isSameId) return false;
        
        // Basic validation - must have name
        if (!teacher.firstName && !teacher.fullName && !teacher.displayName) {
          console.log(`⚠️ Teacher ${teacherId} missing name`);
          return false;
        }
        
        return true;
      });
      
      // Calculate match score for each teacher
      teachers = teachers.map(teacher => {
        let score = 0;
        const reasons = [];
        
        // Helper to normalize arrays
        const toArray = (val) => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === 'string') return val.split(',').map(s => s.trim());
          return [];
        };
        
        const parentSubjects = toArray(parentPreferences.subjectsNeeded);
        const parentLocation = toArray(parentPreferences.location);
        const parentLanguages = toArray(parentPreferences.preferredLanguages);
        const parentMethods = toArray(parentPreferences.preferredTeachingMethods);
        const parentSpecialNeeds = toArray(parentPreferences.specialNeeds);
        
        const teacherSubjects = toArray(teacher.subjects);
        const teacherLocation = toArray(teacher.location);
        const teacherLanguages = toArray(teacher.languages);
        const teacherMethods = toArray(teacher.teachingMethods);
        const teacherStyles = toArray(teacher.teachingStyles);
        
        // Subject match (highest priority: +10 per match)
        const subjectMatches = parentSubjects.filter(s => teacherSubjects.includes(s));
        if (subjectMatches.length > 0) {
          score += subjectMatches.length * 10;
          reasons.push(`Subjects: ${subjectMatches.join(', ')}`);
        }
        
        // Location match (+8)
        const locationMatches = parentLocation.filter(l => teacherLocation.includes(l));
        if (locationMatches.length > 0) {
          score += 8;
          reasons.push(`Location: ${locationMatches.join(', ')}`);
        }
        
        // Teaching method match (+5)
        const methodMatches = parentMethods.filter(m => teacherMethods.includes(m));
        if (methodMatches.length > 0) {
          score += 5;
          reasons.push(`Method: ${methodMatches.join(', ')}`);
        }
        
        // Language match (+3 per match)
        const languageMatches = parentLanguages.filter(l => teacherLanguages.includes(l));
        if (languageMatches.length > 0) {
          score += languageMatches.length * 3;
          reasons.push(`Languages: ${languageMatches.join(', ')}`);
        }
        
        // Special needs support (+7)
        if (parentSpecialNeeds.length > 0 && teacherStyles.some(s => 
          s === 'patient' || s === 'structured' || s === 'visual' || s === 'kinesthetic'
        )) {
          score += 7;
          reasons.push('Special needs support');
        }
        
        // High rating bonus (+2 if 4.5+)
        if (teacher.rating >= 4.5) {
          score += 2;
          reasons.push(`High rating: ${teacher.rating}`);
        }
        
        // Verified bonus (+1)
        if (teacher.verified) {
          score += 1;
        }
        
        // If no parent preferences, use recency and rating
        if (Object.keys(parentPreferences).length === 0) {
          const daysOld = teacher.createdAt 
            ? Math.floor((Date.now() - new Date(teacher.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          if (daysOld < 30) score += 3; // Recent teachers
          if (teacher.rating >= 4.0) score += Math.floor(teacher.rating);
        }
        
        return { ...teacher, matchScore: score, matchReasons: reasons };
      });
      
      // Sort by match score (highest first)
      teachers.sort((a, b) => b.matchScore - a.matchScore);
      
      console.log(`✅ Scored ${teachers.length} teachers`);
      console.log('🏆 Top matches:', teachers.slice(0, 6).map(t => 
        `${t.firstName || t.displayName} (score: ${t.matchScore}, reasons: ${t.matchReasons.join(', ') || 'none'})`
      ));
      
      // Limit to 6 best matches
      teachers = teachers.slice(0, 6);
      
      console.log(`📚 Showing ${teachers.length} recommended teachers`);
      setRecommendedTeachers(teachers);
    } catch (error) {
      console.error('❌ Error loading recommended teachers:', error);
      console.error('Error details:', error.message, error.code);
    }
  };

  useEffect(() => {
    loadRecommendedTeachers();
  }, []);

  // Reload recommendations when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ParentDashboard focused - reloading recommendations');
      loadRecommendedTeachers();
    }, [user?.uid])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      if (user?.uid) {
        await dispatch(fetchParentBookings());
      }
      await loadRecommendedTeachers();
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
              // Use booking.start for the full timestamp, fallback to date if start is not available
              const bookingDate = new Date(booking.start || booking.date);
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
          
          {recommendedTeachers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {recommendedTeachers.map((teacher) => (
                <TouchableOpacity
                  key={teacher.id}
                  style={styles.teacherCard}
                  onPress={() => navigation.navigate('TeacherProfileView', { teacherId: teacher.id })}
                >
                  <ProfileImagePicker
                    imageUri={teacher.photoURL || teacher.profile?.photoURL}
                    size={60}
                    editable={false}
                  />
                  <Text style={styles.teacherName} numberOfLines={1}>
                    {teacher.name || teacher.fullName || 'Teacher'}
                  </Text>
                  <Text style={styles.teacherSubject} numberOfLines={1}>
                    {teacher.subjects?.[0] || teacher.profile?.subjects?.[0] || 'Various Subjects'}
                  </Text>
                  {teacher.rating && (
                    <View style={styles.teacherRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.ratingText}>{teacher.rating.toFixed(1)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyRecommended}>
              <Ionicons name="people-outline" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No teachers available yet</Text>
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('FindTeachers')}
              >
                <Text style={styles.exploreButtonText}>Explore Teachers</Text>
              </TouchableOpacity>
            </View>
          )}
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
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
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
  emptyRecommended: {
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
  exploreButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
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