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
import { 
  fetchTeacherBookings, 
  fetchParentBookings,
  updateBookingStatus,
  cancelBooking
} from '../../store/slices/bookingsSlice';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';

const BookingsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { myBookings = [], loading } = useSelector(state => state.bookings);
  
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

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    console.log('📋 BookingsScreen: bookings updated, count:', bookings.length);
  }, [bookings]);

  // Reload bookings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('📋 BookingsScreen: Screen focused, reloading bookings');
      loadBookings();
    }, [])
  );

  const loadBookings = async () => {
    setRefreshing(true);
    try {
      if (isProvider) {
        await dispatch(fetchTeacherBookings(user.uid)).unwrap();
      } else {
        await dispatch(fetchParentBookings(user.uid)).unwrap();
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setRefreshing(false);
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
      const teacherName = bookingToCancel.teacherName;
      
      await dispatch(cancelBooking({ 
        bookingId: bookingToCancel.id, 
        reason: cancelReason 
      })).unwrap();
      
      setCancelModalVisible(false);
      setBookingToCancel(null);
      setCancelReason('');
      
      loadBookings();
      
      // Navigate to Dashboard
      navigation.navigate('Dashboard');
      
      // Ask if user wants to book a new time
      Alert.alert(
        'Varaus peruttu',
        `Varauksesi on peruttu.\n\nHaluatko varata uuden ajan ${teacherName ? `opettajalta ${teacherName}` : 'samalta opettajalta'}?`,
        [
          {
            text: 'Ei',
            style: 'cancel'
          },
          {
            text: 'Kyllä',
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
    try {
      const updateData = { 
        bookingId, 
        status: action,
        parentId: user?.uid 
      };
      await dispatch(updateBookingStatus(updateData)).unwrap();
      loadBookings();
    } catch (error) {
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
              {isProvider ? booking.parentName : booking.teacherName}
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
              {isPending ? 'Odottaa' :
               isApproved ? 'Vahvistettu' :
               isCompleted ? 'Valmis' :
               isCancelled ? 'Peruttu' :
               isDeclined ? 'Hylätty' : booking.status}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.bookingDetailText}>
              {booking.date ? new Date(booking.date).toLocaleDateString('fi-FI') : 'N/A'}
            </Text>
          </View>
          <View style={styles.bookingDetailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.bookingDetailText}>
              {booking.time || 'N/A'}
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
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleBookingAction(booking.id, 'declined')}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
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
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Peruuta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel button for providers on approved bookings only */}
        {isProvider && isApproved && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => openCancelModal(booking)}
            >
              <Ionicons name="close-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Join meeting button for approved bookings */}
        {isApproved && booking.meetingUrl && (
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={() => {
              // Navigate to meeting or open URL
              Alert.alert('Meeting', 'Join meeting: ' + booking.meetingUrl);
            }}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Join Meeting</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const filteredBookings = filterBookings(bookings);

  const getFilterCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending' || b.status === 'booked').length,
    };
  };

  const counts = getFilterCounts();

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <WatercolorBackground />
        <ActivityIndicator size="large" color={roleColors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
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

      {/* Filters - Outside main ScrollView */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersContent}>
          {renderFilterButton('all', 'Kaikki', 'list', counts.all)}
          {renderFilterButton('pending', 'Odottavat', 'time-outline', counts.pending)}
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
            <Text style={commonStyles.emptyStateTitle}>Ei varauksia</Text>
            <Text style={commonStyles.emptyStateText}>
              {selectedFilter === 'pending' 
                ? 'Ei odottavia varauksia tällä hetkellä' 
                : 'Varauksesi näkyvät täällä'}
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
                  Peruuta varaus
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
              <Text style={commonStyles.label}>Syy peruutukselle (valinnainen)</Text>
              <TextInput
                style={styles.modalTextInput}
                placeholder="Esim. sairaus, aikataulu muuttui..."
                value={cancelReason}
                onChangeText={setCancelReason}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              <Text style={styles.modalHint}>{cancelReason.length}/200 merkkiä</Text>
            </View>

            <View style={commonStyles.modalButtons}>
              <TouchableOpacity 
                style={[commonStyles.modalButton, commonStyles.modalButtonSecondary]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={commonStyles.buttonText}>Takaisin</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[commonStyles.modalButton, styles.modalConfirmButton]}
                onPress={handleCancelBooking}
              >
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.modalConfirmButtonText}>Peruuta varaus</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
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
    fontSize: 14,
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
