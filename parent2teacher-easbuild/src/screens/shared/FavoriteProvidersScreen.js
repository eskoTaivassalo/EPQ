import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useAppData } from '../../hooks/useAppData';
import { useAuth } from '../../hooks/useAuth';
import { submitUserReport } from '../../services/communicationService';
import { colors, commonStyles } from '../../styles/commonStyles';
import { SUBJECTS, LOCATIONS, TEACHING_METHODS, getTagLabels } from '../../constants/tags';
import { getRoleColors, getCanonicalRole } from '../../config/roleConfig';

const FavoriteProvidersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const role = getCanonicalRole(user?.role || user?.userType);
  const roleColors = getRoleColors(role);
  const { 
    getFavoriteTeachers, // TODO: rename to getFavoriteProviders
    removeFromFavorites, 
    loadFavorites, 
    favoritesLoading,
    isFavorite,
    getTeachers, // TODO: rename to getProviders
  } = useAppData();
  const favorites = getFavoriteTeachers();

  useEffect(() => {
    // Ensure providers are loaded so favorites can map to full objects
    (async () => {
      await getTeachers().catch(() => {});
      await loadFavorites().catch(() => {});
    })();
  }, []);

  const handleReportUser = (teacher) => {
    const teacherName = teacher.name || teacher.fullName || teacher.displayName || 'this user';
    Alert.alert(
      'Report User',
      `Are you sure you want to report ${teacherName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Select Reason',
              'Why are you reporting this user?',
              [
                { text: 'Inappropriate behavior', onPress: () => submitReport(teacher.id, 'inappropriate_behavior') },
                { text: 'Spam', onPress: () => submitReport(teacher.id, 'spam') },
                { text: 'Fake profile', onPress: () => submitReport(teacher.id, 'fake_profile') },
                { text: 'Other', onPress: () => submitReport(teacher.id, 'other') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        }
      ]
    );
  };

  const submitReport = async (reportedUserId, reason) => {
    try {
      await submitUserReport({
        reporterId: user?.uid,
        reportedUserId,
        reason,
        serviceType: user?.serviceType || 'education'
      });
      
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const showTeacherOptions = (teacher) => {
    const teacherName = teacher.name || teacher.fullName || teacher.displayName || 'this teacher';
    Alert.alert(
      teacherName,
      'Choose an action',
      [
        {
          text: 'View Profile',
          onPress: () => {
            Alert.alert('Profile', 'Profile view coming soon!');
          }
        },
        {
          text: 'Send Message',
          onPress: () => {
            Alert.alert('Message', 'Messaging feature coming soon!');
          }
        },
        {
          text: 'Report User',
          style: 'destructive',
          onPress: () => handleReportUser(teacher)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleContactTeacher = (teacher) => {
    const teacherName = teacher.name || teacher.fullName || teacher.displayName || 'this teacher';
    Alert.alert(
      'Contact Teacher',
      `How would you like to contact ${teacherName}?`,
      [
        {
          text: 'Send Message',
          onPress: () => {
            Alert.alert('Message', 'Messaging feature coming soon!');
          }
        },
        {
          text: 'Call',
          onPress: () => {
            if (teacher.phone) Linking.openURL(`tel:${teacher.phone}`);
            else Alert.alert('No phone number', 'This teacher has not provided a phone number.');
          }
        },
        {
          text: 'Email',
          onPress: () => {
            if (teacher.email) Linking.openURL(`mailto:${teacher.email}`);
            else Alert.alert('No email', 'This teacher has not provided an email address.');
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }) => (
    <View style={[commonStyles.card, {marginBottom: 16}]}>
      <View style={[commonStyles.row, {marginBottom: 12}]}>
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <Ionicons name="person" size={40} color={colors.white} />
          )}
        </View>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{item.name || item.fullName || item.displayName || 'Unknown Teacher'}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating || 4.5}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount || 0} reviews)</Text>
          </View>
          <Text style={styles.hourlyRate}>€{item.hourlyRate || '25'}/hour</Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => removeFromFavorites(item.id)}
          accessibilityLabel={'Remove from favorites'}
        >
          <Ionicons name={'heart'} size={24} color={'#FF6B6B'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => showTeacherOptions(item)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tagsSection}>
        <Text style={styles.tagsSectionTitle}>Subjects:</Text>
        <View style={[commonStyles.row, {flexWrap: 'wrap', gap: 6}]}>
          {getTagLabels(SUBJECTS, item.subjects || []).length > 0 ? (
            <>
              {getTagLabels(SUBJECTS, item.subjects || []).slice(0, 3).map((subject, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{subject}</Text>
                </View>
              ))}
              {(item.subjects?.length || 0) > 3 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>+{(item.subjects?.length || 0) - 3} more</Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyInlineText}>Not specified</Text>
          )}
        </View>
      </View>

      <View style={styles.tagsSection}>
        <Text style={styles.tagsSectionTitle}>Location:</Text>
        <View style={[commonStyles.row, {flexWrap: 'wrap', gap: 6}]}>
          {getTagLabels(LOCATIONS, item.location || []).slice(0, 2).map((location, index) => (
            <View key={index} style={[styles.tag, styles.locationTag]}>
              <Ionicons name="location" size={12} color={colors.primary} />
              <Text style={styles.tagText}>{location}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tagsSection}>
        <Text style={styles.tagsSectionTitle}>Teaching Methods:</Text>
        <View style={styles.tagsContainer}>
          {getTagLabels(TEACHING_METHODS, item.teachingMethods || []).length > 0 ? (
            getTagLabels(TEACHING_METHODS, item.teachingMethods || []).map((method, index) => (
              <View key={index} style={[styles.tag, styles.methodTag]}>
                <Text style={styles.tagText}>{method}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyInlineText}>Not specified</Text>
          )}
        </View>
      </View>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {(item.phone || item.phoneNumber || item.profile?.phoneNumber) && (
        <Text style={styles.phoneText}>Phone: {item.phone || item.phoneNumber || item.profile?.phoneNumber}</Text>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() => handleContactTeacher(item)}
        >
          <Ionicons name="chatbubble" size={16} color={colors.white} />
          <Text style={styles.actionButtonText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('ProviderWeeklyAvailability', { 
            teacherId: item.id,
            teacherName: item.name || item.fullName || item.displayName || 'Teacher'
          })}
        >
          <Ionicons name="calendar" size={16} color={colors.white} />
          <Text style={styles.actionButtonText}>Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <WatercolorBackground />
      <View style={[styles.header, { backgroundColor: roleColors.primary }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="heart" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Favorite Teachers</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={commonStyles.emptyState}> 
            <Ionicons name="heart-outline" size={54} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Tap the heart on a teacher to save them here</Text>
          </View>
        }
        refreshing={favoritesLoading}
        onRefresh={() => loadFavorites()}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  teachersList: { flex: 1, padding: 20 },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rating: { fontSize: 14, color: colors.text, marginLeft: 4, marginRight: 4 },
  reviewCount: { fontSize: 12, color: colors.textSecondary },
  hourlyRate: { fontSize: 16, fontWeight: 'bold', color: colors.secondary },
  favoriteButton: { padding: 6, alignSelf: 'flex-start' },
  moreButton: { padding: 6, alignSelf: 'flex-start' },
  tagsSection: { marginBottom: 8 },
  tagsSectionTitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  locationTag: { backgroundColor: '#E3F2FD' },
  methodTag: { backgroundColor: '#F3E5F5' },
  tagText: { fontSize: 11, color: colors.text, marginLeft: 2 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginVertical: 8 },
  emptyInlineText: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  phoneText: { fontSize: 12, color: colors.text, marginBottom: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default FavoriteProvidersScreen;
