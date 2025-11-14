import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  Linking,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/commonStyles';
import { useAppData } from '../../hooks/useAppData';
import TagSelector from '../../components/TagSelector';
import {
  SUBJECTS,
  EDUCATION_LEVELS,
  LOCATIONS,
  LANGUAGES,
  TEACHING_METHODS,
  EXPERIENCE_LEVELS,
  PRICE_RANGES,
  TEACHING_STYLES,
  getTagLabels,
  getTagById
} from '../../constants/tags';
import { calculatePriceRange } from '../../utils/tagUtils';

const FindTeachersScreen = ({ navigation }) => {
  const { 
    teachers,          // Redux selector - suoraan array
    teachersLoading,   // Redux loading state
    getTeachers, 
    searchTeachers, 
    addToFavorites, 
    removeFromFavorites, 
    isFavorite,
    loadFavorites,
  } = useAppData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    subjects: [],
    locations: [],
    priceRange: [],
    teachingMethods: [],
    languages: [],
    experience: [],
    teachingStyles: []
  });
  useEffect(() => {
    loadTeachers();
    // Load favorites for current user if available
    loadFavorites().catch(() => {});
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teachers, filters, searchQuery]);

  const loadTeachers = async () => {
    try {
      await getTeachers(); // Redux hoitaa loading staten ja datan
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
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
            // Tässä voidaan myöhemmin navigoida viestintänäkymään
            Alert.alert(
              'Message',
              'Messaging feature coming soon! You will be able to send direct messages to teachers.',
              [{ text: 'OK' }]
            );
          }
        },
        {
          text: 'Call',
          onPress: () => {
            if (teacher.phone) {
              Linking.openURL(`tel:${teacher.phone}`);
            } else {
              Alert.alert('No phone number', 'This teacher has not provided a phone number.');
            }
          }
        },
        {
          text: 'Email',
          onPress: () => {
            if (teacher.email) {
              Linking.openURL(`mailto:${teacher.email}`);
            } else {
              Alert.alert('No email', 'This teacher has not provided an email address.');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ],
      { cancelable: true }
    );
  };

  const applyFilters = () => {
    // Varmistetaan että teachers on array
    if (!Array.isArray(teachers)) {
      console.log('Teachers is not an array:', teachers);
      setFilteredTeachers([]);
      return;
    }

    let filtered = [...teachers];

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(teacher => 
        (teacher.name || teacher.fullName || teacher.displayName || '')?.toLowerCase().includes(query) ||
        teacher.description?.toLowerCase().includes(query) ||
        teacher.education?.toLowerCase().includes(query) ||
        getTagLabels(SUBJECTS, teacher.subjects || []).join(' ').toLowerCase().includes(query)
      );
    }

    // Subject filter
    if (filters.subjects.length > 0) {
      filtered = filtered.filter(teacher =>
        teacher.subjects?.some(subject => filters.subjects.includes(subject))
      );
    }

    // Location filter
    if (filters.locations.length > 0) {
      filtered = filtered.filter(teacher =>
        teacher.location?.some(location => filters.locations.includes(location))
      );
    }

    // Price range filter
    if (filters.priceRange.length > 0) {
      filtered = filtered.filter(teacher =>
        filters.priceRange.includes(teacher.priceRange)
      );
    }

    // Teaching methods filter
    if (filters.teachingMethods.length > 0) {
      filtered = filtered.filter(teacher =>
        teacher.teachingMethods?.some(method => filters.teachingMethods.includes(method))
      );
    }

    // Languages filter
    if (filters.languages.length > 0) {
      filtered = filtered.filter(teacher =>
        teacher.languages?.some(language => filters.languages.includes(language))
      );
    }

    // Experience filter
    if (filters.experience.length > 0) {
      filtered = filtered.filter(teacher =>
        filters.experience.includes(teacher.experience)
      );
    }

    // Teaching styles filter
    if (filters.teachingStyles.length > 0) {
      filtered = filtered.filter(teacher =>
        teacher.teachingStyles?.some(style => filters.teachingStyles.includes(style))
      );
    }

    setFilteredTeachers(filtered);
  };

  const clearFilters = () => {
    setFilters({
      subjects: [],
      locations: [],
      priceRange: [],
      teachingMethods: [],
      languages: [],
      experience: [],
      teachingStyles: []
    });
    setSearchQuery('');
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(filterArray => filterArray.length > 0) || searchQuery.trim();
  };

  const getDemoTeachers = () => [
    {
      id: '1',
      displayName: 'Anna Smith',
      subjects: ['mathematics', 'physics'],
      hourlyRate: '25',
      location: ['helsinki'],
      experience: 'experienced',
      languages: ['finnish', 'english'],
      teachingMethods: ['online', 'in_person'],
      teachingStyles: ['patient', 'structured'],
      description: 'Experienced mathematics teacher with 8 years of experience.',
      rating: 4.9,
      reviewCount: 127,
      priceRange: 'standard'
    },
    {
      id: '2',
      displayName: 'Michael Johnson',
      subjects: ['english', 'german'],
      hourlyRate: '30',
      location: ['turku', 'online'],
      experience: 'expert',
      languages: ['english', 'german', 'finnish'],
      teachingMethods: ['online'],
      teachingStyles: ['creative', 'patient'],
      description: 'Native English speaker specializing in language teaching.',
      rating: 4.8,
      reviewCount: 89,
      priceRange: 'standard'
    }
  ];

  const renderTeacherCard = ({ item }) => (
    <View style={styles.teacherCard}>
      <View style={styles.teacherHeader}>
        <View style={styles.avatarContainer}>
          {item.photoURL ? (
            <Image 
              source={{ uri: item.photoURL }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
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
          onPress={() => (isFavorite(item.id) ? removeFromFavorites(item.id) : addToFavorites(item.id))}
          accessibilityLabel={isFavorite(item.id) ? 'Remove from favorites' : 'Add to favorites'}
       >
          <Ionicons
            name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavorite(item.id) ? '#FF6B6B' : colors.textSecondary}
          />
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
          onPress={() => navigation.navigate('ScheduleLesson', { teacherId: item.id })}
        >
          <Ionicons name="calendar" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Book</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Teachers</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={24} color={colors.white} />
          {hasActiveFilters() && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers, subjects, or descriptions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {hasActiveFilters() && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText}>
            {filteredTeachers.length} teachers found
          </Text>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {teachersLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teachers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          renderItem={renderTeacherCard}
          keyExtractor={(item) => item.id}
          style={styles.teachersList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={60} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No teachers found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search criteria or filters
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TagSelector
              title="Subjects"
              tags={SUBJECTS}
              selectedTags={filters.subjects}
              onTagPress={(tags) => setFilters({...filters, subjects: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Locations"
              tags={LOCATIONS}
              selectedTags={filters.locations}
              onTagPress={(tags) => setFilters({...filters, locations: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Price Range"
              tags={PRICE_RANGES}
              selectedTags={filters.priceRange}
              onTagPress={(tags) => setFilters({...filters, priceRange: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Teaching Methods"
              tags={TEACHING_METHODS}
              selectedTags={filters.teachingMethods}
              onTagPress={(tags) => setFilters({...filters, teachingMethods: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Languages"
              tags={LANGUAGES}
              selectedTags={filters.languages}
              onTagPress={(tags) => setFilters({...filters, languages: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Experience Level"
              tags={EXPERIENCE_LEVELS}
              selectedTags={filters.experience}
              onTagPress={(tags) => setFilters({...filters, experience: tags})}
              showIcons={true}
            />

            <TagSelector
              title="Teaching Styles"
              tags={TEACHING_STYLES}
              selectedTags={filters.teachingStyles}
              onTagPress={(tags) => setFilters({...filters, teachingStyles: tags})}
              showIcons={true}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>
                Show {filteredTeachers.length} teachers
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 5,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  activeFiltersText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.background,
  },
  clearFiltersText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
  },
  teachersList: {
    flex: 1,
    padding: 20,
  },
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
  favoriteButton: {
    padding: 6,
    alignSelf: 'flex-start',
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
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 4,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  hourlyRate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  tagsSection: {
    marginBottom: 8,
  },
  tagsSectionTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationTag: {
    backgroundColor: '#E3F2FD',
  },
  methodTag: {
    backgroundColor: '#F3E5F5',
  },
  tagText: {
    fontSize: 11,
    color: colors.text,
    marginLeft: 2,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginVertical: 8,
  },
  contactButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalClearText: {
    fontSize: 16,
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyFiltersButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyInlineText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  phoneText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: 8,
  },
});

export default FindTeachersScreen;