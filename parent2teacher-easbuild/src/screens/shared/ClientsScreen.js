import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listStudentsForTeacher } from '../../services/availabilityService';
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

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listStudentsForTeacher(user.uid); // TODO: rename service function
      setStudents(data);
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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardMain}
        onPress={() => alert('Parent/Student profile view coming soon!')}
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
});
