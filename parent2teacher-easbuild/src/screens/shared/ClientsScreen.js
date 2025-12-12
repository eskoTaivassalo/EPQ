import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listStudentsForTeacher } from '../../services/availabilityService';
import { db } from '../../config/firebaseConfig';
import FeedbackModal from '../../components/FeedbackModal';

/**
 * ClientsScreen - Lists clients (students/parents) who have bookings with this provider.
 * MVP logic: client list is derived from bookings; later we can add search, caching, and more profile data.
 */
export default function ClientsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]); // TODO: rename to "clients"
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null); // TODO: rename to "selectedClient"
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch students
      const data = await listStudentsForTeacher(user.uid);
      setStudents(data);
      
      // Fetch teacher's subjects from Firestore using correct path
      const serviceType = user?.serviceType || 'education';
      const teacherDoc = await getDoc(doc(db, 'serviceTypes', serviceType, 'teachers', user.uid));
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data();
        setTeacherSubjects(teacherData.subjects || []);
      }
    } catch (e) {
      setError(e.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  const openFeedbackModal = (student) => {
    setSelectedStudent(student);
    setFeedbackModalVisible(true);
  };

  const closeFeedbackModal = () => {
    setFeedbackModalVisible(false);
    setSelectedStudent(null);
  };

  const openProfileModal = (student) => {
    setSelectedStudent(student);
    setProfileModalVisible(true);
  };

  const closeProfileModal = () => {
    setProfileModalVisible(false);
    setSelectedStudent(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardMain}
        onPress={() => openProfileModal(item)}
      >
        <View style={styles.avatar}> 
          <Ionicons name="person" size={30} color={colors.white} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name || item.fullName || 'Unnamed Parent'}</Text>
          {item.childrenAges && (
            <Text style={styles.meta}>Children: {item.childrenAges}</Text>
          )}
          {item.location && (
            <Text style={styles.meta}>{Array.isArray(item.location) ? item.location.join(', ') : item.location}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.feedbackButton}
        onPress={() => openFeedbackModal(item)}
      >
        <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
        <Text style={styles.feedbackButtonText}>Give Feedback</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Students</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && (
        <View style={styles.center}> 
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}> 
          <Ionicons name="warning" size={50} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && students.length === 0 && (
        <View style={styles.center}> 
          <Ionicons name="people-outline" size={56} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No students yet</Text>
          <Text style={styles.emptyText}>Students appear here automatically after their first booking with you.</Text>
        </View>
      )}

      {!loading && !error && students.length > 0 && (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Student Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeProfileModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Profile</Text>
              <TouchableOpacity onPress={closeProfileModal}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {selectedStudent && (
                <>
                  {/* Basic Info */}
                  <View style={styles.profileSection}>
                    <View style={styles.profileAvatar}>
                      <Ionicons name="person" size={50} color={colors.white} />
                    </View>
                    <Text style={styles.profileName}>
                      {selectedStudent.name || selectedStudent.fullName || 'Unnamed'}
                    </Text>
                  </View>

                  {/* Contact Information */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    {selectedStudent.email && (
                      <View style={styles.infoRow}>
                        <Ionicons name="mail" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>{selectedStudent.email}</Text>
                      </View>
                    )}
                    {selectedStudent.phone && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>{selectedStudent.phone}</Text>
                      </View>
                    )}
                    {selectedStudent.location && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>
                          {Array.isArray(selectedStudent.location) 
                            ? selectedStudent.location.join(', ') 
                            : selectedStudent.location}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Study Information */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Study Information</Text>
                    {selectedStudent.childrenAges && (
                      <View style={styles.infoRow}>
                        <Ionicons name="people" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>Children: {selectedStudent.childrenAges}</Text>
                      </View>
                    )}
                    {selectedStudent.needs && selectedStudent.needs.length > 0 && (
                      <View style={styles.infoRow}>
                        <Ionicons name="book" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>
                          Needs: {Array.isArray(selectedStudent.needs) 
                            ? selectedStudent.needs.join(', ') 
                            : selectedStudent.needs}
                        </Text>
                      </View>
                    )}
                    {selectedStudent.preferences && (
                      <View style={styles.infoRow}>
                        <Ionicons name="star" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>Preferences: {selectedStudent.preferences}</Text>
                      </View>
                    )}
                    {selectedStudent.gradeLevel && (
                      <View style={styles.infoRow}>
                        <Ionicons name="school" size={18} color={colors.primary} />
                        <Text style={styles.infoText}>Grade Level: {selectedStudent.gradeLevel}</Text>
                      </View>
                    )}
                  </View>

                  {/* Additional Notes */}
                  {selectedStudent.notes && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <Text style={styles.notesText}>{selectedStudent.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={closeProfileModal}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {selectedStudent && (
        <FeedbackModal
          visible={feedbackModalVisible}
          onClose={closeFeedbackModal}
          parentId={selectedStudent.id}
          parentName={selectedStudent.name || selectedStudent.fullName || 'Student'}
          teacherId={user?.uid}
          teacherName={user?.displayName || user?.name || 'You'}
          roleFrom="teacher"
          roleTo="parent"
          subject="General"
          subjects={teacherSubjects}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.secondary },
  backBtn: { padding: 6 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  errorText: { marginTop: 12, fontSize: 14, color: colors.error, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: colors.white, fontWeight: '600' },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  listContent: { padding: 16 },
  card: { 
    backgroundColor: colors.white, 
    borderRadius: 12, 
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 2, 
    elevation: 2,
    overflow: 'hidden'
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedbackButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
