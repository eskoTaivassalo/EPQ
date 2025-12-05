import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import WatercolorBackground from '../../components/WatercolorBackground';
import { useAppData } from '../../hooks/useAppData';
import { colors } from '../../styles/commonStyles';
import { SUBJECTS, LOCATIONS, TEACHING_METHODS, getTagLabels } from '../../constants/tags';

const FavoritesScreen = ({ navigation }) => {
  const { 
    getFavoriteTeachers, 
    removeFromFavorites, 
    loadFavorites, 
    favoritesLoading,
    isFavorite,
    getTeachers,
  } = useAppData();
  const favorites = getFavoriteTeachers();

  useEffect(() => {
    // Ensure teachers are loaded so favorites can map to full objects
    (async () => {
      await getTeachers().catch(() => {});
      await loadFavorites().catch(() => {});
    })();
  }, []);

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
    <View style={styles.teacherCard}>
      <View style={styles.teacherHeader}>
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
      </View>

      <View style={styles.tagsSection}>
        <Text style={styles.tagsSectionTitle}>Subjects:</Text>
        <View style={styles.tagsContainer}>
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
        <View style={styles.tagsContainer}>
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

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity 
          style={[styles.contactButton, { flex: 1 }]}
          onPress={() => handleContactTeacher(item)}
        >
          <Ionicons name="chatbubble" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.contactButton, { flex: 1, backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('TeacherWeeklyAvailability', { 
            teacherId: item.id,
            teacherName: item.name || item.fullName || item.displayName || 'Teacher'
          })}
        >
          <Ionicons name="calendar" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Calendar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WatercolorBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}> 
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
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold' },
  teachersList: { flex: 1, padding: 20 },
  teacherCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teacherHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
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
  tagsSection: { marginBottom: 8 },
  tagsSectionTitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  locationTag: { backgroundColor: '#E3F2FD' },
  methodTag: { backgroundColor: '#F3E5F5' },
  tagText: { fontSize: 11, color: colors.text, marginLeft: 2 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginVertical: 8 },
  emptyInlineText: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' },
  phoneText: { fontSize: 12, color: colors.text, marginBottom: 8 },
  contactButton: { backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 8 },
  contactButtonText: { color: colors.white, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '600', color: colors.text },
  emptyText: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
});

export default FavoritesScreen;
