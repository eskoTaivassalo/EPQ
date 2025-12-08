import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { colors } from '../../styles/commonStyles';
import { ROLE_CONFIG, ROLE_TYPES } from '../../config/roleConfig';
import WatercolorBackground from '../../components/WatercolorBackground';
import { hasAdminPermission } from '../../middleware/adminAuth';

const AdminDashboard = ({ navigation }) => {
  const authState = useSelector((state) => state.auth);
  const { user } = authState;
  const adminConfig = ROLE_CONFIG[ROLE_TYPES.ADMIN];

  // 🛡️ SECURITY: Check admin permission
  useEffect(() => {
    if (!hasAdminPermission(authState)) {
      Alert.alert(
        'Unauthorized',
        'You do not have permission to access this area.',
        [{ text: 'OK', onPress: () => navigation.replace('Dashboard') }]
      );
    }
  }, [authState]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeachers: 0,
    totalParents: 0,
    activeBookings: 0,
    totalBookings: 0,
    pendingReports: 0,
    recentUsers: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch teachers
      const teachersSnapshot = await getDocs(collection(db, 'teachers'));
      const teachers = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch parents
      const parentsSnapshot = await getDocs(collection(db, 'parents'));
      const parents = parentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch bookings
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate active bookings (status: accepted, start date in future)
      const now = new Date();
      const activeBookings = bookings.filter(b => 
        b.status === 'accepted' && 
        b.start && 
        new Date(b.start) > now
      );

      // Get recent users (last 5)
      const allUsers = [...teachers, ...parents]
        .filter(u => u.createdAt)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5);

      setStats({
        totalUsers: teachers.length + parents.length,
        totalTeachers: teachers.length,
        totalParents: parents.length,
        activeBookings: activeBookings.length,
        totalBookings: bookings.length,
        pendingReports: 0, // TODO: Implement reports system
        recentUsers: allUsers,
      });

    } catch (error) {
      console.error('Error loading admin dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      )}
    </TouchableOpacity>
  );

  const QuickActionButton = ({ icon, label, onPress, color }) => (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: color + '15' }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={28} color={color} />
      <Text style={[styles.quickActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <WatercolorBackground />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={adminConfig.colors.primary} />
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WatercolorBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: adminConfig.colors.primary }]}>
          <View style={styles.headerContent}>
            <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Welcome back, {user?.displayName || 'Administrator'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            
            <StatCard
              icon="people"
              label="Total Users"
              value={stats.totalUsers}
              color={adminConfig.colors.primary}
              onPress={() => navigation.navigate('UserManagement')}
            />

            <View style={styles.statsRow}>
              <View style={styles.halfStatCard}>
                <StatCard
                  icon="person"
                  label="Teachers"
                  value={stats.totalTeachers}
                  color="#FF6B35"
                />
              </View>
              <View style={styles.halfStatCard}>
                <StatCard
                  icon="people-outline"
                  label="Parents"
                  value={stats.totalParents}
                  color="#3B82F6"
                />
              </View>
            </View>

            <StatCard
              icon="calendar"
              label="Active Bookings"
              value={stats.activeBookings}
              color="#10B981"
              onPress={() => navigation.navigate('AdminBookings')}
            />

            <StatCard
              icon="time"
              label="Total Bookings"
              value={stats.totalBookings}
              color="#8B5CF6"
              onPress={() => navigation.navigate('AdminBookings')}
            />
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <QuickActionButton
                icon="people"
                label="Manage Users"
                color={adminConfig.colors.primary}
                onPress={() => navigation.navigate('UserManagement')}
              />
              <QuickActionButton
                icon="stats-chart"
                label="Statistics"
                color="#10B981"
                onPress={() => navigation.navigate('AdminStatistics')}
              />
              <QuickActionButton
                icon="calendar"
                label="Bookings"
                color="#F59E0B"
                onPress={() => navigation.navigate('AdminBookings')}
              />
              <QuickActionButton
                icon="document-text"
                label="Reports"
                color="#EF4444"
                onPress={() => navigation.navigate('AdminReports')}
              />
            </View>
          </View>

          {/* Recent Users */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            {stats.recentUsers.map((user, index) => (
              <TouchableOpacity
                key={user.id}
                style={styles.recentUserCard}
                onPress={() => navigation.navigate('UserManagement', { userId: user.id })}
              >
                <View style={styles.recentUserInfo}>
                  <View style={styles.recentUserAvatar}>
                    {user.photoURL ? (
                      <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={24} color={colors.textLight} />
                    )}
                  </View>
                  <View style={styles.recentUserDetails}>
                    <Text style={styles.recentUserName}>{user.fullName || user.name || 'Unknown'}</Text>
                    <Text style={styles.recentUserEmail}>{user.email}</Text>
                    <Text style={styles.recentUserRole}>
                      {user.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍👩‍👧 Parent'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5FF',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfStatCard: {
    flex: 1,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: '48%',
    aspectRatio: 1.5,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  recentUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  recentUserDetails: {
    flex: 1,
  },
  recentUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recentUserEmail: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  recentUserRole: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },
});

export default AdminDashboard;
