/**
 * BookingsScreen - Universal bookings screen that adapts based on user role
 * 
 * Provider view: Shows booking requests from clients, manage sessions
 * Client view: Shows their own bookings with providers
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { 
  getRoleConfig, 
  getRoleColors, 
  getCanonicalRole,
  isServiceProvider 
} from '../../config/roleConfig';
import { 
  fetchTeacherBookings, 
  fetchParentBookings,
  selectBookings,
  updateBookingStatus,
  cancelBooking
} from '../../store/slices/bookingsSlice';
import WatercolorBackground from '../../components/WatercolorBackground';

const BookingsScreen = ({ navigation }) => {
  const user = useSelector(state => state.auth.user);
  const bookings = useSelector(selectBookings) || [];
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const role = getCanonicalRole(user?.role || user?.userType);
  const roleConfig = getRoleConfig(role);
  const roleColors = getRoleColors(role);
  const isProvider = isServiceProvider(role);

  useEffect(() => {
    loadBookings();
  }, [user?.uid]);

  const loadBookings = async () => {
    if (!user?.uid) return;
    
    setRefreshing(true);
    try {
      if (isProvider) {
        await dispatch(fetchTeacherBookings()).unwrap();
      } else {
        await dispatch(fetchParentBookings()).unwrap();
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isJoinable = (booking) => {
    if (!booking.date || !booking.meetingUrl) return false;
    if (booking.status !== 'approved' && booking.status !== 'accepted') return false;
    
    const now = new Date();
    const bookingDate = new Date(booking.date);
    const diffInMinutes = (bookingDate - now) / (1000 * 60);
    
    // Näytä painike 60 minuuttia ennen ja 30 minuuttia jälkeen
    return diffInMinutes <= 60 && diffInMinutes >= -30;
  };

  const getUpcomingJoinableBookings = (bookings) => {
    return bookings.filter(b => isJoinable(b));
  };

  const filterBookings = (bookings) => {
    switch (selectedFilter) {
      case 'pending':
        return bookings.filter(b => b.status === 'pending' || b.status === 'booked');
      case 'approved':
        return bookings.filter(b => b.status === 'approved' || b.status === 'accepted');
      case 'completed':
        return bookings.filter(b => b.status === 'completed');
      case 'declined':
        return bookings.filter(b => b.status === 'declined' || b.status === 'cancelled');
      default:
        return bookings;
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    try {
      await dispatch(cancelBooking({ 
        bookingId: bookingToCancel.id, 
        reason: cancelReason 
      })).unwrap();
      
      setCancelModalVisible(false);
      setBookingToCancel(null);
      setCancelReason('');
      
      loadBookings();
      Alert.alert('Success', 'Booking cancelled successfully');
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to cancel booking');
    }
  };

  const openCancelModal = (booking) => {
    setBookingToCancel(booking);
    setCancelReason('');
    setCancelModalVisible(true);
  };

  const handleBookingAction = async (bookingId, action) => {
    console.log('[BookingsScreen] 🎬 handleBookingAction called:', { bookingId, action });
    
    try {
      // For other status changes (accept, decline, etc.)
      const updateData = { 
        bookingId, 
        status: action,
        parentId: user?.uid 
      };
      await dispatch(updateBookingStatus(updateData)).unwrap();
      
      loadBookings();
    } catch (error) {
      console.error('[BookingsScreen] ❌ Error updating booking:', error);
      Alert.alert('Error', error?.message || 'Failed to update booking');
    }
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
            <Text style={[
              styles.filterBadgeText,
              { color: isSelected ? '#FFFFFF' : '#FFFFFF' }
            ]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getStatusConfig = (status, cancelledBy = null) => {
    const isPending = status === 'pending' || status === 'booked';
    const isApproved = status === 'approved' || status === 'accepted';
    const isCompleted = status === 'completed';
    const isDeclined = status === 'declined' || status === 'cancelled';

    if (isPending) {
      return {
        color: '#FFA500',
        icon: 'time-outline',
        label: 'Pending',
        gradient: ['#FFB74D', '#FFA726']
      };
    } else if (isApproved) {
      return {
        color: '#27AE60',
        icon: 'checkmark-circle',
        label: 'Approved',
        gradient: ['#4CAF50', '#27AE60']
      };
    } else if (isCompleted) {
      return {
        color: '#3498DB',
        icon: 'checkmark-done-circle',
        label: 'Completed',
        gradient: ['#42A5F5', '#2196F3']
      };
    } else {
      let label = 'Cancelled';
      if (cancelledBy === 'teacher') {
        label = 'Cancelled by Teacher';
      } else if (cancelledBy === 'student') {
        label = 'Cancelled by Student';
      }
      
      return {
        color: '#E74C3C',
        icon: 'close-circle',
        label: label,
        gradient: ['#EF5350', '#E53935']
      };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    console.log('[BookingsScreen] 🕐 formatTime input:', dateString);
    const date = new Date(dateString);
    console.log('[BookingsScreen] 🕐 Parsed Date object:', date.toString());
    console.log('[BookingsScreen] 🕐 Hours:', date.getHours(), 'Minutes:', date.getMinutes());
    const formatted = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    console.log('[BookingsScreen] 🕐 Formatted time:', formatted);
    return formatted;
  };

  const getTimeUntilMeeting = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const meetingDate = new Date(dateString);
    const diffInMinutes = Math.floor((meetingDate - now) / (1000 * 60));
    
    if (diffInMinutes < 0) return 'In Progress';
    if (diffInMinutes < 5) return 'Starting Soon';
    if (diffInMinutes < 60) return `Starts in ${diffInMinutes} min`;
    
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    if (hours < 2) return `Starts in ${hours}h ${minutes}min`;
    
    return '';
  };

  const renderBookingCard = (booking, isJoinableCard = false) => {
    const statusConfig = getStatusConfig(booking.status, booking.cancelledBy);
    const isPending = booking.status === 'pending' || booking.status === 'booked';
    const isApproved = booking.status === 'approved' || booking.status === 'accepted';
    const canJoin = isJoinable(booking);
    const timeUntil = getTimeUntilMeeting(booking.date);

    return (
      <TouchableOpacity
        key={booking.id}
        style={[
          styles.bookingCard, 
          { backgroundColor: '#FFFFFF' },
          isJoinableCard && styles.joinableCard
        ]}
        activeOpacity={0.7}
        onPress={() => {
          // Navigate to booking details if needed
        }}
      >
        {/* Status Indicator Strip */}
        <View style={[styles.statusStrip, { backgroundColor: statusConfig.color }]} />
        
        {/* Joinable Badge */}
        {isJoinableCard && timeUntil && (
          <View style={[styles.urgentBadge, { backgroundColor: roleColors.primary }]}>
            <Ionicons name="time" size={14} color="#FFFFFF" />
            <Text style={styles.urgentBadgeText}>{timeUntil}</Text>
          </View>
        )}
        
        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Header Row */}
          <View style={styles.bookingHeader}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatar, { backgroundColor: roleColors.primary + '20' }]}>
                <Ionicons 
                  name={isProvider ? 'person' : 'school'} 
                  size={24} 
                  color={roleColors.primary} 
                />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingTitle}>
                  {isProvider ? booking.parentName || 'Parent/Student' : booking.teacherName || 'Teacher'}
                </Text>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="calendar-outline" size={14} color="#7F8C8D" />
                  <Text style={styles.dateText}>{formatDate(booking.date)}</Text>
                  {booking.date && (
                    <>
                      <Ionicons name="time-outline" size={14} color="#7F8C8D" style={styles.timeIcon} />
                      <Text style={styles.dateText}>{formatTime(booking.date)}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Subject/Notes */}
          {booking.subject && (
            <View style={styles.subjectRow}>
              <Ionicons name="book-outline" size={16} color={roleColors.primary} />
              <Text style={styles.subjectText}>{booking.subject}</Text>
            </View>
          )}

          {booking.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Viesti:</Text>
              <Text style={styles.bookingNotes} numberOfLines={2}>
                {booking.notes}
              </Text>
            </View>
          )}

          {/* Meeting Link - näkyy vain tunnin sisällä */}
          {booking.meetingUrl && canJoin && (
            <TouchableOpacity
              style={[styles.meetingButton, { backgroundColor: roleColors.primary }]}
              onPress={() => {
                // Open meeting URL
                console.log('Opening meeting:', booking.meetingUrl);
              }}
            >
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
              <Text style={styles.meetingButtonText}>Join Meeting</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {/* Meeting info kun ei vielä voi liittyä */}
          {booking.meetingUrl && isApproved && !canJoin && (
            <View style={styles.meetingInfoBox}>
              <Ionicons name="information-circle" size={20} color="#3498DB" />
              <Text style={styles.meetingInfoText}>
                Meeting link will be available 1 hour before session
              </Text>
            </View>
          )}

          {/* Action Buttons for Providers */}
          {isProvider && isPending && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleBookingAction(booking.id, 'approved')}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => handleBookingAction(booking.id, 'declined')}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Button for Clients */}
          {!isProvider && isPending && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => openCancelModal(booking)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Button for Clients - Approved Bookings */}
          {!isProvider && isApproved && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => openCancelModal(booking)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel Button for Teachers - Approved Bookings */}
          {isProvider && isApproved && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => openCancelModal(booking)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Cancel Session</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredBookings = filterBookings(bookings);

  const getFilterCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending' || b.status === 'booked').length,
      approved: bookings.filter(b => b.status === 'approved' || b.status === 'accepted').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      declined: bookings.filter(b => b.status === 'declined' || b.status === 'cancelled').length,
    };
  };

  const counts = getFilterCounts();
  const joinableBookings = getUpcomingJoinableBookings(bookings);
  const showJoinableSection = joinableBookings.length > 0 && selectedFilter === 'all';

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      
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

      {/* Filter Buttons */}
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          style={styles.filterContainer}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {renderFilterButton('all', 'Kaikki', 'list', counts.all)}
          {renderFilterButton('pending', 'Odottaa', 'time-outline', counts.pending)}
          {renderFilterButton('approved', 'Hyväksytyt', 'checkmark-circle', counts.approved)}
          {renderFilterButton('completed', 'Valmiit', 'checkmark-done-circle', counts.completed)}
          {renderFilterButton('declined', 'Perutut', 'close-circle', counts.declined)}
        </ScrollView>
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
        {/* Joinable Meetings Section */}
        {showJoinableSection && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="videocam" size={24} color={roleColors.primary} />
                <Text style={[styles.sectionTitle, { color: roleColors.primary }]}>
                  Tulevat tapaamiset
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Voit liittyä näihin tapaamisiin nyt
              </Text>
            </View>
            {joinableBookings.map(booking => renderBookingCard(booking, true))}
            
            <View style={styles.sectionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Muut varaukset</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: roleColors.primary + '10' }]}>
              <Ionicons name="calendar-outline" size={64} color={roleColors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {selectedFilter === 'all' ? 'Ei varauksia' : `Ei ${selectedFilter === 'pending' ? 'odottavia' : selectedFilter === 'approved' ? 'hyväksyttyjä' : selectedFilter === 'completed' ? 'valmiita' : 'peruttuja'} varauksia`}
            </Text>
            <Text style={styles.emptyText}>
              {!isProvider && selectedFilter === 'all' 
                ? 'Aloita etsimällä opettaja ja varaa ensimmäinen tuntisi'
                : selectedFilter === 'all'
                ? 'Varaukset näkyvät täällä kun asiakkaat lähettävät pyyntöjä'
                : 'Ei varauksia tällä suodattimella'}
            </Text>
            {!isProvider && selectedFilter === 'all' && (
              <TouchableOpacity
                style={[styles.findButton, { backgroundColor: roleColors.primary }]}
                onPress={() => navigation.navigate('FindProviders')}
              >
                <Ionicons name="search" size={20} color="#FFFFFF" />
                <Text style={styles.findButtonText}>Etsi opettajia</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredBookings
            .filter(booking => !showJoinableSection || !isJoinable(booking))
            .map(booking => renderBookingCard(booking, false))
        )}
      </ScrollView>

      {/* Cancel Reason Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={32} color="#E74C3C" />
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity 
                onPress={() => setCancelModalVisible(false)} 
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Reason for cancellation *</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="E.g., Sick, emergency, scheduling conflict..."
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.modalHint}>{cancelReason.length}/200 characters</Text>
              
              <Text style={styles.modalInfo}>
                {isProvider 
                  ? 'Your student will be notified about the cancellation.'
                  : 'Your teacher will be notified about the cancellation.'}
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalConfirmButton, !cancelReason.trim() && styles.modalConfirmButtonDisabled]}
                onPress={handleCancelBooking}
                disabled={!cancelReason.trim()}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.modalConfirmButtonText}>Confirm Cancellation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 4,
    marginLeft: 12,
  },
  filterWrapper: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterContainer: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    marginLeft: 4,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 34,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#95A5A6',
  },
  bookingCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  joinableCard: {
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  statusStrip: {
    height: 5,
    width: '100%',
  },
  urgentBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  timeIcon: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  notesContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#BDC3C7',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    marginBottom: 4,
  },
  bookingNotes: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 20,
  },
  meetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  meetingButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  meetingInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
  },
  meetingInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  approveButton: {
    backgroundColor: '#27AE60',
  },
  declineButton: {
    backgroundColor: '#E74C3C',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 32,
  },
  findButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  findButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#2C3E50',
    minHeight: 100,
    backgroundColor: '#F8F9FA',
  },
  modalHint: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
    textAlign: 'right',
  },
  modalInfo: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#EBF5FB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BDC3C7',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default BookingsScreen;
