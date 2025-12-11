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
import WatercolorBackground from '../../components/WatercolorBackground';
import { colors, commonStyles } from '../../styles/commonStyles';
import { useAppData } from '../../hooks/useAppData';
import { useAuth } from '../../hooks/useAuth';
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
  SPECIALIZATIONS,
  ACADEMIC_INTERESTS,
  CLIENT_FOCUS,
  GRADE_RANGES,
  getTagLabels,
  getTagById
} from '../../constants/tags';
import { calculatePriceRange } from '../../utils/tagUtils';
import { useSelector } from 'react-redux';
import { selectUserCoords } from '../../store/slices/locationSlice';
import AppLogo from '../../components/AppLogo';

const FindProvidersScreen = ({ navigation }) => {
  const [isReady, setIsReady] = useState(true); // Poistettu splash, aloitetaan suoraan
  const { user } = useAuth();
  const { 
    teachers,          // Redux selector - suoraan array (now "providers")
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
  const userCoords = useSelector(selectUserCoords);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
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
    loadFavorites().catch(() => {});
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teachers, filters, searchQuery, userCoords]);

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
            navigation.navigate('Conversations', {
              recipientId: teacher.id,
              recipientName: teacherName
            });
          }
        },
        {
          text: 'Call',
          onPress: () => {
            if (teacher.phone || teacher.phoneNumber) {
              const phone = teacher.phone || teacher.phoneNumber;
              Linking.openURL(`tel:${phone}`);
            } else {
              Alert.alert('No Phone', 'This teacher has not provided a phone number');
            }
          }
        },
        {
          text: 'View Profile',
          onPress: () => {
            handleViewProfile(teacher);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleQuickMessage = (teacher) => {
    const teacherName = teacher.name || teacher.fullName || teacher.displayName || 'Teacher';
    navigation.navigate('Conversations', {
      recipientId: teacher.id,
      recipientName: teacherName
    });
  };

  const handleViewProfile = (teacher) => {
    setSelectedTeacher(teacher);
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedTeacher(null);
  };

  // Keep old implementation for backward compatibility
  const handleContactTeacherOld = (teacher) => {
    const teacherName = teacher.name || teacher.fullName || teacher.displayName || 'this teacher';
    
    Alert.alert(
      'Contact Teacher',
      `How would you like to contact ${teacherName}?`,
      [
        {
          text: 'Send Message',
          onPress: () => {
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

  const distanceKm = (a, b) => {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    const R = 6371; // km
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
    const lat1 = (a.latitude * Math.PI) / 180;
    const lat2 = (b.latitude * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
    return R * c;
  };

  const applyFilters = () => {
    // Varmistetaan että teachers on array
    if (!Array.isArray(teachers)) {
      console.log('Teachers is not an array:', teachers);
      setFilteredTeachers([]);
      return;
    }

    let filtered = [...teachers];

    // Filter out current user's teacher profile (by email)
    const currentUserEmail = user?.email?.toLowerCase();
    if (currentUserEmail) {
      filtered = filtered.filter(teacher => {
        const teacherEmail = (teacher.email || '').toLowerCase();
        return teacherEmail !== currentUserEmail;
      });
    }

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

    // If user has location, prefer teachers with geoLocation and sort by distance
    if (userCoords && filtered.length > 0) {
      filtered.sort((t1, t2) => {
        const d1 = distanceKm(userCoords, t1.geoLocation);
        const d2 = distanceKm(userCoords, t2.geoLocation);
        // Teachers missing geoLocation go last
        if (!isFinite(d1) && isFinite(d2)) return 1;
        if (isFinite(d1) && !isFinite(d2)) return -1;
        return d1 - d2;
      });
    }

    // Remove duplicates based on id
    const uniqueFiltered = filtered.reduce((acc, current) => {
      const exists = acc.find(item => item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    setFilteredTeachers(uniqueFiltered);
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
              fadeDuration={150}
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

      {/* NEW: Grade Ranges */}
      {item.gradeRanges && item.gradeRanges.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.tagsSectionTitle}>Grade Levels:</Text>
          <View style={styles.tagsContainer}>
            {getTagLabels(GRADE_RANGES, item.gradeRanges).slice(0, 2).map((grade, index) => (
              <View key={index} style={[styles.tag, styles.gradeTag]}>
                <Text style={styles.tagText}>{grade}</Text>
              </View>
            ))}
            {item.gradeRanges.length > 2 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{item.gradeRanges.length - 2}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* NEW: Specializations */}
      {item.specializations && item.specializations.length > 0 && (
        <View style={styles.tagsSection}>
          <Text style={styles.tagsSectionTitle}>Specializations:</Text>
          <View style={styles.tagsContainer}>
            {getTagLabels(SPECIALIZATIONS, item.specializations).slice(0, 2).map((spec, index) => (
              <View key={index} style={[styles.tag, styles.specializationTag]}>
                <Ionicons name="medal" size={12} color={colors.primary} />
                <Text style={styles.tagText}>{spec}</Text>
              </View>
            ))}
            {item.specializations.length > 2 && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>+{item.specializations.length - 2}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* NEW: Years of Experience */}
      {item.experienceYears && (
        <View style={styles.experienceRow}>
          <Ionicons name="time" size={14} color={colors.primary} />
          <Text style={styles.experienceText}>{item.experienceYears} years of experience</Text>
        </View>
      )}

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      {/* NEW: Teaching Approach snippet */}
      {item.teachingApproach && (
        <View style={styles.approachSection}>
          <Text style={styles.approachLabel}>Teaching Philosophy:</Text>
          <Text style={styles.approachText} numberOfLines={2}>
            {item.teachingApproach}
          </Text>
        </View>
      )}

      {(item.phone || item.phoneNumber || item.profile?.phoneNumber) && (
        <Text style={styles.phoneText}>Phone: {item.phone || item.phoneNumber || item.profile?.phoneNumber}</Text>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity 
          style={[styles.contactButton, { flex: 1 }]}
          onPress={() => handleQuickMessage(item)}
        >
          <Ionicons name="chatbubble" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.contactButton, { flex: 1, backgroundColor: '#4CAF50' }]}
          onPress={() => handleViewProfile(item)}
        >
          <Ionicons name="person" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.contactButton, { flex: 1, backgroundColor: '#3F51B5' }]}
          onPress={() => navigation.navigate('ProviderWeeklyAvailability', { 
            teacherId: item.id,
            teacherName: item.name || item.fullName || item.displayName || 'Teacher'
          })}
        >
          <Ionicons name="calendar" size={16} color={colors.white} />
          <Text style={styles.contactButtonText}>Schedule</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderöi AINA tausta ensin, näytä skeleton loading jos ladataan
  return (
    <SafeAreaView style={[commonStyles.safeArea, { backgroundColor: '#FFFFFF' }]}>
      <WatercolorBackground />
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
        <View style={commonStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={commonStyles.loadingText}>Loading teachers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          renderItem={renderTeacherCard}
          keyExtractor={(item) => item.id}
          style={styles.teachersList}
          contentContainerStyle={styles.teachersListContent}
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

      {/* Teacher Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeProfileModal}
      >
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContainer}>
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>Teacher Profile</Text>
              <TouchableOpacity onPress={closeProfileModal}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.profileModalContent}>
              {selectedTeacher && (
                <>
                  {/* Profile Image & Basic Info */}
                  <View style={styles.profileHeaderSection}>
                    <View style={styles.profileImageLarge}>
                      {selectedTeacher.photoURL ? (
                        <Image 
                          source={{ uri: selectedTeacher.photoURL }} 
                          style={styles.profileImageLarge}
                          fadeDuration={150}
                        />
                      ) : (
                        <Ionicons name="person" size={60} color={colors.white} />
                      )}
                    </View>
                    <Text style={styles.profileName}>
                      {selectedTeacher.name || selectedTeacher.fullName || selectedTeacher.displayName || 'Unknown Teacher'}
                    </Text>
                    <View style={styles.profileRatingRow}>
                      <Ionicons name="star" size={20} color="#FFD700" />
                      <Text style={styles.profileRating}>{selectedTeacher.rating || 4.5}</Text>
                      <Text style={styles.profileReviewCount}>({selectedTeacher.reviewCount || 0} reviews)</Text>
                    </View>
                    <Text style={styles.profileHourlyRate}>€{selectedTeacher.hourlyRate || '25'}/hour</Text>
                  </View>

                  {/* Contact Information */}
                  {(selectedTeacher.phone || selectedTeacher.phoneNumber || selectedTeacher.profile?.phoneNumber) && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Contact</Text>
                      <View style={styles.profileContactRow}>
                        <Ionicons name="call" size={18} color={colors.primary} />
                        <Text style={styles.profileContactText}>
                          {selectedTeacher.phone || selectedTeacher.phoneNumber || selectedTeacher.profile?.phoneNumber}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Description */}
                  {selectedTeacher.description && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>About</Text>
                      <Text style={styles.profileDescriptionText}>{selectedTeacher.description}</Text>
                    </View>
                  )}

                  {/* Teaching Approach */}
                  {selectedTeacher.teachingApproach && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Teaching Philosophy</Text>
                      <Text style={styles.profileDescriptionText}>{selectedTeacher.teachingApproach}</Text>
                    </View>
                  )}

                  {/* Experience Years */}
                  {selectedTeacher.experienceYears && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Experience</Text>
                      <View style={styles.profileExperienceRow}>
                        <Ionicons name="time" size={18} color={colors.primary} />
                        <Text style={styles.profileExperienceText}>
                          {selectedTeacher.experienceYears} years of teaching experience
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Subjects */}
                  {selectedTeacher.subjects && selectedTeacher.subjects.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Subjects</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(SUBJECTS, selectedTeacher.subjects).map((subject, index) => (
                          <View key={index} style={styles.profileTag}>
                            <Text style={styles.profileTagText}>{subject}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Grade Ranges */}
                  {selectedTeacher.gradeRanges && selectedTeacher.gradeRanges.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Grade Levels</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(GRADE_RANGES, selectedTeacher.gradeRanges).map((grade, index) => (
                          <View key={index} style={[styles.profileTag, styles.gradeTag]}>
                            <Text style={styles.profileTagText}>{grade}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Teaching Methods */}
                  {selectedTeacher.teachingMethods && selectedTeacher.teachingMethods.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Teaching Methods</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(TEACHING_METHODS, selectedTeacher.teachingMethods).map((method, index) => (
                          <View key={index} style={[styles.profileTag, styles.methodTag]}>
                            <Text style={styles.profileTagText}>{method}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Location */}
                  {selectedTeacher.location && selectedTeacher.location.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Location</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(LOCATIONS, selectedTeacher.location).map((location, index) => (
                          <View key={index} style={[styles.profileTag, styles.locationTag]}>
                            <Ionicons name="location" size={12} color={colors.primary} />
                            <Text style={styles.profileTagText}>{location}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Specializations */}
                  {selectedTeacher.specializations && selectedTeacher.specializations.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Specializations</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(SPECIALIZATIONS, selectedTeacher.specializations).map((spec, index) => (
                          <View key={index} style={[styles.profileTag, styles.specializationTag]}>
                            <Ionicons name="medal" size={12} color={colors.primary} />
                            <Text style={styles.profileTagText}>{spec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Teaching Styles */}
                  {selectedTeacher.teachingStyles && selectedTeacher.teachingStyles.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Teaching Styles</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(TEACHING_STYLES, selectedTeacher.teachingStyles).map((style, index) => (
                          <View key={index} style={styles.profileTag}>
                            <Text style={styles.profileTagText}>{style}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Experience Level */}
                  {selectedTeacher.experience && selectedTeacher.experience.length > 0 && (
                    <View style={styles.profileSection}>
                      <Text style={styles.profileSectionTitle}>Experience Level</Text>
                      <View style={styles.profileTagsContainer}>
                        {getTagLabels(EXPERIENCE_LEVELS, selectedTeacher.experience).map((exp, index) => (
                          <View key={index} style={styles.profileTag}>
                            <Text style={styles.profileTagText}>{exp}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.profileActionButtons}>
                    <TouchableOpacity 
                      style={[styles.profileActionButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        closeProfileModal();
                        handleQuickMessage(selectedTeacher);
                      }}
                    >
                      <Ionicons name="chatbubble" size={20} color={colors.white} />
                      <Text style={styles.profileActionButtonText}>Send Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.profileActionButton, { backgroundColor: '#3F51B5' }]}
                      onPress={() => {
                        closeProfileModal();
                        navigation.navigate('ProviderWeeklyAvailability', { 
                          teacherId: selectedTeacher.id,
                          teacherName: selectedTeacher.name || selectedTeacher.fullName || selectedTeacher.displayName || 'Teacher'
                        });
                      }}
                    >
                      <Ionicons name="calendar" size={20} color={colors.white} />
                      <Text style={styles.profileActionButtonText}>View Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.secondary,
    ...commonStyles.rowBetween,
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
  fullScreenLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
  },
  teachersList: {
    flex: 1,
    padding: 20,
  },
  teachersListContent: {
    paddingBottom: 40,
  },
  teacherCard: {
    ...commonStyles.card,
    marginBottom: 16,
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
  gradeTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  specializationTag: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  experienceText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: 4,
  },
  approachSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  approachLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  approachText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  // Profile Modal Styles
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileModalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileModalContent: {
    paddingHorizontal: 20,
  },
  profileHeaderSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileImageLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  profileRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileRating: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 6,
    marginRight: 4,
  },
  profileReviewCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileHourlyRate: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  profileSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  profileContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContactText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: 10,
  },
  profileDescriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  profileExperienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileExperienceText: {
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 10,
  },
  profileTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  profileTagText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  profileActionButtons: {
    marginTop: 24,
    marginBottom: 12,
    gap: 12,
  },
  profileActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  profileActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default FindProvidersScreen;
