import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../config/firebaseConfig';
import AuthService from '../../services/authService';
import SessionManager from '../../utils/sessionManager';

/**
 * 🔐 Auth Slice - Käyttäjän autentikointi ja sessio
 * 
 * Korvaa AuthContext:in Redux-pohjaisella ratkaisulla
 * Sisältää async thunk:it Firebase-operaatioille
 */

// Initial state
const initialState = {
  user: null,
  loading: false,
  isAuthenticated: false,
  error: null,
  lastLogin: null,
  sessionInfo: null, // Session tiedot
  rememberMe: false, // Remember me -tila
};

// Async Thunks for authentication operations

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log('🔐 Redux: Login attempt for:', email);
      
      if (!auth || !db) {
        console.log('🔐 Redux: No Firebase, using fallback login');
        const fallbackResult = await AuthService.fallbackLogin('parent', { email });
        if (fallbackResult.success) {
          return {
            ...fallbackResult.user,
            timestamp: Date.now()
          };
        }
        throw new Error(fallbackResult.error);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Hae käyttäjän lisätiedot Firestore:sta - kokeile ensin teachers, sitten parents
      let userDoc = null;
      let userCollection = null;
      
      // Yritä ensin teachers-kokoelmasta
      const teacherDocRef = doc(db, 'teachers', firebaseUser.uid);
      const teacherDoc = await getDoc(teacherDocRef);
      
      if (teacherDoc.exists()) {
        userDoc = teacherDoc;
        userCollection = 'teachers';
      } else {
        // Jos ei löydy teachers:sta, kokeile parents:sta
        const parentDocRef = doc(db, 'parents', firebaseUser.uid);
        const parentDoc = await getDoc(parentDocRef);
        
        if (parentDoc.exists()) {
          userDoc = parentDoc;
          userCollection = 'parents';
        }
      }
      
      let userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        timestamp: Date.now()
      };

      if (userDoc && userDoc.exists()) {
        userData = { ...userData, ...userDoc.data() };
        console.log(`✅ Redux: User data found in ${userCollection} collection`);
      } else {
        console.warn('⚠️ Redux: User authenticated but no profile data found in teachers or parents collections');
      }

      // Tallenna AsyncStorage:een
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('✅ Redux: Login successful for:', email);
      return userData;
      
    } catch (error) {
      console.error('❌ Redux: Login error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      console.log('📝 Redux: Registration attempt for:', userData.email);
      console.log('📝 Redux: isGoogleAuth:', userData.isGoogleAuth);
      
      if (!auth || !db) {
        console.log('📝 Redux: No Firebase, using fallback registration');
        const fallbackResult = await AuthService.fallbackLogin(userData.role || 'parent', userData);
        if (fallbackResult.success) {
          return {
            ...fallbackResult.user,
            timestamp: Date.now()
          };
        }
        throw new Error(fallbackResult.error);
      }

      let firebaseUser;

      // 🔵 JOS GOOGLE-KÄYTTÄJÄ: Käytä nykyistä auth.currentUser (jo kirjautunut)
      if (userData.isGoogleAuth) {
        console.log('📝 Redux: Google user - using existing Firebase auth');
        firebaseUser = auth.currentUser;
        
        if (!firebaseUser) {
          throw new Error('Google-autentikointi epäonnistui - käyttäjää ei löydy');
        }
        
        console.log('✅ Redux: Using existing Google user:', firebaseUser.email);
      } else {
        // 📧 NORMAALI EMAIL/PASSWORD REKISTERÖINTI
        console.log('📝 Redux: Creating new email/password user');
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        firebaseUser = userCredential.user;
        
        // Päivitä Firebase Auth profile
        await updateProfile(firebaseUser, {
          displayName: userData.name || userData.fullName
        });
      }

      // Tallenna lisätiedot Firestore:een oikeaan kokoelmaan (teachers tai parents)
      const firestoreData = {
        fullName: userData.name || userData.fullName,
        name: userData.name || userData.fullName, // Lisätään name kenttä tietokantaa varten
        email: userData.email,
        userType: userData.role || 'parent',
        createdAt: new Date().toISOString(),
        profile: userData
      };

      // Tallenna vain oikeaan kokoelmaan roolin perusteella
      const collectionName = userData.role === 'teacher' ? 'teachers' : 'parents';
      await setDoc(doc(db, collectionName, firebaseUser.uid), firestoreData);
      
      console.log(`✅ Redux: User saved to ${collectionName} collection`);

      const finalUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: userData.name || userData.fullName,
        userType: userData.role || 'parent',
        profile: userData,
        timestamp: Date.now(),
        ...firestoreData
      };

      // Tallenna AsyncStorage:een
      await AsyncStorage.setItem('user', JSON.stringify(finalUserData));
      
      console.log('✅ Redux: Registration successful for:', userData.email);
      return finalUserData;
      
    } catch (error) {
      console.error('❌ Redux: Registration error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🚪 Redux: Logout attempt');
      
      // 1. Sign out from Firebase
      if (auth) {
        await signOut(auth);
        console.log('✅ Redux: Firebase signOut successful');
      }
      
      // 2. Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      console.log('✅ Redux: AsyncStorage user removed');
      
      // 3. Clear session data
      await SessionManager.clearSession();
      console.log('✅ Redux: Session cleared');
      
      console.log('✅ Redux: Logout successful');
      return null;
      
    } catch (error) {
      console.error('❌ Redux: Logout error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      const currentUser = getState().auth.user;
      
      // Jos ei ole currentUser:ia Redux:ssa, yritä ladata AsyncStorage:sta
      if (!currentUser) {
        console.log('🔄 Redux: No current user in state, trying to load from storage');
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('✅ Redux: Loaded user from storage for refresh');
          return userData;
        }
        throw new Error('No user to refresh');
      }

      // Jos Firebase auth on saatavilla, päivitä sieltä
      if (auth?.currentUser) {
        await auth.currentUser.reload();
        const refreshedUser = auth.currentUser;
        
        const updatedUserData = {
          ...currentUser,
          emailVerified: refreshedUser.emailVerified,
          timestamp: Date.now()
        };
        
        console.log('✅ Redux: User refreshed from Firebase, emailVerified:', refreshedUser.emailVerified);
        return updatedUserData;
      }
      
      // Fallback: Jos Firebase ei ole saatavilla, älä päivitä jatkuvasti
      // Palauta nykyinen käyttäjä vain jos se on todella vanhentunut
      const lastUpdate = currentUser.timestamp || 0;
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdate;
      
      // Päivitä vain jos data on yli 5 minuuttia vanhaa
      if (timeSinceUpdate < 5 * 60 * 1000) {
        return currentUser; // Palauta ilman loggausta jos data on tuoretta
      }
      
      console.log('🔄 Redux: Firebase not available, data older than 5 minutes, updating timestamp');
      return {
        ...currentUser,
        timestamp: now
      };
      
    } catch (error) {
      console.error('❌ Redux: Refresh error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('💾 Redux: Loading stored auth from AsyncStorage');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedUser) {
        console.log('💾 Redux: Found stored user data');
        return JSON.parse(storedUser);
      }
      
      console.log('💾 Redux: No stored user data found');
      return null;
      
    } catch (error) {
      console.error('❌ Redux: Error loading stored auth:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const clearAllAuthData = createAsyncThunk(
  'auth/clearAllAuthData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🧹 Redux: Clearing all authentication data');
      
      // Stop session tracking
      SessionManager.cleanup();
      
      // Clear Firebase auth if available
      if (auth) {
        await signOut(auth);
      }
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      
      // Clear any other auth-related storage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      
      // Reset session manager
      await SessionManager.reset();
      
      console.log('✅ Redux: All auth data cleared successfully');
      return null;
      
    } catch (error) {
      console.error('❌ Redux: Error clearing auth data:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Initialize Session - Käynnistä session seuranta
export const initializeSession = createAsyncThunk(
  'auth/initializeSession',
  async (onSessionExpired, { rejectWithValue }) => {
    try {
      console.log('🕐 Redux: Initializing session tracking');
      
      const isValid = await SessionManager.initialize(onSessionExpired);
      
      if (!isValid) {
        console.log('⏰ Redux: Session expired during initialization');
        return { expired: true };
      }
      
      const sessionInfo = await SessionManager.getSessionInfo();
      console.log('✅ Redux: Session initialized:', sessionInfo);
      
      return sessionInfo;
      
    } catch (error) {
      console.error('❌ Redux: Session initialization error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Update Activity - Päivitä käyttäjän aktiviteetti
export const updateActivity = createAsyncThunk(
  'auth/updateActivity',
  async (_, { rejectWithValue }) => {
    try {
      await SessionManager.updateLastActivity();
      const sessionInfo = await SessionManager.getSessionInfo();
      return sessionInfo;
    } catch (error) {
      console.error('❌ Redux: Activity update error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Set Remember Me - Aseta "Muista minut" -tila
export const setRememberMe = createAsyncThunk(
  'auth/setRememberMe',
  async (enabled, { rejectWithValue }) => {
    try {
      console.log(`🕐 Redux: Setting remember me to: ${enabled}`);
      await SessionManager.setRememberMe(enabled);
      const sessionInfo = await SessionManager.getSessionInfo();
      return { enabled, sessionInfo };
    } catch (error) {
      console.error('❌ Redux: Remember me error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Get Session Info - Hae session tiedot
export const getSessionInfo = createAsyncThunk(
  'auth/getSessionInfo',
  async (_, { rejectWithValue }) => {
    try {
      const sessionInfo = await SessionManager.getSessionInfo();
      return sessionInfo;
    } catch (error) {
      console.error('❌ Redux: Get session info error:', error);
      return rejectWithValue(error.message);
    }
  }
);

// Auth Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous actions
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.sessionInfo = null;
      state.rememberMe = false;
    },
    // 🆕 Update session info
    updateSessionInfo: (state, action) => {
      state.sessionInfo = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastLogin = action.payload.timestamp;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      
    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastLogin = action.payload.timestamp;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })
      
    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Tyhjennä kaikki auth state
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.lastLogin = null;
        state.sessionInfo = null;
        state.rememberMe = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        // Tyhjennä silti state, vaikka logout epäonnistuisi
        state.user = null;
        state.isAuthenticated = false;
        state.sessionInfo = null;
        state.rememberMe = false;
      })
      
    // Refresh User
    builder
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(refreshUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      
    // Load Stored Auth
    builder
      .addCase(loadStoredAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadStoredAuth.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadStoredAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
    // Clear All Auth Data
    builder
      .addCase(clearAllAuthData.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.isAuthenticated = false;
        state.error = null;
        state.lastLogin = null;
        state.sessionInfo = null;
        state.rememberMe = false;
      })
      .addCase(clearAllAuthData.rejected, (state, action) => {
        state.error = action.payload;
      })
    
    // 🆕 Initialize Session
    builder
      .addCase(initializeSession.fulfilled, (state, action) => {
        if (action.payload.expired) {
          // Session vanhentunut - logout
          state.user = null;
          state.isAuthenticated = false;
          state.sessionInfo = null;
        } else {
          state.sessionInfo = action.payload;
          state.rememberMe = action.payload.rememberMe;
        }
      })
      .addCase(initializeSession.rejected, (state, action) => {
        state.error = action.payload;
      })
    
    // 🆕 Update Activity
    builder
      .addCase(updateActivity.fulfilled, (state, action) => {
        state.sessionInfo = action.payload;
      })
    
    // 🆕 Set Remember Me
    builder
      .addCase(setRememberMe.fulfilled, (state, action) => {
        state.rememberMe = action.payload.enabled;
        state.sessionInfo = action.payload.sessionInfo;
      })
      .addCase(setRememberMe.rejected, (state, action) => {
        state.error = action.payload;
      })
    
    // 🆕 Get Session Info
    builder
      .addCase(getSessionInfo.fulfilled, (state, action) => {
        state.sessionInfo = action.payload;
      })
      .addCase(getSessionInfo.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// Export actions
export const { clearError, setUser, clearAuth, updateSessionInfo } = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectSessionInfo = (state) => state.auth.sessionInfo; // 🆕
export const selectRememberMe = (state) => state.auth.rememberMe; // 🆕

export default authSlice.reducer;