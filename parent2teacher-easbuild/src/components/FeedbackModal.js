import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, commonStyles } from '../styles/commonStyles';
import { addFeedback } from '../services/feedbackService';
import TagSelector from './TagSelector';
import { SUBJECTS } from '../constants/tags';

/**
 * FeedbackModal - Modal for giving feedback between users
 * @param {boolean} visible - Modal visibility
 * @param {function} onClose - Close callback
 * @param {string} parentId - Receiver ID (can be parent or teacher)
 * @param {string} parentName - Receiver name
 * @param {string} teacherId - Sender ID (can be teacher or parent)
 * @param {string} teacherName - Sender name
 * @param {string} roleFrom - Role of sender ('teacher' or 'parent')
 * @param {string} roleTo - Role of receiver ('parent' or 'teacher')
 * @param {string} bookingId - Optional booking ID
 * @param {string} subject - Subject/topic
 * @param {array} subjects - Available subjects for selection
 * @param {string} primaryColor - Primary color for header
 */
export default function FeedbackModal({ 
  visible, 
  onClose, 
  parentId, 
  parentName, 
  teacherId,
  teacherName = '',
  roleFrom = 'teacher',
  roleTo = 'parent',
  bookingId = null,
  subject = 'General',
  subjects = [],
  primaryColor = colors.primary
}) {
  const [feedbackText, setFeedbackText] = useState('');
  // Initialize with first subject from teacher's subjects, or fallback to subject param
  const initialSubject = subjects.length > 0 ? subjects[0] : subject;
  
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter available subject tags
  const availableSubjectTags = subjects.length > 0 
    ? SUBJECTS.filter(subj => subjects.includes(subj.id))
    : SUBJECTS;

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      alert('Please enter feedback text');
      return;
    }

    setSubmitting(true);
    try {
      await addFeedback({
        fromUserId: roleFrom === 'teacher' ? teacherId : parentId,
        toUserId: roleTo === 'teacher' ? teacherId : parentId,
        roleFrom,
        roleTo,
        bookingId,
        feedbackText: feedbackText.trim(),
        rating: null,
        subject: selectedSubject,
        categories: []
      });

      // Reset form
      setFeedbackText('');
      
      alert('Feedback submitted successfully!');
      onClose();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFeedbackText('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: primaryColor }]}>
            <Ionicons name="chatbox" size={28} color={colors.white} />
            <Text style={styles.modalTitle}>Give Feedback</Text>
            <TouchableOpacity 
              onPress={handleClose} 
              disabled={submitting}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.studentInfo}>
              <Ionicons name="person-circle" size={40} color={colors.primary} />
              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>
                  {roleTo === 'teacher' ? (teacherName || 'Teacher') : (parentName || 'Student')}
                </Text>
              </View>
            </View>

            <View style={styles.subjectSection}>
              <TagSelector
                title="Select Subject / Valitse oppiaine *"
                tags={availableSubjectTags}
                selectedTags={[selectedSubject]}
                onTagPress={(selected) => setSelectedSubject(selected)}
                multiSelect={false}
                showIcons={true}
                primaryColor={primaryColor}
              />
              {availableSubjectTags.length === 0 && (
                <Text style={styles.warningText}>
                  No subjects available. Please update your profile.
                </Text>
              )}
            </View>

            <Text style={styles.label}>Feedback to Student *</Text>
            <TextInput
              style={styles.textArea}
              placeholder="E.g: Great work on homework. Focus on multiplication next time..."
              placeholderTextColor={colors.textSecondary}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
              editable={!submitting}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.modalCancelButton} 
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalSubmitButton, { backgroundColor: primaryColor }, submitting && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="send" size={20} color={colors.white} />
                  <Text style={styles.modalSubmitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...commonStyles.modalOverlay,
    padding: 20,
  },
  modalContent: {
    ...commonStyles.modalContainer,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    marginLeft: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  studentDetails: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 8,
  },
  subjectSection: {
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    color: colors.error,
    fontStyle: 'italic',
    marginTop: 8,
  },
  textArea: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 150,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  modalSubmitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
