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
import NotificationBell from '../../components/NotificationBell';
import { colors, commonStyles } from '../../styles/commonStyles';

const TeacherDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();

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
          <View>
            <Text style={styles.headerTitle}>Welcome,</Text>
            <Text style={styles.headerName}> {user?.name || 'User'}!</Text>
          </View>
          <View style={styles.headerActions}>
            <NotificationBell />
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Link: Bookings & Requests */}
        <View style={styles.quickLinkContainer}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <TouchableOpacity 
            style={styles.quickLinkButton}
            onPress={() => navigation.navigate('TeacherBookings')}
          >
            <View style={styles.quickLinkIcon}>
              <Ionicons name="calendar" size={24} color={colors.white} />
            </View>
            <View style={styles.quickLinkContent}>
              <Text style={styles.quickLinkTitle}>Bookings & Requests</Text>
              <Text style={styles.quickLinkSubtitle}>View and manage upcoming lessons</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>
        {/* Stats and Quick Actions removed for a cleaner UI */}

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

        {/* Recent Activity could be reintroduced later with real data */}
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
    backgroundColor: colors.secondary,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickLinkContainer: {
    marginBottom: 20,
  },
  quickLinkButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 4,
  },
  quickLinkIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quickLinkSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
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
  quickActionsContainer: {
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
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
  activityContainer: {
    marginBottom: 20,
  },
  activityItem: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
});

export default TeacherDashboard;