import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';

/**
 * ­ƒöü RecurringBookingModal
 * 
 * Modal shown after creating a booking to ask if user wants to repeat it
 * 
 * @param {boolean} visible - Modal visibility
 * @param {function} onConfirm - Callback with { frequency, numberOfWeeks }
 * @param {function} onSkip - Callback when user skips recurring
 * @param {function} onClose - Callback to close modal
 * @param {string} selectedDate - The date of the first booking (for display)
 */
const RecurringBookingModal = ({ 
  visible, 
  onConfirm, 
  onSkip, 
  onClose,
  selectedDate 
}) => {
  const [frequency, setFrequency] = useState('weekly');
  const [numberOfWeeks, setNumberOfWeeks] = useState(8);

  const handleConfirm = () => {
    if (numberOfWeeks < 2 || numberOfWeeks > 52) {
      Alert.alert('Invalid Input', 'Please select between 2 and 52 weeks');
      return;
    }
    
    onConfirm({ frequency, numberOfWeeks });
  };

  const date = selectedDate ? new Date(selectedDate) : new Date();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const weekOptions = [4, 8, 12, 16];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="repeat" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Make it Recurring?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.infoBox}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.infoText}>
                {dayName}s at {timeStr}
              </Text>
            </View>

            <Text style={styles.description}>
              Would you like to book this same time slot regularly? This will create multiple bookings that your teacher can approve all at once.
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[styles.option, frequency === 'weekly' && styles.optionSelected]}
                  onPress={() => setFrequency('weekly')}
                >
                  <Ionicons 
                    name={frequency === 'weekly' ? 'radio-button-on' : 'radio-button-off'} 
                    size={24} 
                    color={frequency === 'weekly' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[styles.optionText, frequency === 'weekly' && styles.optionTextSelected]}>
                    Weekly
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, frequency === 'biweekly' && styles.optionSelected]}
                  onPress={() => setFrequency('biweekly')}
                >
                  <Ionicons 
                    name={frequency === 'biweekly' ? 'radio-button-on' : 'radio-button-off'} 
                    size={24} 
                    color={frequency === 'biweekly' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[styles.optionText, frequency === 'biweekly' && styles.optionTextSelected]}>
                    Every 2 Weeks
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.weeksGrid}>
                {weekOptions.map((weeks) => (
                  <TouchableOpacity
                    key={weeks}
                    style={[styles.weekOption, numberOfWeeks === weeks && styles.weekOptionSelected]}
                    onPress={() => setNumberOfWeeks(weeks)}
                  >
                    <Text style={[styles.weekOptionText, numberOfWeeks === weeks && styles.weekOptionTextSelected]}>
                      {weeks} weeks
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>
                This will create {numberOfWeeks} bookings for your teacher to review
              </Text>
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={18} color="#FF9800" />
                <Text style={styles.warningText}>
                  Note: Only dates where the teacher has available time slots will be booked. If the teacher hasn't generated availability for some future dates, those will be automatically skipped.
                </Text>
              </View>
            </View>

            <View style={styles.benefitsBox}>
              <Text style={styles.benefitsTitle}>Benefits:</Text>
              <View style={styles.benefit}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.benefitText}>Save time - book multiple sessions at once</Text>
              </View>
              <View style={styles.benefit}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.benefitText}>Priority access - this time slot is reserved for you</Text>
              </View>
              <View style={styles.benefit}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.benefitText}>Easy to manage - cancel individual sessions if needed</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={onSkip}
            >
              <Text style={styles.skipButtonText}>Just This Once</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Ionicons name="repeat" size={20} color={colors.white} />
              <Text style={styles.confirmButtonText}>Create Recurring</Text>
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
    paddingBottom: 40,
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
    backgroundColor: `${colors.primary}15`,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 10,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginHorizontal: 20,
    marginTop: 15,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  weeksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  weekOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  weekOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  weekOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  weekOptionTextSelected: {
    color: colors.white,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  benefitsBox: {
    backgroundColor: '#F1F8F4',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
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

export default RecurringBookingModal;
