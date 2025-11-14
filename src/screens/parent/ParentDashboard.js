import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useAppData } from '../../hooks/useAppData';
import { colors, commonStyles } from '../../styles/commonStyles';

const ParentDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { getFavoriteTeachers, loadFavorites } = useAppData();

  const favorites = getFavoriteTeachers();

  React.useEffect(() => {
    loadFavorites().catch(() => {});
  }, []);

  const menuItems = [
    {
      id: 1,
      title: 'Find Teachers',
      subtitle: 'Discover the best teachers worldwide',
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
      title: 'Conversations',
      subtitle: 'Messages with teachers',
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
      id: 7,
      title: 'Calendar',
      subtitle: 'Monthly lesson overview',
      icon: 'calendar',
      color: '#3F51B5',
      screen: 'Calendar'
    },
    {
      id: 5,
      title: 'Payments',
      subtitle: 'Payment information and billing',
      icon: 'card',
      color: colors.secondary,
      screen: 'Payments'
    },
    {
      id: 6,
      title: 'My Profile',
      subtitle: 'Your information and settings',
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
          <View>
            <Text style={styles.headerTitle}>Welcome,</Text>
            <Text style={styles.headerName}>{user?.name || 'Parent'}!</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="heart" size={30} color="#F44336" />
            <Text style={styles.statNumber}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={30} color="#4CAF50" />
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubble-outline" size={30} color="#2196F3" />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        {/* Quick Search */}
        <View style={styles.quickSearchContainer}>
          <Text style={styles.sectionTitle}>Quick Search</Text>
          <TouchableOpacity 
            style={styles.quickSearchButton}
            onPress={() => handleMenuPress({screen: 'FindTeachers'})}
          >
            <View style={styles.quickSearchIcon}>
              <Ionicons name="search" size={24} color={colors.white} />
            </View>
            <View style={styles.quickSearchContent}>
              <Text style={styles.quickSearchTitle}>Find Teachers</Text>
              <Text style={styles.quickSearchSubtitle}>Subject, location, price...</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Tools</Text>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color={colors.white} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Recommended Teachers */}
        <View style={styles.recommendedContainer}>
          <Text style={styles.sectionTitle}>Recommended Teachers</Text>
          <View style={styles.teacherCard}>
            <View style={styles.teacherAvatar}>
              <Ionicons name="person" size={30} color={colors.white} />
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>Anna Smith</Text>
              <Text style={styles.teacherSubject}>Mathematics • High School</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.rating}>4.9</Text>
                <Text style={styles.reviewCount}>(127 reviews)</Text>
              </View>
            </View>
            <Text style={styles.price}>25€/h</Text>
          </View>

          <View style={styles.teacherCard}>
            <View style={[styles.teacherAvatar, {backgroundColor: colors.secondary}]}>
              <Ionicons name="person" size={30} color={colors.white} />
            </View>
            <View style={styles.teacherInfo}>
              <Text style={styles.teacherName}>Michael Johnson</Text>
              <Text style={styles.teacherSubject}>English • All Levels</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.rating}>4.8</Text>
                <Text style={styles.reviewCount}>(89 reviews)</Text>
              </View>
            </View>
            <Text style={styles.price}>20€/h</Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 5,
  },
  quickSearchContainer: {
    marginBottom: 30,
  },
  quickSearchButton: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  quickSearchIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  quickSearchContent: {
    flex: 1,
  },
  quickSearchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  quickSearchSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  menuContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  menuItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  recommendedContainer: {
    marginBottom: 20,
  },
  teacherCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  teacherAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  teacherSubject: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 5,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 5,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E91E63',
  },
});

export default ParentDashboard;