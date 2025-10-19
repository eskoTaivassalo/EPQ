import { useSelector, useDispatch } from 'react-redux';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshUser,
  loadStoredAuth,
  clearAllAuthData,
  clearError,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
} from '../store/slices/authSlice';

/**
 * 🪝 Redux Hooks - Korvaa Context hookien käytön
 * 
 * Nämä hookit tarjoavat saman API:n kuin vanhat Context hookit,
 * mutta käyttävät Redux:ia taustalla
 */

// Auth Hook
export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const login = async (credentials) => {
    try {
      const result = await dispatch(loginUser(credentials)).unwrap();
      return { success: true, user: result };
    } catch (error) {
      return { success: false, error };
    }
  };

  const register = async (userData) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap();
      return { success: true, user: result };
    } catch (error) {
      return { success: false, error };
    }
  };

  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  const refresh = async () => {
    try {
      const result = await dispatch(refreshUser()).unwrap();
      return { success: true, user: result };
    } catch (error) {
      return { success: false, error };
    }
  };

  const loadStored = async () => {
    try {
      const result = await dispatch(loadStoredAuth()).unwrap();
      return { success: true, user: result };
    } catch (error) {
      return { success: false, error };
    }
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  const clearAllAuth = async () => {
    try {
      await dispatch(clearAllAuthData()).unwrap();
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  return {
    // State
    user,
    loading,
    isAuthenticated,
    error,
    
    // Actions
    login,
    register,
    logout,
    refreshUser: refresh,
    loadStoredAuth: loadStored,
    clearError: clearAuthError,
    clearAllAuthData: clearAllAuth,
    
    // Full auth object for compatibility
    auth
  };
};