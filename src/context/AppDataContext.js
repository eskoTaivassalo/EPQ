import React, { createContext, useState, useContext } from 'react';
import { getDocs, collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * 📊 AppDataContext - Sovelluksen data-hallinta
 * 
 * Vastaa:
 * - Opettajien datan hallinnasta (CRUD)
 * - Vanhempien datan hallinnasta (CRUD)
 * - Hakutoiminnoista ja suodatuksesta
 * - Suosikkien hallinnasta
 * - Demo-datan tarjoamisesta
 */

const AppDataContext = createContext();

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const [teachers, setTeachers] = useState([]);
  const [parents, setParents] = useState([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [favoriteTeachers, setFavoriteTeachers] = useState([]);

  // 👨‍🏫 TEACHER DATA MANAGEMENT
  const getTeachers = async () => {
    setTeachersLoading(true);
    try {
      console.log('AppDataContext: Fetching teachers from Firestore');
      
      if (!db) {
        console.log('AppDataContext: No Firestore connection, using demo teachers');
        setTeachers(getDemoTeachers());
        return getDemoTeachers();
      }

      const teachersCollection = collection(db, 'teachers');
      const teacherSnapshot = await getDocs(teachersCollection);
      const teacherList = teacherSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`AppDataContext: Fetched ${teacherList.length} teachers from Firestore`);
      console.log('AppDataContext: Teacher data preview:', teacherList.map(t => ({ 
        id: t.id, 
        name: t.name,
        fullName: t.fullName, 
        displayName: t.displayName,
        email: t.email 
      })));
      setTeachers(teacherList);
      return teacherList;

    } catch (error) {
      console.error('AppDataContext: Error fetching teachers:', error);
      // Fallback to demo data on error
      const demoTeachers = getDemoTeachers();
      setTeachers(demoTeachers);
      return demoTeachers;
    } finally {
      setTeachersLoading(false);
    }
  };

  const createTeacherProfile = async (teacherData) => {
    try {
      console.log('AppDataContext: Creating teacher profile');
      
      if (!db) {
        console.log('AppDataContext: No Firestore, storing locally');
        const newTeacher = { ...teacherData, id: Date.now().toString() };
        setTeachers(prev => [...prev, newTeacher]);
        return newTeacher;
      }

      const teacherDoc = doc(db, 'teachers', teacherData.uid);
      await setDoc(teacherDoc, {
        ...teacherData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });

      console.log('AppDataContext: Teacher profile created successfully');
      
      // Update local state
      const updatedTeacher = { ...teacherData, id: teacherData.uid };
      setTeachers(prev => [...prev, updatedTeacher]);
      
      return updatedTeacher;

    } catch (error) {
      console.error('AppDataContext: Error creating teacher profile:', error);
      throw new Error('Opettajaprofiilin luominen epäonnistui');
    }
  };

  const updateTeacherProfile = async (teacherId, updateData) => {
    try {
      console.log('AppDataContext: Updating teacher profile');
      
      if (!db) {
        console.log('AppDataContext: No Firestore, updating locally');
        setTeachers(prev => prev.map(teacher => 
          teacher.id === teacherId 
            ? { ...teacher, ...updateData }
            : teacher
        ));
        return;
      }

      const teacherDoc = doc(db, 'teachers', teacherId);
      await setDoc(teacherDoc, {
        ...updateData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('AppDataContext: Teacher profile updated successfully');
      
      // Update local state
      setTeachers(prev => prev.map(teacher => 
        teacher.id === teacherId 
          ? { ...teacher, ...updateData }
          : teacher
      ));

    } catch (error) {
      console.error('AppDataContext: Error updating teacher profile:', error);
      throw new Error('Opettajaprofiilin päivitys epäonnistui');
    }
  };

  const getTeacherById = async (teacherId) => {
    try {
      // Check local state first
      const localTeacher = teachers.find(teacher => teacher.id === teacherId);
      if (localTeacher) {
        return localTeacher;
      }

      if (!db) {
        console.log('AppDataContext: No Firestore, checking demo data');
        return getDemoTeachers().find(teacher => teacher.id === teacherId);
      }

      console.log('AppDataContext: Fetching teacher by ID from Firestore');
      const teacherDoc = doc(db, 'teachers', teacherId);
      const teacherSnapshot = await getDoc(teacherDoc);
      
      if (teacherSnapshot.exists()) {
        return { id: teacherSnapshot.id, ...teacherSnapshot.data() };
      }
      
      return null;

    } catch (error) {
      console.error('AppDataContext: Error fetching teacher by ID:', error);
      return null;
    }
  };

  // 👨‍👩‍👧‍👦 PARENT DATA MANAGEMENT
  const getParents = async () => {
    setParentsLoading(true);
    try {
      console.log('AppDataContext: Fetching parents from Firestore');
      
      if (!db) {
        console.log('AppDataContext: No Firestore connection, using demo parents');
        setParents(getDemoParents());
        return getDemoParents();
      }

      const parentsCollection = collection(db, 'parents');
      const parentSnapshot = await getDocs(parentsCollection);
      const parentList = parentSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`AppDataContext: Fetched ${parentList.length} parents from Firestore`);
      setParents(parentList);
      return parentList;

    } catch (error) {
      console.error('AppDataContext: Error fetching parents:', error);
      // Fallback to demo data on error
      const demoParents = getDemoParents();
      setParents(demoParents);
      return demoParents;
    } finally {
      setParentsLoading(false);
    }
  };

  const createParentProfile = async (parentData) => {
    try {
      console.log('AppDataContext: Creating parent profile');
      
      if (!db) {
        console.log('AppDataContext: No Firestore, storing locally');
        const newParent = { ...parentData, id: Date.now().toString() };
        setParents(prev => [...prev, newParent]);
        return newParent;
      }

      const parentDoc = doc(db, 'parents', parentData.uid);
      await setDoc(parentDoc, {
        ...parentData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('AppDataContext: Parent profile created successfully');
      
      // Update local state
      const updatedParent = { ...parentData, id: parentData.uid };
      setParents(prev => [...prev, updatedParent]);
      
      return updatedParent;

    } catch (error) {
      console.error('AppDataContext: Error creating parent profile:', error);
      throw new Error('Vanhemman profiilin luominen epäonnistui');
    }
  };

  // 🔍 SEARCH & FILTERING
  const searchTeachers = (searchQuery, filters = {}) => {
    try {
      let filteredTeachers = [...teachers];

      // Text search
      if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredTeachers = filteredTeachers.filter(teacher =>
          teacher.fullName?.toLowerCase().includes(query) ||
          teacher.subjects?.toLowerCase().includes(query) ||
          teacher.description?.toLowerCase().includes(query) ||
          teacher.location?.toLowerCase().includes(query)
        );
      }

      // Apply filters
      if (filters.subject) {
        filteredTeachers = filteredTeachers.filter(teacher =>
          teacher.subjects?.toLowerCase().includes(filters.subject.toLowerCase())
        );
      }

      if (filters.maxPrice) {
        filteredTeachers = filteredTeachers.filter(teacher => {
          const price = parseFloat(teacher.hourlyRate?.replace(/[^0-9.]/g, '') || '0');
          return price <= filters.maxPrice;
        });
      }

      if (filters.location) {
        filteredTeachers = filteredTeachers.filter(teacher =>
          teacher.location?.toLowerCase().includes(filters.location.toLowerCase())
        );
      }

      if (filters.onlineOnly) {
        filteredTeachers = filteredTeachers.filter(teacher => teacher.onlineTeaching);
      }

      console.log(`AppDataContext: Search returned ${filteredTeachers.length} teachers`);
      return filteredTeachers;

    } catch (error) {
      console.error('AppDataContext: Search error:', error);
      return teachers; // Return all teachers on search error
    }
  };

  // ❤️ FAVORITES MANAGEMENT
  const addToFavorites = (teacherId) => {
    try {
      if (!favoriteTeachers.includes(teacherId)) {
        setFavoriteTeachers(prev => [...prev, teacherId]);
        console.log('AppDataContext: Teacher added to favorites');
      }
    } catch (error) {
      console.error('AppDataContext: Error adding to favorites:', error);
    }
  };

  const removeFromFavorites = (teacherId) => {
    try {
      setFavoriteTeachers(prev => prev.filter(id => id !== teacherId));
      console.log('AppDataContext: Teacher removed from favorites');
    } catch (error) {
      console.error('AppDataContext: Error removing from favorites:', error);
    }
  };

  const getFavoriteTeachers = () => {
    try {
      return teachers.filter(teacher => favoriteTeachers.includes(teacher.id));
    } catch (error) {
      console.error('AppDataContext: Error getting favorite teachers:', error);
      return [];
    }
  };

  // 🎯 DEMO DATA
  const getDemoTeachers = () => {
    return [
      {
        id: 'demo-teacher-1',
        fullName: 'Maria Virtanen',
        subjects: ['mathematics', 'physics'], // Muutettu taulukoksi
        hourlyRate: '35', // Poistettu €-merkki ja /tunti
        experience: '8 vuotta',
        education: 'Matematiikan maisterin tutkinto, Helsingin yliopisto',
        location: ['helsinki'], // Muutettu taulukoksi
        description: 'Kokenut matematiikan ja fysiikan opettaja. Erikoistunut lukiotason matematiikkaan ja yliopiston valintakoevalmentamiseen.',
        languages: ['finnish', 'english', 'german'], // Muutettu taulukoksi
        teachingMethods: ['online', 'in-person'], // Lisätty opetusmetodit
        onlineTeaching: true,
        inPersonTeaching: true,
        rating: 4.8,
        reviewCount: 24
      },
      {
        id: 'demo-teacher-2',
        fullName: 'John Smith',
        subjects: ['english', 'literature'], // Muutettu taulukoksi
        hourlyRate: '40', // Poistettu €-merkki ja /tunti
        experience: '12 vuotta',
        education: 'Englannin kielen ja kirjallisuuden maisterin tutkinto, Oxford University',
        location: ['london'], // Muutettu taulukoksi
        description: 'Native English speaker with extensive experience in teaching English as a foreign language. Specializing in business English and academic writing.',
        languages: ['english', 'finnish', 'spanish'], // Muutettu taulukoksi
        teachingMethods: ['online'], // Lisätty opetusmetodit
        onlineTeaching: true,
        inPersonTeaching: false,
        rating: 4.9,
        reviewCount: 31
      },
      {
        id: 'demo-teacher-3',
        fullName: 'Sophie Dubois',
        subjects: ['french', 'culture'], // Muutettu taulukoksi
        hourlyRate: '30', // Poistettu €-merkki ja /tunti
        experience: '5 vuotta',
        education: 'Ranskan kielen ja kirjallisuuden kandidaatin tutkinto, Sorbonne',
        location: ['paris'], // Muutettu taulukoksi
        description: 'Passionate French teacher offering immersive language learning experience. Focus on conversational skills and French culture.',
        languages: ['french', 'english', 'finnish'], // Muutettu taulukoksi
        teachingMethods: ['online', 'in-person'], // Lisätty opetusmetodit
        onlineTeaching: true,
        inPersonTeaching: true,
        rating: 4.7,
        reviewCount: 18
      }
    ];
  };

  const getDemoParents = () => {
    return [
      {
        id: 'demo-parent-1',
        fullName: 'Anna Korhonen',
        email: 'anna.korhonen@email.com',
        location: 'Tampere, Suomi',
        childrenAges: '15, 17',
        specificNeeds: 'Lukion matematiikan tuki, yo-kokeen valmistautuminen'
      },
      {
        id: 'demo-parent-2',
        fullName: 'Mikael Lindström',
        email: 'mikael.lindstrom@email.com',
        location: 'Stockholm, Sweden',
        childrenAges: '12',
        specificNeeds: 'English language improvement, conversation practice'
      }
    ];
  };

  const value = {
    // 📊 State
    teachers,
    parents,
    teachersLoading,
    parentsLoading,
    favoriteTeachers,
    
    // 👨‍🏫 Teacher Operations
    getTeachers,
    createTeacherProfile,
    updateTeacherProfile,
    getTeacherById,
    
    // 👨‍👩‍👧‍👦 Parent Operations
    getParents,
    createParentProfile,
    
    // 🔍 Search & Discovery
    searchTeachers,
    
    // ❤️ Favorites
    addToFavorites,
    removeFromFavorites,
    getFavoriteTeachers,
    
    // 🎯 Demo Data
    getDemoTeachers,
    getDemoParents
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;