/**
 * FeedbackScreen - View and manage received feedback
 * Allows users to view all feedback, mark as read, and delete
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { getRoleColors, getCanonicalRole } from '../../config/roleConfig';
import { colors, commonStyles } from '../../styles/commonStyles';
import { listFeedbackForUser, deleteFeedback, markFeedbackAsRead } from '../../services/feedbackService';

const FeedbackScreen = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleColors = getRoleColors(role);
  
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, [user?.uid]);

  const loadFeedbacks = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      const data = await listFeedbackForUser(user.uid, role);
      setFeedbacks(data);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      Alert.alert('Error', 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeedbacks();
  };

  const handleDelete = (feedback) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFeedback(user.uid, role, feedback.id);
              // Remove from local state
              setFeedbacks(prev => prev.filter(f => f.id !== feedback.id));
              Alert.alert('Success', 'Feedback deleted');
            } catch (error) {
              console.error('Error deleting feedback:', error);
              Alert.alert('Error', 'Failed to delete feedback');
            }
          },
        },
      ]
    );
  };

  const handleMarkAsRead = async (feedback) => {
    if (feedback.isRead) return; // Already read
    
    try {
      await markFeedbackAsRead(user.uid, role, feedback.id);
      // Update local state
      setFeedbacks(prev =>
        prev.map(f => f.id === feedback.id ? { ...f, isRead: true } : f)
      );
    } catch (error) {
      console.error('Error marking feedback as read:', error);
    }
  };

  const renderFeedbackItem = ({ item }) => (
    <View 
      style={[
        styles.feedbackCard,
        { 
          backgroundColor: roleColors.card, 
          borderLeftColor: item.isRead ? roleColors.textSecondary : roleColors.primary,
          opacity: item.isRead ? 0.7 : 1
        }
      ]}
    >
      <View style={styles.feedbackHeader}>
        <View style={styles.feedbackHeaderLeft}>
          <Ionicons 
            name={item.isRead ? "checkmark-circle" : "chatbox-ellipses"} 
            size={20} 
            color={item.isRead ? roleColors.textSecondary : roleColors.primary} 
          />
          {item.subject && (
            <View style={[styles.subjectBadge, { backgroundColor: roleColors.primary + '20' }]}>
              <Ionicons name="book-outline" size={12} color={roleColors.primary} />
              <Text style={[styles.subjectText, { color: roleColors.primary }]}>
                {item.subject}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={() => handleMarkAsRead(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.feedbackText, { color: roleColors.text }]}>
          {item.feedbackText}
        </Text>

        <View style={styles.feedbackFooter}>
          <Text style={[styles.feedbackDate, { color: roleColors.textSecondary }]}>
            {item.createdAt?.toDate ? 
              new Date(item.createdAt.toDate()).toLocaleDateString('fi-FI', { 
                day: 'numeric', 
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) 
              : 'Recently'}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadBadge, { backgroundColor: roleColors.primary }]}>
              <Text style={styles.unreadText}>New</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const unreadCount = feedbacks.filter(f => !f.isRead).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={roleColors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: roleColors.text }]}>Feedback</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: roleColors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Feedback List */}
      {loading && feedbacks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbox-outline" size={64} color={roleColors.textSecondary} />
          <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>
            Loading feedback...
          </Text>
        </View>
      ) : feedbacks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbox-outline" size={64} color={roleColors.textSecondary} />
          <Text style={[styles.emptyText, { color: roleColors.textSecondary }]}>
            No feedback yet
          </Text>
          <Text style={[styles.emptySubtext, { color: roleColors.textSecondary }]}>
            Feedback from teachers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedbacks}
          renderItem={renderFeedbackItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={roleColors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    ...commonStyles.rowBetween,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...commonStyles.shadow,
  },
  headerTitle: {
    ...commonStyles.row,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...commonStyles.shadow,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feedbackHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackDate: {
    fontSize: 12,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  unreadText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FeedbackScreen;
