import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { 
  getDocs, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
} from 'firebase/firestore';
import { arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../config/firebaseConfig';

/**
 * 📊 AppData Slice - Sovelluksen liiketoimintalogiikka ja data
 * 
 * Korvaa AppDataContext:in Redux-pohjaisella ratkaisulla
 * Sisältää teachers, parents, search ja favorites toiminnallisuuden
 */

// Initial state
const initialState = {
  // Teachers data
  teachers: [],
  teachersLoading: false,
  teachersError: null,
  teachersLastFetch: null,
  
  // Parents data
  parents: [],
  parentsLoading: false,
  parentsError: null,
  parentsLastFetch: null,
  
  // Search & Filters
  searchResults: [],
  searchLoading: false,
  searchQuery: '',
  searchFilters: {
    subjects: [],
    location: '',
    priceRange: { min: 0, max: 100 },
    rating: 0,
    availability: 'any'
  },
  
  // Favorites
  favoriteTeachers: [],
  favoritesLoading: false,
  
  // App settings
  settings: {
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    maxSearchResults: 50
  }
};

// Demo data generators
const generateDemoTeachers = () => [
  {
    id: 'demo-teacher-1',
    fullName: 'Anna Virtanen',
    email: 'anna.virtanen@email.com',
    subjects: ['Matematiikka', 'Fysiikka'],
    experience: '5 vuotta',
    location: 'Helsinki, Suomi',
    pricePerHour: 25,
    rating: 4.8,
    totalStudents: 45,
    description: 'Kokenut lukion matematiikan ja fysiikan opettaja.',
    availability: 'Arkisin 16-20, viikonloppuisin 10-16',
    verified: true,
    profileImage: null,
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-teacher-2', 
    fullName: 'Erik Johansson',
    email: 'erik.johansson@email.com',
    subjects: ['Englanti', 'Ruotsi'],
    experience: '8 vuotta',
    location: 'Stockholm, Sweden',
    pricePerHour: 30,
    rating: 4.9,
    totalStudents: 67,
    description: 'Native Swedish speaker, fluent in English. Specialized in conversation practice.',
    availability: 'Flexible hours, online sessions available',
    verified: true,
    profileImage: null,
    createdAt: new Date().toISOString()
  }
];

const generateDemoParents = () => [
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

// Async Thunks

export const fetchTeachers = createAsyncThunk(
  'appData/fetchTeachers',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().appData;
      const { cacheTimeout } = state.settings;
      
      // Check cache validity
      if (state.teachersLastFetch && 
          Date.now() - state.teachersLastFetch < cacheTimeout &&
          state.teachers.length > 0) {
        console.log('📊 Redux: Using cached teachers data');
        return state.teachers;
      }
      
      console.log('📊 Redux: Fetching teachers from Firebase...');
      
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      // Tarkista autentikointi
      if (!auth.currentUser) {
        console.log('⚠️ Redux: User not authenticated, returning empty array');
        return [];
      }
      
      console.log('📊 Redux: User authenticated, fetching teachers...');
      
      const teachersCollection = collection(db, 'teachers');
      const teachersSnapshot = await getDocs(teachersCollection);
      const rawTeachers = teachersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Normalize nested profile fields so UI can access them uniformly
      const teachersData = rawTeachers.map(t => {
        const p = t.profile || {};
        return {
          ...t,
          // Merge shallow copies of nested profile
          ...p,
          subjects: t.subjects || p.subjects || [],
          educationLevels: t.educationLevels || p.educationLevels || [],
          location: t.location || p.location || [],
          teachingMethods: t.teachingMethods || p.teachingMethods || [],
          languages: t.languages || p.languages || [],
          teachingStyles: t.teachingStyles || p.teachingStyles || [],
          availability: t.availability || p.availability || [],
          hourlyRate: t.hourlyRate || p.hourlyRate || p.pricePerHour || '',
          experience: t.experience || p.experience || '',
          description: t.description || p.description || '',
          phone: t.phone || t.phoneNumber || p.phone || p.phoneNumber,
        };
      });

      console.log(`📊 Redux: Fetched ${teachersData.length} teachers from Firestore (normalized)`);
      return teachersData;
      
    } catch (error) {
      console.error('❌ Redux: Error fetching teachers:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchParents = createAsyncThunk(
  'appData/fetchParents',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState().appData;
      const { cacheTimeout } = state.settings;
      
      // Check cache validity
      if (state.parentsLastFetch && 
          Date.now() - state.parentsLastFetch < cacheTimeout &&
          state.parents.length > 0) {
        console.log('📊 Redux: Using cached parents data');
        return state.parents;
      }
      
      console.log('📊 Redux: Fetching parents from Firebase...');
      
      if (!db) {
        throw new Error('Firebase database not initialized');
      }
      
      // Tarkista autentikointi
      if (!auth.currentUser) {
        console.log('⚠️ Redux: User not authenticated, returning empty array');
        return [];
      }
      
      console.log('📊 Redux: User authenticated, fetching parents...');
      
      const parentsCollection = collection(db, 'parents');
      const parentsSnapshot = await getDocs(parentsCollection);
      const parentsData = parentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📊 Redux: Fetched ${parentsData.length} parents from Firestore`);
      return parentsData;
      
    } catch (error) {
      console.error('❌ Redux: Error fetching parents:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const searchTeachers = createAsyncThunk(
  'appData/searchTeachers',
  async ({ query, filters }, { getState, dispatch, rejectWithValue }) => {
    try {
      console.log('🔍 Redux: Searching teachers with query:', query);
      
      const state = getState().appData;
      let teachersToSearch = state.teachers;
      
      // If no teachers loaded, fetch them first from Firebase
      if (teachersToSearch.length === 0) {
        console.log('🔍 Redux: No teachers loaded, fetching from Firebase first...');
        const fetchResult = await dispatch(fetchTeachers()).unwrap();
        teachersToSearch = fetchResult;
      }
      
      // Apply search filters
      let results = teachersToSearch.filter(teacher => {
        // Text search
        if (query && query.trim()) {
          const searchText = query.toLowerCase();
          const matchesText = (
            teacher.fullName?.toLowerCase().includes(searchText) ||
            teacher.subjects?.some(subject => subject.toLowerCase().includes(searchText)) ||
            teacher.description?.toLowerCase().includes(searchText) ||
            teacher.location?.toLowerCase().includes(searchText)
          );
          if (!matchesText) return false;
        }
        
        // Subject filter
        if (filters.subjects && filters.subjects.length > 0) {
          const hasSubject = filters.subjects.some(subject => 
            teacher.subjects?.includes(subject)
          );
          if (!hasSubject) return false;
        }
        
        // Location filter
        if (filters.location && filters.location.trim()) {
          if (!teacher.location?.toLowerCase().includes(filters.location.toLowerCase())) {
            return false;
          }
        }
        
        // Price range filter
        if (filters.priceRange && teacher.pricePerHour) {
          if (teacher.pricePerHour < filters.priceRange.min || 
              teacher.pricePerHour > filters.priceRange.max) {
            return false;
          }
        }
        
        // Rating filter
        if (filters.rating && teacher.rating) {
          if (teacher.rating < filters.rating) {
            return false;
          }
        }
        
        return true;
      });
      
      // Limit results
      if (state.settings.maxSearchResults) {
        results = results.slice(0, state.settings.maxSearchResults);
      }
      
      console.log(`🔍 Redux: Found ${results.length} matching teachers`);
      return results;
      
    } catch (error) {
      console.error('❌ Redux: Search error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createTeacherProfile = createAsyncThunk(
  'appData/createTeacherProfile',
  async (teacherData, { rejectWithValue }) => {
    try {
      console.log('📝 Redux: Creating teacher profile');
      
      const newTeacher = {
        ...teacherData,
        id: `teacher_${Date.now()}`,
        createdAt: new Date().toISOString(),
        verified: false,
        rating: 0,
        totalStudents: 0
      };
      
      if (db) {
        await setDoc(doc(db, 'teachers', newTeacher.id), newTeacher);
        console.log('✅ Redux: Teacher profile saved to Firestore');
      }
      
      return newTeacher;
      
    } catch (error) {
      console.error('❌ Redux: Error creating teacher profile:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createParentProfile = createAsyncThunk(
  'appData/createParentProfile',
  async (parentData, { rejectWithValue }) => {
    try {
      console.log('📝 Redux: Creating parent profile');
      
      const newParent = {
        ...parentData,
        id: `parent_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      if (db) {
        await setDoc(doc(db, 'parents', newParent.id), newParent);
        console.log('✅ Redux: Parent profile saved to Firestore');
      }
      
      return newParent;
      
    } catch (error) {
      console.error('❌ Redux: Error creating parent profile:', error);
      return rejectWithValue(error.message);
    }
  }
);

// =============================
// Favorites - Firestore-backed
// =============================

export const loadFavoritesForCurrentUser = createAsyncThunk(
  'appData/loadFavoritesForCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      if (!auth?.currentUser) {
        console.log('❤️ Favorites: No authenticated user, returning empty');
        return [];
      }
      if (!db) throw new Error('Firebase database not initialized');

      const parentRef = doc(db, 'parents', auth.currentUser.uid);
      const snapshot = await getDoc(parentRef);
      if (!snapshot.exists()) {
        console.log('❤️ Favorites: Parent doc not found, returning empty');
        return [];
      }
      const data = snapshot.data() || {};
      const favorites = data.favoriteTeacherIds || [];
      console.log(`❤️ Favorites: Loaded ${favorites.length} favorites from Firestore`);
      return favorites;
    } catch (error) {
      console.error('❌ Favorites: Load error', error);
      return rejectWithValue(error.message);
    }
  }
);

export const addFavoriteTeacher = createAsyncThunk(
  'appData/addFavoriteTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      if (!db) throw new Error('Firebase database not initialized');
      const parentRef = doc(db, 'parents', auth.currentUser.uid);
      await updateDoc(parentRef, {
        favoriteTeacherIds: arrayUnion(teacherId)
      });
      console.log('❤️ Favorites: Added', teacherId);
      return teacherId;
    } catch (error) {
      console.error('❌ Favorites: Add error', error);
      return rejectWithValue(error.message);
    }
  }
);

export const removeFavoriteTeacher = createAsyncThunk(
  'appData/removeFavoriteTeacher',
  async (teacherId, { rejectWithValue }) => {
    try {
      if (!auth?.currentUser) throw new Error('Not authenticated');
      if (!db) throw new Error('Firebase database not initialized');
      const parentRef = doc(db, 'parents', auth.currentUser.uid);
      await updateDoc(parentRef, {
        favoriteTeacherIds: arrayRemove(teacherId)
      });
      console.log('❤️ Favorites: Removed', teacherId);
      return teacherId;
    } catch (error) {
      console.error('❌ Favorites: Remove error', error);
      return rejectWithValue(error.message);
    }
  }
);

// AppData Slice
const appDataSlice = createSlice({
  name: 'appData',
  initialState,
  reducers: {
    // Search actions
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    
    setSearchFilters: (state, action) => {
      state.searchFilters = {
        ...state.searchFilters,
        ...action.payload
      };
    },
    
    clearSearchResults: (state) => {
      state.searchResults = [];
      state.searchQuery = '';
    },
    
    // Favorites actions
    addToFavorites: (state, action) => {
      const teacherId = action.payload;
      if (!state.favoriteTeachers.includes(teacherId)) {
        state.favoriteTeachers.push(teacherId);
      }
    },
    
    removeFromFavorites: (state, action) => {
      const teacherId = action.payload;
      state.favoriteTeachers = state.favoriteTeachers.filter(id => id !== teacherId);
    },
    
    // Settings actions
    updateSettings: (state, action) => {
      state.settings = {
        ...state.settings,
        ...action.payload
      };
    },
    
    // Cache management
    invalidateCache: (state) => {
      state.teachersLastFetch = null;
      state.parentsLastFetch = null;
    },
    
    // Error clearing
    clearTeachersError: (state) => {
      state.teachersError = null;
    },
    
    clearParentsError: (state) => {
      state.parentsError = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Teachers
    builder
      .addCase(fetchTeachers.pending, (state) => {
        state.teachersLoading = true;
        state.teachersError = null;
      })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.teachersLoading = false;
        state.teachers = action.payload;
        state.teachersLastFetch = Date.now();
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.teachersLoading = false;
        state.teachersError = action.payload;
      });
      
    // Fetch Parents
    builder
      .addCase(fetchParents.pending, (state) => {
        state.parentsLoading = true;
        state.parentsError = null;
      })
      .addCase(fetchParents.fulfilled, (state, action) => {
        state.parentsLoading = false;
        state.parents = action.payload;
        state.parentsLastFetch = Date.now();
      })
      .addCase(fetchParents.rejected, (state, action) => {
        state.parentsLoading = false;
        state.parentsError = action.payload;
      });
      
    // Search Teachers
    builder
      .addCase(searchTeachers.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchTeachers.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchTeachers.rejected, (state, action) => {
        state.searchLoading = false;
        // Could set search error here
      });
      
    // Create Teacher Profile
    builder
      .addCase(createTeacherProfile.fulfilled, (state, action) => {
        state.teachers.push(action.payload);
      });
      
    // Create Parent Profile  
    builder
      .addCase(createParentProfile.fulfilled, (state, action) => {
        state.parents.push(action.payload);
      });

    // Favorites
    builder
      .addCase(loadFavoritesForCurrentUser.pending, (state) => {
        state.favoritesLoading = true;
      })
      .addCase(loadFavoritesForCurrentUser.fulfilled, (state, action) => {
        state.favoritesLoading = false;
        state.favoriteTeachers = action.payload || [];
      })
      .addCase(loadFavoritesForCurrentUser.rejected, (state) => {
        state.favoritesLoading = false;
      })
      .addCase(addFavoriteTeacher.pending, (state) => {
        state.favoritesLoading = true;
      })
      .addCase(addFavoriteTeacher.fulfilled, (state, action) => {
        state.favoritesLoading = false;
        const id = action.payload;
        if (!state.favoriteTeachers.includes(id)) {
          state.favoriteTeachers.push(id);
        }
      })
      .addCase(addFavoriteTeacher.rejected, (state) => {
        state.favoritesLoading = false;
      })
      .addCase(removeFavoriteTeacher.pending, (state) => {
        state.favoritesLoading = true;
      })
      .addCase(removeFavoriteTeacher.fulfilled, (state, action) => {
        state.favoritesLoading = false;
        const id = action.payload;
        state.favoriteTeachers = state.favoriteTeachers.filter(tid => tid !== id);
      })
      .addCase(removeFavoriteTeacher.rejected, (state) => {
        state.favoritesLoading = false;
      });
  },
});

// Export actions
export const {
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
  addToFavorites,
  removeFromFavorites,
  updateSettings,
  invalidateCache,
  clearTeachersError,
  clearParentsError,
} = appDataSlice.actions;

// Selectors
export const selectAppData = (state) => state.appData;
export const selectTeachers = (state) => state.appData.teachers;
export const selectTeachersLoading = (state) => state.appData.teachersLoading;
export const selectTeachersError = (state) => state.appData.teachersError;
export const selectParents = (state) => state.appData.parents;
export const selectParentsLoading = (state) => state.appData.parentsLoading;
export const selectSearchResults = (state) => state.appData.searchResults;
export const selectSearchLoading = (state) => state.appData.searchLoading;
export const selectSearchQuery = (state) => state.appData.searchQuery;
export const selectSearchFilters = (state) => state.appData.searchFilters;
export const selectFavoriteTeachers = (state) => state.appData.favoriteTeachers;
export const selectSettings = (state) => state.appData.settings;
export const selectFavoritesLoading = (state) => state.appData.favoritesLoading;

// Complex selectors
export const selectTeacherById = (teacherId) => (state) =>
  state.appData.teachers.find(teacher => teacher.id === teacherId);

// Memoized selectors to avoid returning new references when inputs are unchanged
export const selectFavoriteTeachersData = createSelector(
  [selectTeachers, selectFavoriteTeachers],
  (teachers, favoriteIds) => teachers.filter(teacher => favoriteIds.includes(teacher.id))
);

// For components that need a memoized per-instance selector by id
// Usage pattern in a component:
//   const selectById = useMemo(makeSelectTeacherById, []);
//   const teacher = useSelector((state) => selectById(state, teacherId));
export const makeSelectTeacherById = () =>
  createSelector(
    [selectTeachers, (_state, teacherId) => teacherId],
    (teachers, teacherId) => teachers.find(t => t.id === teacherId)
  );

export default appDataSlice.reducer;