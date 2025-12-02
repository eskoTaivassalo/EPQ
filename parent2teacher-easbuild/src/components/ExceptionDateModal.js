import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors } from '../styles/commonStyles';

/**
 * 🚫 ExceptionDateModal
 * 
 * Modal for student to report they cannot attend a specific recurring booking date
 * 
 * @param {boolean} visible - Modal visibility
 * @param {function} onConfirm - Callback with { date, reason }
 * @param {function} onClose - Close modal callback
 * @param {Array} bookedDates - Array of booked dates to choose from
 */
const ExceptionDateModal = ({ visible, onConfirm, onClose, bookedDates = [] }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [reason, setReason] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleConfirm = () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }

    onConfirm({
      date: selectedDate,
      reason: reason.trim(),
    });

    // Reset
    setSelectedDate(null);
    setReason('');
  };

  const handleClose = () => {
    setSelectedDate(null);
    setReason('');
    onClose();
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate || new Date(),
        mode: 'date',
        is24Hour: true,
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            setSelectedDate(date);
          }
        },
      });
    } else {
      setShowDatePicker(true);
    }
  };

  const onIOSDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle" size={32} color="#FF9800" />
            </View>
            <Text style={styles.title}>Cannot Attend</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.description}>
              Let your teacher know if you can't make it to a scheduled session.
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Select Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={openDatePicker}>
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={styles.dateButtonText}>
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Tap to select date'}
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && showDatePicker && (
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  is24Hour={true}
                  onChange={onIOSDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {bookedDates.length > 0 && (
              <View style={styles.quickSelectSection}>
                <Text style={styles.label}>Or quick select from your bookings:</Text>
                <View style={styles.dateChipsContainer}>
                  {bookedDates.slice(0, 6).map((date, idx) => {
                    const dateObj = new Date(date);
                    const isSelected =
                      selectedDate && dateObj.toDateString() === selectedDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                        onPress={() => setSelectedDate(dateObj)}
                      >
                        <Text style={[styles.dateChipText, isSelected && styles.dateChipTextSelected]}>
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="E.g., Doctor's appointment, family event, sick..."
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
              <Text style={styles.hint}>{reason.length}/200 characters</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                Your teacher will be notified and this session will be cancelled.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Ionicons name="checkmark" size={20} color={colors.white} />
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
  body: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  quickSelectSection: {
    marginBottom: 20,
  },
  dateChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  dateChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  dateChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  dateChipTextSelected: {
    color: colors.white,
  },
  textArea: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
    textAlign: 'right',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
  },
});

export default ExceptionDateModal;
