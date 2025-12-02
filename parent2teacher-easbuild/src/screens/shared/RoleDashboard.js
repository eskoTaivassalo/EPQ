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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { getRoleConfig, getRoleColors, getCanonicalRole } from '../../config/roleConfig';

const RoleDashboard = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleConfig = getRoleConfig(role);
  const roleColors = getRoleColors(role);

  useEffect(() => {
    loadDashboardData();
  }, [user?.uid]);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      // TODO: Load real stats from Firestore
      const mockStats = {
        activeBookings: 12,
        totalClients: 45,
        unreadMessages: 3,
        upcomingSessions: 8,
        upcomingBookings: 5,
        totalBookings: 28,
        favoriteProviders: 7,
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setRefreshing(false);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: roleColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name={roleConfig.icon} size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{roleConfig.nameLocalized}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
          {stats.unreadMessages > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats.unreadMessages}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: roleColors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            {Object.values(roleConfig.navigation)
              .filter(nav => nav.screen !== (roleConfig.id === 'service_provider' ? 'TeacherDashboard' : 'ParentDashboard'))
              .slice(0, 6)
              .map(nav => renderQuickAction(nav))}
          </View>
        </View>

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
});

export default RoleDashboard;
