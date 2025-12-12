import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { colors } from '../../styles/commonStyles';
import { ROLE_CONFIG, ROLE_TYPES } from '../../config/roleConfig';
import WatercolorBackground from '../../components/WatercolorBackground';
import { hasAdminPermission } from '../../middleware/adminAuth';

const UserManagement = ({ navigation }) => {
  const authState = useSelector((state) => state.auth);
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
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // 'all', 'teacher', 'parent'

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, filterRole, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const serviceType = 'education';

      // Fetch teachers from new structure
      const teachersSnapshot = await getDocs(collection(db, 'serviceTypes', serviceType, 'teachers'));
      const teachers = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        role: 'teacher',
        collection: 'teachers',
        ...doc.data()
      }));

      // Fetch parents from new structure
      const parentsSnapshot = await getDocs(collection(db, 'serviceTypes', serviceType, 'parents'));
      const parents = parentsSnapshot.docs.map(doc => ({
        id: doc.id,
        role: 'parent',
        collection: 'parents',
        ...doc.data()
      }));

      const allUsers = [...teachers, ...parents].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA;
      });

      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        (u.fullName || u.name || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const handleToggleActive = async (user) => {
    // 🛡️ SECURITY: Verify admin permission before action
    if (!hasAdminPermission(authState)) {
      Alert.alert('Unauthorized', 'Admin access required');
      return;
    }

    try {
      const newStatus = !user.isActive;
      const userRef = doc(db, user.collection, user.id);
      
      await updateDoc(userRef, {
        isActive: newStatus,
        updatedAt: new Date().toISOString()
      });

      Alert.alert(
        'Success',
        `User ${newStatus ? 'activated' : 'deactivated'} successfully`
      );

      // Update local state
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isActive: newStatus } : u
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user) => {
    // 🛡️ SECURITY: Verify admin permission before action
    if (!hasAdminPermission(authState)) {
      Alert.alert('Unauthorized', 'Admin access required');
      return;
    }

    Alert.alert(
      'Delete User',
      `Are you sure you want to PERMANENTLY delete ${user.fullName || user.name || 'this user'}?\n\nThis will remove:\n• User profile\n• All bookings\n• All messages\n• All data\n\nThis action cannot be undone!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting user:', user.id, 'from collection:', user.collection);
              
              // 🗑️ PERMANENT DELETE: Remove user document from Firestore
              const userRef = doc(db, user.collection, user.id);
              await deleteDoc(userRef);
              
              console.log('✅ User deleted successfully from Firestore');

              // Remove from local state
              setUsers(users.filter(u => u.id !== user.id));
              
              Alert.alert('Success', 'User permanently deleted from database');
            } catch (error) {
              console.error('❌ Error deleting user:', error);
              console.error('Error details:', {
                code: error.code,
                message: error.message,
                userId: user.id,
                collection: user.collection
              });
              Alert.alert('Error', `Failed to delete user: ${error.message}\n\nCheck console for details.`);
            }
          }
        }
      ]
    );
  };

  const UserCard = ({ user }) => (
    <View style={styles.userCard}>
      <View style={styles.userCardHeader}>
        <View style={styles.userInfo}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Ionicons name="person" size={28} color={colors.textLight} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{user.fullName || user.name || 'Unknown'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.userMetaRow}>
              <View style={[
                styles.roleBadge,
                { backgroundColor: user.role === 'teacher' ? '#FF6B3515' : '#3B82F615' }
              ]}>
                <Text style={[
                  styles.roleBadgeText,
                  { color: user.role === 'teacher' ? '#FF6B35' : '#3B82F6' }
                ]}>
                  {user.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍👩‍👧 Parent'}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: user.isActive ? '#10B98115' : '#EF444415' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: user.isActive ? '#10B981' : '#EF4444' }
                ]}>
                  {user.isActive ? '✓ Active' : '✗ Inactive'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.userCardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleActive(user)}
        >
          <Ionicons 
            name={user.isActive ? "pause" : "play"} 
            size={18} 
            color={user.isActive ? '#F59E0B' : '#10B981'} 
          />
          <Text style={[styles.actionButtonText, { color: user.isActive ? '#F59E0B' : '#10B981' }]}>
            {user.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(user)}
        >
          <Ionicons name="trash" size={18} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <WatercolorBackground />
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={adminConfig.colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadUsers}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterRole === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterRole('all')}
            >
              <Text style={[
                styles.filterButtonText,
                filterRole === 'all' && styles.filterButtonTextActive
              ]}>
                All ({users.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterRole === 'teacher' && styles.filterButtonActive
              ]}
              onPress={() => setFilterRole('teacher')}
            >
              <Text style={[
                styles.filterButtonText,
                filterRole === 'teacher' && styles.filterButtonTextActive
              ]}>
                Teachers ({users.filter(u => u.role === 'teacher').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filterRole === 'parent' && styles.filterButtonActive
              ]}
              onPress={() => setFilterRole('parent')}
            >
              <Text style={[
                styles.filterButtonText,
                filterRole === 'parent' && styles.filterButtonTextActive
              ]}>
                Parents ({users.filter(u => u.role === 'parent').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User List */}
        <ScrollView style={styles.content}>
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.textLight} />
              <Text style={styles.emptyStateText}>No users found</Text>
            </View>
          ) : (
            filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#6366F1',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  userAvatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 8,
  },
  userMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userCardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
});

export default UserManagement;
