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
  subjects = []
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
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Give Feedback</Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
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

            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...commonStyles.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...commonStyles.shadowHeavy,
  },
  header: {
    ...commonStyles.rowBetween,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
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
  studentSubject: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  label: {
    ...commonStyles.label,
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
    ...commonStyles.input,
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 150,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
