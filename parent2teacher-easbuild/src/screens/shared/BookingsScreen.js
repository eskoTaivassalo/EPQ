/**
 * BookingsScreen - Universal bookings screen that adapts based on user role
 * 
 * Provider view: Shows booking requests from clients, manage sessions
 * Client view: Shows their own bookings with providers
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { 
  getRoleConfig, 
  getRoleColors, 
  getCanonicalRole,
  isServiceProvider 
} from '../../config/roleConfig';
import { showToast } from '../../store/slices/toastSlice';
import { 
  fetchTeacherBookings, 
  fetchParentBookings,
  updateBookingStatus,
  cancelBooking
} from '../../store/slices/bookingsSlice';
import { fetchParents } from '../../store/slices/appDataSlice';
import { deferAction } from '../../utils/deferredDispatcher';
import WatercolorBackground from '../../components/WatercolorBackground';
import AppLogo from '../../components/AppLogo';
import { colors, commonStyles } from '../../styles/commonStyles';
import performanceTracker from '../../utils/performanceTracker';

const BookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { myBookings = [], loading } = useSelector(state => state.bookings);
  const { teachers = [], parents = [] } = useSelector(state => state.appData);
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const userRole = user?.role;
  const canonicalRole = getCanonicalRole(userRole);
  const isProvider = isServiceProvider(canonicalRole);
  const roleColors = getRoleColors(userRole);
  
  // Use myBookings as the source
  const bookings = myBookings;

  // Ref to track if data is already being loaded (prevent infinite loops)
  const isLoadingRef = useRef(false);
  const loadBookingsRef = useRef(null);
  const parentsCountRef = useRef(parents.length);

  // Keep refs in sync with latest values without retriggering effects
  useEffect(() => {
    parentsCountRef.current = parents.length;
  }, [parents.length]);

  const loadBookings = useCallback(() => {
    performanceTracker.mark('load_bookings_start');
    performanceTracker.logFetch('fetchParentBookings', 'start');
    
    setRefreshing(true);
    const fetchPromise = isProvider 
      ? dispatch(fetchTeacherBookings(user.uid))
      : dispatch(fetchParentBookings(user.uid));
    
    // Promise automatically sets loading state in Redux
    fetchPromise
      .then(() => {
        performanceTracker.mark('load_bookings_end');
        performanceTracker.measure('load_bookings_duration', 'load_bookings_start', 'load_bookings_end');
        performanceTracker.logFetch('fetchParentBookings', 'success');
        setRefreshing(false);
        
        // Defer parent/teacher data loading to background (non-blocking)
        // This allows screen to render immediately without waiting for appData
        if (isProvider && parentsCountRef.current === 0) {
          // Only fetch if not already loaded
          deferAction(dispatch, () => dispatch(fetchParents()), 800).catch(() => {});
        }
      })
      .catch((error) => {
        performanceTracker.mark('load_bookings_error');
        performanceTracker.logFetch('fetchParentBookings', 'error');
        setRefreshing(false);
      })
      .finally(() => {
        // Reset loading flag after fetch completes (success or error)
        isLoadingRef.current = false;
      });
  }, [isProvider, user.uid, dispatch]);

  // Track data load completion
  useEffect(() => {
    if (!loading && bookings.length > 0) {
      performanceTracker.mark('data_load_complete');
      performanceTracker.measure('data_load_complete', 'component_mount', 'data_load_complete');
    }
  }, [bookings, loading]);

  // Store the latest loadBookings in a ref so focus effect can call it without causing re-renders
  useEffect(() => {
    loadBookingsRef.current = loadBookings;
  }, [loadBookings]);

  // Mount: Load bookings immediately without relying on ref timing
  useEffect(() => {
    performanceTracker.mark('component_mount');
    performanceTracker.logRender('BookingsScreen', { isProvider });
    isLoadingRef.current = true;
    loadBookings();  // Call directly to ensure it runs synchronously on mount
  }, [loadBookings]);

  // Focus: Reload only if not already loading
  useFocusEffect(
    React.useCallback(() => {
      performanceTracker.mark('bookings_focus');
      performanceTracker.logNavigation('unknown', 'Bookings');
      
      if (!isLoadingRef.current) {
        isLoadingRef.current = true;
        // Use ref to call the latest loadBookings without dependency on it
        loadBookingsRef.current?.();
      }
      
      return () => {
        isLoadingRef.current = false;
      };
    }, [])
  );

  // Helper function to get teacher/parent name with fallback
  const getPersonName = (booking, isTeacher) => {
    if (isTeacher) {
      // Get teacher name
      if (booking.teacherName) return booking.teacherName;
      const teacher = teachers.find(t => t.id === booking.teacherId);
      return teacher?.name || teacher?.displayName || 'Teacher';
    } else {
      // Get parent name - try booking first, then appData parents, then users collection would be needed
      if (booking.parentName) return booking.parentName;
      const parent = parents.find(p => p.id === booking.parentId);
      // Parents collection might not have name, would need to fetch from users collection
      // For now, show "Student" as more appropriate fallback than "Parent"
      return parent?.name || parent?.displayName || `Student (${booking.parentId?.substring(0, 6)}...)`;
    }
  };

  // Helper function to get time from booking data
  const getBookingTime = (booking) => {
    // If timeSlot exists, use it
    if (booking.timeSlot) return booking.timeSlot;
    if (booking.time) return booking.time;
    
    // Otherwise, extract from start or date field
    const timeSource = booking.start || booking.date;
    if (!timeSource) return 'N/A';
    
    try {
      const dateObj = new Date(timeSource);
      const hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch (e) {
      return 'N/A';
    }
  };

  const filterBookings = (bookings) => {
    switch (selectedFilter) {
      case 'pending':
        return bookings.filter(b => b.status === 'pending' || b.status === 'booked');
      default:
        return bookings;
    }
  };

  const handleCancelBooking = async () => {
    try {
      const teacherId = bookingToCancel.teacherId;
      const teacherName = getPersonName(bookingToCancel, true);
      const parentName = getPersonName(bookingToCancel, false);
      
      await dispatch(cancelBooking({ 
        bookingId: bookingToCancel.id, 
        reason: cancelReason 
      })).unwrap();
      
      setCancelModalVisible(false);
      setBookingToCancel(null);
      setCancelReason('');
      
      loadBookings();
      
      // Different behavior for provider vs client
      if (isProvider) {
        // Teacher cancelled - simple success message
        Alert.alert(
          'Booking Cancelled',
          `Booking with ${parentName} has been cancelled.${cancelReason ? `\n\nReason: ${cancelReason}` : ''}`,
          [{ text: 'OK' }]
        );
      } else {
        // Parent cancelled - offer to rebook
        navigation.navigate('Dashboard');
        
        Alert.alert(
          'Booking Cancelled',
          `Your booking has been cancelled.\n\nWould you like to book a new time ${teacherName ? `with ${teacherName}` : 'with the same teacher'}?`,
          [
            {
              text: 'No',
              style: 'cancel'
            },
            {
              text: 'Yes',
              onPress: () => {
                navigation.navigate('ProviderWeeklyAvailability', { 
                  teacherId: teacherId,
                  teacherName: teacherName,
                  teacherRole: bookingToCancel.teacherRole || 'teacher'
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to cancel booking');
    }
  };

  const openCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleBookingAction = (bookingId, action) => {
    // Find booking for toast details
    const booking = bookings.find(b => b.id === bookingId);
    const parentName = getPersonName(booking, false);
    const dateStr = booking?.date ? new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const timeStr = getBookingTime(booking);
    
    // Show immediate toast with booking details
    const actionText = action === 'accepted' ? 'accepted' : 'declined';
    const emoji = action === 'accepted' ? '✅' : '❌';
    dispatch(showToast({
      message: `Booking ${actionText} ${emoji}\n${parentName}\n${dateStr} at ${timeStr}`,
      type: 'success'
    }));

    // Update in background
    const updateData = { 
      bookingId, 
      status: action,
      parentId: user?.uid 
    };
    dispatch(updateBookingStatus(updateData))
      .then(() => {
        // Refresh list after update completes
        loadBookings();
      })
      .catch((error) => {
        // Failed to update booking
      });
  };

  const renderFilterButton = (filter, label, icon, count) => {
    const isSelected = selectedFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterButton,
          isSelected && styles.filterButtonSelected,
          { 
            backgroundColor: isSelected ? roleColors.primary : 'rgba(255, 255, 255, 0.95)',
            borderColor: isSelected ? roleColors.primary : '#E0E0E0',
          }
        ]}
        onPress={() => setSelectedFilter(filter)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={icon} 
          size={18} 
          color={isSelected ? '#FFFFFF' : roleColors.primary} 
        />
        <Text style={[
          styles.filterText,
          { color: isSelected ? '#FFFFFF' : '#2C3E50' }
        ]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[
            styles.filterBadge,
            { backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : roleColors.primary }
          ]}>
            <Text style={styles.filterBadgeText}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderBookingCard = (booking) => {
    const isPending = booking.status === 'pending' || booking.status === 'booked';
    const isApproved = booking.status === 'approved' || booking.status === 'accepted';
    const isCompleted = booking.status === 'completed';
    const isCancelled = booking.status === 'cancelled' || 
                        booking.status === 'cancelled_by_teacher' || 
                        booking.status === 'cancelled_by_parent';
    const isDeclined = booking.status === 'declined';

    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleRow}>
            <Ionicons 
              name={isProvider ? "person-outline" : "school-outline"} 
              size={20} 
              color={roleColors.primary} 
            />
            <Text style={styles.bookingTitle}>
              {isProvider ? getPersonName(booking, false) : getPersonName(booking, true)}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: 
              isPending ? '#FFA726' : 
              isApproved ? '#66BB6A' : 
              isCompleted ? '#42A5F5' :
              isCancelled ? '#EF5350' :
              isDeclined ? '#AB47BC' : '#9E9E9E'
            }
          ]}>
            <Text style={styles.statusText}>
              {isPending ? 'Pending' :
               isApproved ? 'Confirmed' :
               isCompleted ? 'Completed' :
               isCancelled ? 'Cancelled' :
               isDeclined ? 'Declined' : booking.status}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.bookingDetailText}>
              {booking.date ? new Date(booking.date).toLocaleDateString('en-US') : 'N/A'}
            </Text>
          </View>
          <View style={styles.bookingDetailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.bookingDetailText}>
              {getBookingTime(booking)}
            </Text>
          </View>
        </View>

        {/* Action buttons for providers on pending bookings */}
        {isProvider && isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleBookingAction(booking.id, 'accepted')}
            >
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleBookingAction(booking.id, 'declined')}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel button for clients on pending or approved bookings */}
        {!isProvider && (isPending || isApproved) && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => openCancelModal(booking)}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            {isApproved && booking.meetingUrl && (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton]}
                onPress={() => {
                  // Navigate to meeting or open URL
                  Alert.alert('Meeting', 'Join meeting: ' + booking.meetingUrl);
                }}
              >
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Cancel button for providers on approved bookings only */}
        {isProvider && isApproved && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => openCancelModal(booking)}
            >
              <Ionicons name="close-circle" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            {booking.meetingUrl && (
              <TouchableOpacity
                style={[styles.actionButton, styles.joinButton]}
                onPress={() => {
                  // Navigate to meeting or open URL
                  Alert.alert('Meeting', 'Join meeting: ' + booking.meetingUrl);
                }}
              >
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Join Meeting</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const filteredBookings = useMemo(() => filterBookings(bookings), [bookings, selectedFilter]);

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'booked').length,
  }), [bookings]);

  return (
    <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: '#F5F5F5' }]}>
      <WatercolorBackground />
      
      {/* Show loading overlay if data is still loading */}
      {loading && bookings.length === 0 && (
        <View style={styles.loadingOverlay}>
          <AppLogo size={160} />
          <ActivityIndicator size="large" color={roleColors.primary} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      )}
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isProvider ? 'Bookings' : 'My Bookings'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {filteredBookings.length} {filteredBookings.length === 1 ? 'varaus' : 'varausta'}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={loadBookings}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filters - Outside main ScrollView */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersContent}>
          {renderFilterButton('all', 'All', 'list', counts.all)}
          {renderFilterButton('pending', 'Pending', 'time-outline', counts.pending)}
        </View>
      </View>

      {/* Bookings List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadBookings}
            tintColor={roleColors.primary}
          />
        }
      >
        {filteredBookings.length === 0 ? (
          <View style={commonStyles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={colors.textLight} style={commonStyles.emptyStateIcon} />
            <Text style={commonStyles.emptyStateTitle}>No bookings</Text>
            <Text style={commonStyles.emptyStateText}>
              {selectedFilter === 'pending' 
                ? 'No pending bookings at the moment' 
                : 'Your bookings will appear here'}
            </Text>
          </View>
        ) : (
          filteredBookings.map(booking => renderBookingCard(booking))
        )}
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContainer}>
            <View style={commonStyles.rowBetween}>
              <View style={commonStyles.row}>
                <Ionicons name="close-circle" size={32} color={colors.error} />
                <Text style={[commonStyles.modalTitle, { textAlign: 'left', marginLeft: 12 }]}>
                  Cancel Booking
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setCancelModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[commonStyles.divider, commonStyles.mt16, { marginBottom: 16 }]} />

            <View style={commonStyles.formGroup}>
              <Text style={commonStyles.label}>Cancellation reason (optional)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="E.g. illness, schedule changed..."
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.modalHint}>{cancelReason.length}/200 characters</Text>
            </View>

            <View style={commonStyles.modalButtons}>
              <TouchableOpacity 
                style={[commonStyles.modalButton, commonStyles.modalButtonSecondary]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={commonStyles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[commonStyles.modalButton, styles.modalConfirmButton]}
                onPress={handleCancelBooking}
              >
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.modalConfirmButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    zIndex: 9999,
  },
  loadingSpinner: {
    marginTop: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loader: {
    marginTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 12,
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 6,
  },
  filterButtonSelected: {
    ...commonStyles.shadow,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  bookingCard: {
    ...commonStyles.card,
    marginBottom: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    ...commonStyles.badge,
  },
  statusText: {
    ...commonStyles.badgeText,
  },
  bookingDetails: {
    marginBottom: 12,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bookingDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    backgroundColor: '#AB47BC',
  },
  cancelButton: {
    backgroundColor: colors.error,
  },
  joinButton: {
    backgroundColor: colors.info,
  },
  actionButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  modalTextInput: {
    ...commonStyles.input,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modalConfirmButton: {
    backgroundColor: colors.error,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});

export default BookingsScreen;
