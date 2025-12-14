import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors } from '../../styles/commonStyles';
import { useAuth } from '../../hooks/useAuth';
import { listAvailableSlots, bookSlot } from '../../services/availabilityService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { getRoleCollectionInfo } from '../../services/userDatabaseService';

export default function ProviderAvailableSlotsScreen({ route, navigation }) {
  const { teacherId, teacherName, teacherRole } = route.params || {}; // TODO: rename to providerId, providerName
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [providerProfile, setProviderProfile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Load provider profile to get subjects/specializations
        const role = teacherRole || 'teacher';
        console.log('📥 Loading provider profile for:', { teacherId, role });
        
        const { serviceType, collection: collectionName } = getRoleCollectionInfo(role);
        const profileRef = doc(db, 'serviceTypes', serviceType, collectionName, teacherId);
        const profileSnap = await getDoc(profileRef);
        
        if (profileSnap.exists()) {
          const profileData = profileSnap.data();
          setProviderProfile(profileData);
          console.log('✅ Loaded provider profile:', {
            subjects: profileData.subjects,
            specializations: profileData.specializations,
            role,
            hasSubjects: Array.isArray(profileData.subjects) && profileData.subjects.length > 0,
            hasSpecializations: Array.isArray(profileData.specializations) && profileData.specializations.length > 0
          });
        } else {
          console.log('⚠️ Provider profile not found at:', `serviceTypes/${serviceType}/${collectionName}/${teacherId}`);
        }
        
        const from = new Date();
        // Query a wide range initially to find the teacher's last available date
        const farFuture = new Date();
        farFuture.setFullYear(farFuture.getFullYear() + 1); // 1 year ahead
        
        const allData = await listAvailableSlots(teacherId, from, farFuture);
        
        // Filter out past slots and slots less than 2 hours from now
        const now = new Date();
        const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours in milliseconds
        
        const validSlots = allData.filter(slot => {
          const slotStart = new Date(slot.start);
          // Slot must be in the future AND at least 2 hours from now
          return slotStart > twoHoursFromNow;
        });
        
        console.log(`📅 Filtered ${allData.length} slots to ${validSlots.length} valid slots (>2h from now)`);
        
        // Find the furthest date available
        if (validSlots.length > 0) {
          const furthestDate = new Date(Math.max(...validSlots.map(s => new Date(s.start))));
          console.log(`📅 Teacher's availability extends to: ${furthestDate.toLocaleDateString()}`);
        }
        
        setSlots(validSlots);
      } catch (e) {
        console.error('Load slots error', e);
        Alert.alert('Error', e.message || 'Failed to load slots');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teacherId]);

  const handleBook = async (slot) => {
    if (bookingInProgress) return;
    
    if (!user?.uid) return Alert.alert('Error', 'Not authenticated');
    // Double-check that slot is still valid (at least 2 hours from now)
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const slotStart = new Date(slot.start);
    if (slotStart <= twoHoursFromNow) {
      Alert.alert(
        'Cannot Book',
        'This time slot is too soon. Please book a time at least 2 hours in advance.',
        [{ text: 'OK' }]
      );
      setSlots(prev => prev.filter(s => s.id !== slot.id));
      return;
    }
    
    // Get available services from provider profile
    const availableServices = providerProfile?.subjects || providerProfile?.specializations || [];
    console.log('📋 Available services for booking:', availableServices);
    console.log('👨‍🏫 Provider profile:', providerProfile);
    
    let selectedService = null;
    if (Array.isArray(availableServices) && availableServices.length > 0) {
      // Determine service type label based on role
      const serviceLabel = teacherRole === 'therapist' ? 'therapy type' : 
                          teacherRole === 'coach' ? 'coaching service' : 'subject';
      
      console.log(`🔔 Showing ${serviceLabel} selection dialog with ${availableServices.length} options`);
      
      selectedService = await new Promise(resolve => {
        Alert.alert(
          `Select ${serviceLabel}`,
          `Choose which ${serviceLabel} you want for this session:`,
          [
            ...availableServices.map(service => ({ 
              text: service, 
              onPress: () => {
                console.log(`✅ User selected: ${service}`);
                resolve(service);
              }
            })),
            { 
              text: 'Cancel', 
              style: 'cancel', 
              onPress: () => {
                console.log('❌ User cancelled service selection');
                resolve(null);
              }
            }
          ],
          { cancelable: false }
        );
      });
      
      if (!selectedService) {
        console.log('⚠️ No service selected, cancelling booking');
        return;
      }
      
      console.log('✅ Selected service:', selectedService);
    } else {
      console.log('ℹ️ No services available in profile, booking without service selection');
    }
    
    try {
      const ok = await new Promise(resolve => {
        Alert.alert(
          'Confirm booking',
          `${new Date(slot.start).toLocaleString()} - ${new Date(slot.end).toLocaleTimeString()}` + (selectedService ? `\nService: ${selectedService}` : ''),
          [ { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Book', onPress: () => resolve(true) } ]
        );
      });
      if (!ok) return;
      
      setBookingInProgress(true);
      const clientRole = user.role || user.userType || 'parent';
      const res = await bookSlot(
        slot.id, 
        user.uid, 
        selectedService ? { subject: selectedService, clientRole } : { clientRole }
      );
      Alert.alert('Booked', 'Your session has been booked', [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]);
      setSlots(prev => prev.filter(s => s.id !== slot.id));
    } catch (e) {
      console.error('Book slot error', e);
      Alert.alert('Error', e.message || 'Failed to book');
    } finally {
      setBookingInProgress(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.slot} onPress={() => handleBook(item)}>
      <Ionicons name="calendar" size={20} color={colors.primary} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text style={styles.slotDate}>{new Date(item.start).toLocaleDateString()}</Text>
        <Text style={styles.slotTime}>{new Date(item.start).toLocaleTimeString()} - {new Date(item.end).toLocaleTimeString()}</Text>
        {Array.isArray(item.subjects) && item.subjects.length > 0 && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            Subjects: {item.subjects.join(', ')}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{teacherName || 'Available times'}</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loading}><Text>Loading…</Text></View>
      ) : (
        <FlatList 
          data={slots} 
          keyExtractor={(i) => i.id} 
          renderItem={renderItem} 
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}> 
              <Ionicons name="calendar-outline" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>{teacherName || 'This teacher'} hasn't set availability yet</Text>
              <Text style={styles.emptyText}>
                No available time slots have been published yet. Please contact the teacher directly to request session times.
              </Text>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => {
                  // Navigate to conversation with teacher
                  navigation.navigate('ConversationThread', { 
                    recipientId: teacherId,
                    recipientName: teacherName || 'Teacher'
                  });
                }}
              >
                <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
                <Text style={styles.contactButtonText}>Contact Teacher</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  backButton: { padding: 5 },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slot: { backgroundColor: colors.white, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  slotDate: { fontSize: 14, color: colors.text },
  slotTime: { fontSize: 12, color: colors.textLight },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { marginTop: 16, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyText: { marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});