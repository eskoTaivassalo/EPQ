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
import { useAuth } from '../context/AuthContext';
import { colors, commonStyles } from '../styles/commonStyles';

const TeacherDashboard = ({ navigation }) => {
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 1,
      title: 'Students',
      subtitle: 'Manage students',
      icon: 'people',
      color: colors.primary,
      screen: 'Students'
    },
    {
      id: 2,
      title: 'Grading',
      subtitle: 'Grade assignments',
      icon: 'clipboard',
      color: colors.secondary,
      screen: 'Grading'
    },
    {
      id: 3,
      title: 'Assignments',
      subtitle: 'Create and manage tasks',
      icon: 'document-text',
      color: '#9C27B0',
      screen: 'Assignments'
    },
    {
      id: 4,
      title: 'Schedule',
      subtitle: 'Timetable and classes',
      icon: 'calendar',
      color: '#2196F3',
      screen: 'Schedule'
    },
    {
      id: 5,
      title: 'Find Teachers',
      subtitle: 'Connect with other teachers',
      icon: 'search',
      color: '#FF9800',
      screen: 'FindTeachers'
    },
    {
      id: 6,
      title: 'Messages',
      subtitle: 'Chat with parents',
      icon: 'chatbubbles',
      color: '#4CAF50',
      screen: 'Messages'
    },
    {
      id: 7,
      title: 'Profile',
      subtitle: 'Create teacher profile',
      icon: 'person-circle',
      color: '#607D8B',
      screen: 'Profile'
    }
  ];

  const handleMenuPress = (item) => {
    if (item.screen === 'Profile') {
      navigation.navigate('TeacherMyProfile');
    } else if (item.screen === 'FindTeachers') {
      navigation.navigate('FindTeachers');
    } else {
      // For now just show alert, later navigate to actual pages
      alert(`Navigate to: ${item.title}`);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Welcome,</Text>
            <Text style={styles.headerName}>Teacher {user?.name || 'User'}!</Text>
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
            <Ionicons name="people" size={30} color={colors.primary} />
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="clipboard-outline" size={30} color={colors.secondary} />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Gradings</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="mail-outline" size={30} color="#2196F3" />
            <Text style={styles.statNumber}>5</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="add-circle" size={30} color={colors.primary} />
              <Text style={styles.quickActionText}>Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="school" size={30} color={colors.secondary} />
              <Text style={styles.quickActionText}>Grade</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Ionicons name="send" size={30} color="#2196F3" />
              <Text style={styles.quickActionText}>Send Message</Text>
            </TouchableOpacity>
          </View>
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

        {/* Recent Activity */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Math tests graded</Text>
              <Text style={styles.activityTime}>1 hour ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="mail" size={20} color="#2196F3" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New message from parent</Text>
              <Text style={styles.activityTime}>3 hours ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Ionicons name="add-circle" size={20} color={colors.secondary} />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New assignment created</Text>
              <Text style={styles.activityTime}>Yesterday</Text>
            </View>
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