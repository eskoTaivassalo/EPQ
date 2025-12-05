import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  RefreshControl,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../../components/NotificationBell';
import SimpleDrawer from '../../components/SimpleDrawer';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useAppData } from '../../hooks/useAppData';
import { fetchParentBookings, selectBookings } from '../../store/slices/bookingsSlice';
import { initDeviceLocation } from '../../store/slices/locationSlice';
import { colors, commonStyles } from '../../styles/commonStyles';
import { db } from '../../config/firebaseConfig';
import { collection, query, limit, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { SUBJECTS } from '../../constants/subjects';
import { bookSlot, listAvailableSlots } from '../../services/availabilityService';
import ProfileImagePicker from '../../components/ProfileImagePicker';
import { listFeedbackForUser } from '../../services/feedbackService';

const ParentDashboard = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const dispatch = useDispatch();
  const bookings = useSelector(selectBookings) || [];
  const { getFavoriteTeachers, loadFavorites, getTeacherById } = useAppData();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendedTeachers, setRecommendedTeachers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [learningProgress, setLearningProgress] = useState([]);
  const scrollY = new Animated.Value(0);
  const menuButtonScale = new Animated.Value(1);

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
      
      // Enrich with ratings from feedback
      const teachersWithRatings = await Promise.all(
        teachers.map(async (teacher) => {
          try {
            const feedbacks = await listFeedbackForUser(teacher.id);
            const ratingsOnly = feedbacks.filter(fb => fb.rating && fb.rating > 0);
            
            if (ratingsOnly.length > 0) {
              const sum = ratingsOnly.reduce((acc, fb) => acc + fb.rating, 0);
              const avgRating = sum / ratingsOnly.length;
              return { 
                ...teacher, 
                rating: avgRating,
                reviewCount: feedbacks.length
              };
            }
            return { ...teacher, rating: 0, reviewCount: 0 };
          } catch (err) {
            console.warn(`Could not load rating for teacher ${teacher.id}:`, err);
            return { ...teacher, rating: 0, reviewCount: 0 };
          }
        })
      );
      
      console.log(`📚 Showing ${teachersWithRatings.length} recommended teachers with ratings`);
      setRecommendedTeachers(teachersWithRatings);
    } catch (error) {
      console.error('❌ Error loading recommended teachers:', error);
      console.error('Error details:', error.message, error.code);
    }
  };

  // Load feedback for parent
  const loadFeedbacks = async () => {
    if (!user?.uid) return;
    setFeedbacksLoading(true);
    try {
      const feedbackList = await listFeedbackForUser(user.uid);
      console.log('📝 Loaded feedbacks:', feedbackList.length);
      
      // Enrich with teacher details
      const enrichedFeedbacks = await Promise.all(
        feedbackList.slice(0, 5).map(async (feedback) => {
          try {
            const teacherDoc = await getDoc(doc(db, 'teachers', feedback.fromUserId));
            const teacherData = teacherDoc.exists() ? teacherDoc.data() : {};
            return {
              ...feedback,
              teacherName: teacherData.firstName 
                ? `${teacherData.firstName} ${teacherData.lastName || ''}`.trim()
                : teacherData.displayName || 'Teacher',
              subject: feedback.subject || 'General'
            };
          } catch (err) {
            console.warn('Error loading teacher for feedback:', err);
            return { ...feedback, teacherName: 'Teacher', subject: 'General' };
          }
        })
      );
      
      setFeedbacks(enrichedFeedbacks);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  // Calculate learning progress from bookings
  const calculateLearningProgress = () => {
    if (!bookings || bookings.length === 0) {
      setLearningProgress([]);
      return;
    }

    // Group bookings by subject
    const subjectStats = {};
    
    bookings.forEach((booking) => {
      const subject = booking.subject || booking.lessonSubject || 'General';
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          subject,
          total: 0,
          completed: 0
        };
      }
      
      subjectStats[subject].total++;
      
      // Count as completed if status is accepted/confirmed and date is in the past
      const bookingDate = new Date(booking.start || booking.date);
      const isPast = bookingDate < new Date();
      const isCompleted = (booking.status === 'accepted' || booking.status === 'confirmed') && isPast;
      
      if (isCompleted) {
        subjectStats[subject].completed++;
      }
    });

    // Convert to array and calculate percentages
    const progressData = Object.values(subjectStats)
      .map((stat) => ({
        subject: stat.subject,
        completed: stat.completed,
        total: stat.total,
        percentage: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total) // Sort by total lessons (most active subjects first)
      .slice(0, 5); // Show top 5 subjects

    console.log('📊 Learning progress:', progressData);
    setLearningProgress(progressData);
  };

  useEffect(() => {
    loadRecommendedTeachers();
    loadFeedbacks();
  }, [user?.uid]);

  // Calculate progress when bookings change
  useEffect(() => {
    calculateLearningProgress();
  }, [bookings]);

  // Reload recommendations when screen comes into focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      console.log('📱 ParentDashboard focused - reloading recommendations');
      loadRecommendedTeachers();
      loadFeedbacks();
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
      await loadFeedbacks();
      // Progress will recalculate automatically via useEffect when bookings update
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

  // ...existing code...

  // Slot-listaus dashboardiin
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    const loadSlots = async () => {
      setSlotsLoading(true);
      try {
        // Listaa kaikki opettajien vapaat slotit seuraavan 7 päivän ajalta
        const from = new Date();
        const to = new Date();
        to.setDate(to.getDate() + 7);
        // Voit halutessasi rajata vain suosikkiopettajiin
        let allSlots = [];
        for (const teacher of recommendedTeachers) {
          const slots = await listAvailableSlots(teacher.id, from, to);
          allSlots = allSlots.concat(slots.map(s => ({ ...s, teacher })));
        }
        setAvailableSlots(allSlots);
      } catch (e) {
        console.error('Slot load error', e);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadSlots();
  }, [recommendedTeachers]);

  // Slotin varaus
  const handleBookSlotWithSubject = async (slot) => {
    let selectedSubject = null;
    if (Array.isArray(slot.subjects) && slot.subjects.length > 0) {
      selectedSubject = await new Promise(resolve => {
        Alert.alert(
          'Valitse aine',
          'Valitse varattava aine tälle ajalle:',
          [
            ...slot.subjects.map(subj => ({ text: subj, onPress: () => resolve(subj) })),
            { text: 'Peruuta', style: 'cancel', onPress: () => resolve(null) }
          ]
        );
      });
      if (!selectedSubject) return;
    }
    const ok = await new Promise(resolve => {
      Alert.alert(
        'Vahvista varaus',
        `${new Date(slot.start).toLocaleString()} - ${new Date(slot.end).toLocaleTimeString()}` + (selectedSubject ? `\nAine: ${selectedSubject}` : ''),
        [ { text: 'Peruuta', style: 'cancel', onPress: () => resolve(false) }, { text: 'Varaa', onPress: () => resolve(true) } ]
      );
    });
    if (!ok) return;
    try {
      await bookSlot(slot.id, user.uid, selectedSubject ? { subject: selectedSubject } : {});
      Alert.alert('Varaus tehty', 'Varaus onnistui!');
      setAvailableSlots(prev => prev.filter(s => s.id !== slot.id));
      dispatch(fetchParentBookings());
    } catch (e) {
      Alert.alert('Virhe', e.message || 'Varaus epäonnistui');
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
            <Text style={styles.floatingHeaderName}>{user?.name || 'Student'}!</Text>
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


        {/* Recent Grades & Feedback */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {feedbacksLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading feedback...</Text>
            </View>
          ) : feedbacks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No feedback yet</Text>
              <Text style={styles.emptySubtext}>Feedback from teachers will appear here</Text>
            </View>
          ) : (
            feedbacks.map((feedback) => {
              const feedbackDate = feedback.createdAt?.toDate ? feedback.createdAt.toDate() : new Date(feedback.createdAt);
              const daysAgo = Math.floor((Date.now() - feedbackDate.getTime()) / (1000 * 60 * 60 * 24));
              const timeAgoText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
              
              return (
                <View key={feedback.id} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.feedbackInfo}>
                      <Text style={styles.feedbackSubject}>{feedback.subject}</Text>
                      <Text style={styles.feedbackTeacher}>{feedback.teacherName}</Text>
                    </View>
                    {feedback.rating && (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>{feedback.rating}/5</Text>
                      </View>
                    )}
                  </View>
                  {feedback.feedbackText && (
                    <Text style={styles.feedbackComment} numberOfLines={3}>
                      "{feedback.feedbackText}"
                    </Text>
                  )}
                  <Text style={styles.feedbackDate}>{timeAgoText}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Learning Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Progress</Text>
          
          {learningProgress.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No progress data yet</Text>
              <Text style={styles.emptySubtext}>Book lessons to track your progress</Text>
            </View>
          ) : (
            learningProgress.map((progress, index) => {
              // Alternate colors for visual variety
              const progressColor = index % 3 === 0 ? colors.primary : 
                                   index % 3 === 1 ? colors.secondary : '#9C27B0';
              
              return (
                <View key={progress.subject} style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressSubject}>{progress.subject}</Text>
                    <Text style={[styles.progressPercentage, { color: progressColor }]}>
                      {progress.percentage}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${progress.percentage}%`, 
                          backgroundColor: progressColor 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressDetails}>
                    {progress.completed} of {progress.total} lessons completed
                  </Text>
                </View>
              );
            })
          )}
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
                <View key={teacher.id} style={styles.teacherCard}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('TeacherProfileView', { teacherId: teacher.id })}
                    style={styles.teacherCardContent}
                  >
                    <ProfileImagePicker
                      imageUri={teacher.photoURL || teacher.profile?.photoURL}
                      size={80}
                      editable={false}
                    />
                    <Text style={styles.teacherName} numberOfLines={1} ellipsizeMode="tail">
                      {teacher.name || teacher.fullName || 'Teacher'}
                    </Text>
                    
                    {/* Subjects */}
                    <View style={styles.teacherSubjects}>
                      <Text style={styles.teacherSubject} numberOfLines={2}>
                        {(teacher.subjects || teacher.profile?.subjects || []).slice(0, 2).join(', ') || 'Various Subjects'}
                      </Text>
                    </View>
                    
                    {/* Location */}
                    {(teacher.location || teacher.profile?.location) && (
                      <Text style={styles.locationText} numberOfLines={1}>
                        <Ionicons name="location-outline" size={11} color={colors.textSecondary} /> {teacher.location || teacher.profile?.location}
                      </Text>
                    )}
                    
                    {/* Rating */}
                    {teacher.rating > 0 && (
                      <View style={styles.teacherRating}>
                        <Ionicons name="star" size={14} color="#FFD700" />
                        <Text style={styles.ratingText}>{teacher.rating.toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({teacher.reviewCount})</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
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
  logoutButton: {
    padding: 8,
  },
  content: {
    padding: 20,
    paddingTop: 100,
    paddingBottom: 40,
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
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
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
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
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
    backgroundColor: 'rgba(102, 126, 234, 0.25)',
    borderRadius: 20,
    marginRight: 16,
    width: 190,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.4)',
    overflow: 'hidden',
  },
  teacherCardContent: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  messageButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
    marginTop: 2,
  },
  teacherRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  teacherSubjects: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 10,
    marginVertical: 4,
  },
  teacherSubject: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  teacherExperience: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  experienceText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  teacherLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
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