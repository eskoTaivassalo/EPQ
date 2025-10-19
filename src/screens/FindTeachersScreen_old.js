import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/commonStyles';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const FindTeachersScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    subject: '',
    maxPrice: '',
    location: '',
    onlineOnly: false
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {

   

    setLoading(true);
    try {
      // Hae kaikki rekisteröityneet opettajat teachers-tietokannasta
      const q = query(
        collection(db, 'teachers'),
        orderBy('name', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const teachersList = [];
      querySnapshot.forEach((doc) => {
        const teacherData = doc.data();
        // Muutetaan data sopivaksi formaattiin FindTeachers näkymälle
        teachersList.push({
          id: doc.id,
          teacherName: teacherData.name || 'Nimetön opettaja',
          subjects: teacherData.subjects || 'Aineet ei määritetty',
          hourlyRate: teacherData.hourlyRate || '0',
          location: teacherData.location || 'Sijainti ei määritetty',
          experience: teacherData.experience || '0',
          languages: teacherData.languages || 'Kielet ei määritetty',
          onlineTeaching: teacherData.onlineTeaching || false,
          inPersonTeaching: teacherData.inPersonTeaching || false,
          description: teacherData.description || 'Ei kuvausta saatavilla',
          rating: teacherData.rating || 4.5,
          reviewCount: teacherData.reviewCount || 0,
          email: teacherData.email || '',
          phone: teacherData.phone || '',
          qualifications: teacherData.qualifications || ''
        });
      });
      
      setTeachers(teachersList);
      console.log(`Ladattu ${teachersList.length} opettajaa tietokannasta`);
    } catch (error) {
      console.error('Virhe opettajien lataamisessa:', error);
    } finally {
      setLoading(false);
    }
  };


  const filteredTeachers = teachers.filter(teacher => {
    if (searchQuery && !teacher.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !teacher.subjects.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.subject && !teacher.subjects.toLowerCase().includes(filters.subject.toLowerCase())) {
      return false;
    }
    if (filters.maxPrice && parseInt(teacher.hourlyRate) > parseInt(filters.maxPrice)) {
      return false;
    }
    if (filters.location && !teacher.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    if (filters.onlineOnly && !teacher.onlineTeaching) {
      return false;
    }
    return true;
  });

  const renderTeacher = ({ item }) => (
    <TouchableOpacity style={styles.teacherCard}>
      <View style={styles.teacherHeader}>
        <View style={styles.teacherAvatar}>
          <Ionicons name="person" size={30} color={colors.white} />
        </View>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{item.teacherName}</Text>
          <Text style={styles.teacherSubjects}>{item.subjects}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>{item.rating || '4.8'}</Text>
            <Text style={styles.reviewCount}>({item.reviewCount || '0'} arvostelua)</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.hourlyRate}€/h</Text>
          <Text style={styles.location}>{item.location}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.teacherFooter}>
        <View style={styles.tags}>
          {item.onlineTeaching && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Verkko-opetus</Text>
            </View>
          )}
          {item.inPersonTeaching && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Lähiopetus</Text>
            </View>
          )}
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.experience}v kokemusta</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.contactButton}>
          <Text style={styles.contactButtonText}>Ota yhteyttä</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or subject..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.quickFilters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity style={styles.quickFilter}>
            <Text style={styles.quickFilterText}>Matematiikka</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickFilter}>
            <Text style={styles.quickFilterText}>Englanti</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickFilter}>
            <Text style={styles.quickFilterText}>Verkko-opetus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickFilter}>
            <Text style={styles.quickFilterText}>Alle 25€/h</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {loading ? 'Ladataan opettajia...' : `${filteredTeachers.length} opettajaa löytyi`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Ladataan opettajia...</Text>
        </View>
      ) : filteredTeachers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={60} color={colors.textLight} />
          <Text style={styles.emptyTitle}>Ei opettajia löytynyt</Text>
          <Text style={styles.emptyText}>
            {teachers.length === 0 
              ? 'Yhtään opettajaa ei ole vielä rekisteröitynyt palveluun.'
              : 'Hakuehdoillasi ei löytynyt yhtään opettajaa. Kokeile muuttaa hakuehtoja.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTeachers}
          renderItem={renderTeacher}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.teachersList}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: '#E91E63',
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
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchBar: {
    backgroundColor: colors.white,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  quickFilters: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  quickFilter: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickFilterText: {
    fontSize: 14,
    color: colors.text,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  teachersList: {
    paddingHorizontal: 20,
  },
  teacherCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  teacherHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  teacherAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E91E63',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  teacherSubjects: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 5,
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 5,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E91E63',
  },
  location: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 15,
  },
  teacherFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.background,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 5,
  },
  tagText: {
    fontSize: 12,
    color: colors.textLight,
  },
  contactButton: {
    backgroundColor: '#E91E63',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FindTeachersScreen;