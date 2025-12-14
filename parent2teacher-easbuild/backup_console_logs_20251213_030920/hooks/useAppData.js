import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchTeachers,
  fetchParents,
  searchTeachers,
  createTeacherProfile,
  createParentProfile,
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
  addToFavorites,
  removeFromFavorites,
  updateSettings,
  invalidateCache,
  clearTeachersError,
  clearParentsError,
  selectAppData,
  selectTeachers,
  selectTeachersLoading,
  selectTeachersError,
  selectParents,
  selectParentsLoading,
  selectSearchResults,
  selectSearchLoading,
  selectSearchQuery,
  selectSearchFilters,
  selectFavoriteTeachers,
  selectFavoriteTeachersData,
  selectSettings,
  selectFavoritesLoading,
  loadFavoritesForCurrentUser,
  addFavoriteTeacher,
  removeFavoriteTeacher,
} from '../store/slices/appDataSlice';

/**
 * 📊 AppData Hook - Korvaa AppDataContext:in
 * 
 * Tarjoaa sovelluksen datan ja liiketoimintalogiikan Redux:in kautta
 */

export const useAppData = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const appData = useSelector(selectAppData);
  const teachers = useSelector(selectTeachers);
  const teachersLoading = useSelector(selectTeachersLoading);
  const teachersError = useSelector(selectTeachersError);
  const parents = useSelector(selectParents);
  const parentsLoading = useSelector(selectParentsLoading);
  const searchResults = useSelector(selectSearchResults);
  const searchLoading = useSelector(selectSearchLoading);
  const searchQuery = useSelector(selectSearchQuery);
  const searchFilters = useSelector(selectSearchFilters);
  const favoriteTeachers = useSelector(selectFavoriteTeachers);
  const favoriteTeachersData = useSelector(selectFavoriteTeachersData);
  const settings = useSelector(selectSettings);
  const favoritesLoading = useSelector(selectFavoritesLoading);

  // Teacher operations
  const getTeachers = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        dispatch(invalidateCache());
      }
      const result = await dispatch(fetchTeachers()).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('AppData Hook: Error fetching teachers:', error);
      return { success: false, error };
    }
  };

  // Avoid calling hooks inside callbacks; derive by searching current teachers list
  const getTeacherById = React.useCallback((teacherId) => {
    return teachers.find(t => t.id === teacherId);
  }, [teachers]);

  const getParentById = React.useCallback((parentId) => {
    return parents.find(p => p.id === parentId);
  }, [parents]);

  const createTeacher = async (teacherData) => {
    try {
      const result = await dispatch(createTeacherProfile(teacherData)).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('AppData Hook: Error creating teacher:', error);
      return { success: false, error };
    }
  };

  const updateTeacherProfile = async (teacherId, updateData) => {
    // This would need to be implemented as a separate action
    console.log('AppData Hook: updateTeacherProfile not yet implemented in Redux');
    return { success: false, error: 'Not implemented' };
  };

  // Parent operations
  const getParents = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        dispatch(invalidateCache());
      }
      const result = await dispatch(fetchParents()).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('AppData Hook: Error fetching parents:', error);
      return { success: false, error };
    }
  };

  const createParent = async (parentData) => {
    try {
      const result = await dispatch(createParentProfile(parentData)).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('AppData Hook: Error creating parent:', error);
      return { success: false, error };
    }
  };

  // Search operations
  const search = async (query, filters = {}) => {
    try {
      const result = await dispatch(searchTeachers({ 
        query, 
        filters: { ...searchFilters, ...filters }
      })).unwrap();
      return { success: true, data: result };
    } catch (error) {
      console.error('AppData Hook: Error searching teachers:', error);
      return { success: false, error };
    }
  };

  const setQuery = (query) => {
    dispatch(setSearchQuery(query));
  };

  const setFilters = (filters) => {
    dispatch(setSearchFilters(filters));
  };

  const clearSearch = () => {
    dispatch(clearSearchResults());
  };

  // Favorites operations
  const addFavorite = async (teacherId) => {
    try {
      await dispatch(addFavoriteTeacher(teacherId)).unwrap();
    } catch (e) {
      console.error('Favorites add failed, falling back to local state:', e);
      dispatch(addToFavorites(teacherId));
    }
  };

  const removeFavorite = async (teacherId) => {
    try {
      await dispatch(removeFavoriteTeacher(teacherId)).unwrap();
    } catch (e) {
      console.error('Favorites remove failed, falling back to local state:', e);
      dispatch(removeFromFavorites(teacherId));
    }
  };

  const getFavoriteTeachers = () => {
    return favoriteTeachersData;
  };

  const isFavorite = (teacherId) => {
    return favoriteTeachers.includes(teacherId);
  };

  const loadFavorites = async () => {
    try {
      await dispatch(loadFavoritesForCurrentUser()).unwrap();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Demo data
  const getDemoTeachers = () => {
    // This uses the same logic as in the slice
    return [
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

  // Settings operations
  const updateAppSettings = (newSettings) => {
    dispatch(updateSettings(newSettings));
  };

  // Cache operations
  const invalidateAppCache = () => {
    dispatch(invalidateCache());
  };

  // Error management
  const clearErrors = () => {
    dispatch(clearTeachersError());
    dispatch(clearParentsError());
  };

  return {
    // State
    teachers,
    teachersLoading,
    teachersError,
    parents,
    parentsLoading,
    searchResults,
    searchLoading,
    searchQuery,
    searchFilters,
    favoriteTeachers,
  favoritesLoading,
    settings,
    
    // Teacher Operations
    getTeachers,
    getTeacherById,
    createTeacherProfile: createTeacher,
    updateTeacherProfile,
    
    // Parent Operations
    getParents,
    getParentById,
    createParentProfile: createParent,
    
    // Search & Discovery
    searchTeachers: search,
    setSearchQuery: setQuery,
    setSearchFilters: setFilters,
    clearSearchResults: clearSearch,
    
    // Favorites
    addToFavorites: addFavorite,
    removeFromFavorites: removeFavorite,
    getFavoriteTeachers,
  isFavoriteTeacher: isFavorite,
  isFavorite, // alias for convenience
  loadFavorites,
    
    // Demo Data
    getDemoTeachers,
    getDemoParents,
    
    // Settings & Cache
    updateSettings: updateAppSettings,
    invalidateCache: invalidateAppCache,
    clearErrors,
    
    // Full appData object for compatibility
    appData
  };
};