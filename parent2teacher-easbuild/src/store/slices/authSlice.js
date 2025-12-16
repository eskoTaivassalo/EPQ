import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../config/firebaseConfig';
import AuthService from '../../services/authService';
import { isAdmin } from '../../middleware/adminAuth';
import userDatabaseService from '../../services/userDatabaseService';

/**
 * 🔐 Auth Slice - Käyttäjän autentikointi ja sessio
 * 
 * Korvaa AuthContext:in Redux-pohjaisella ratkaisulla
 * Sisältää async thunk:it Firebase-operaatioille
 */

/**
 * Serialize Firestore data to be Redux-compatible
 * Converts Firestore Timestamps to ISO strings
 */
const serializeFirestoreData = (data) => {
  if (!data) return data;
  
  const serialized = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  Object.keys(serialized).forEach(key => {
    const value = serialized[key];
    
    // Check if it's a Firestore Timestamp
    if (value && typeof value === 'object' && value.toDate) {
      serialized[key] = value.toDate().toISOString();
    }
    // Check if it's a nested object with Timestamp type marker
    else if (value && typeof value === 'object' && value.type === 'firestore/timestamp/1.0') {
      // This is a Firestore Timestamp that's been partially serialized
      if (value.seconds !== undefined) {
        const date = new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1000000);
        serialized[key] = date.toISOString();
      }
    }
  });
  
  return serialized;
};

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
  async ({ email, password }, { rejectWithValue, dispatch }) => {
    try {
      // Clear all previous user data before login (CRITICAL for device reuse!)
      dispatch({ type: 'notifications/clearNotifications' });
      dispatch({ type: 'bookings/clearBookings' });
      dispatch({ type: 'appData/clearData' });
      
      if (!auth || !db) {
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
      
      // Hae käyttäjän tiedot serviceTypes rakenteesta
      const mainProfile = await userDatabaseService.getUserMainProfile(firebaseUser.uid);
      
      let userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        timestamp: Date.now()
      };

      if (mainProfile) {
        const firestoreData = serializeFirestoreData(mainProfile);
        
        // 🚫 CHECK IF ACCOUNT IS DELETED
        if (firestoreData.isDeleted) {
          throw new Error('This account has been deleted. Please contact support if this is an error.');
        }
        
        userData = { ...userData, ...firestoreData };
        
        // 🔄 SYNC EMAIL: Check if Firebase Auth email differs from Firestore email
        if (firebaseUser.email !== firestoreData.email && firestoreData.primaryRole) {
          try {
            const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(firestoreData.primaryRole);
            const roleProfileRef = doc(db, 'serviceTypes', serviceType, collectionName, firebaseUser.uid);
            await updateDoc(roleProfileRef, {
              email: firebaseUser.email,
              updatedAt: new Date().toISOString()
            });
            
            // Update userData to reflect the new email
            userData.email = firebaseUser.email;
          } catch (updateError) {
            // Continue with login even if update fails
          }
        }
      }

      // 🛡️ CHECK ADMIN STATUS
      const adminStatus = await isAdmin(email);
      if (adminStatus) {
        userData.isAdmin = true;
        userData.role = 'admin';
      } else {
        userData.isAdmin = false;
      }

      // Tallenna AsyncStorage:een (already serialized)
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      return serializeFirestoreData(userData);
      
    } catch (error) {
      // Käännä Firebase-virhekoodit käyttäjäystävällisiksi viesteiksi
      let userMessage = error.message;
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        userMessage = 'Virheellinen sähköposti tai salasana';
      } else if (error.code === 'auth/user-not-found') {
        userMessage = 'Käyttäjää ei löydy tällä sähköpostilla';
      } else if (error.code === 'auth/invalid-email') {
        userMessage = 'Virheellinen sähköpostiosoite';
      } else if (error.code === 'auth/too-many-requests') {
        userMessage = 'Liian monta kirjautumisyritystä. Yritä myöhemmin uudelleen';
      } else if (error.code === 'auth/network-request-failed') {
        userMessage = 'Verkkovirhe. Tarkista internet-yhteys';
      } else if (error.code === 'auth/user-disabled') {
        userMessage = 'Tämä käyttäjätili on poistettu käytöstä';
      }
      
      return rejectWithValue(userMessage);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue, dispatch }) => {
    try {
      if (!auth || !db) {
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

      // 🔵 GOOGLE AUTH: Use existing auth.currentUser
      if (userData.isGoogleAuth) {
        firebaseUser = auth.currentUser;
        
        if (!firebaseUser) {
          throw new Error('Google authentication failed - user not found');
        }
      } else {
        // 📧 EMAIL/PASSWORD REGISTRATION
        // Check if user already logged in with same email
        if (auth.currentUser && auth.currentUser.email.toLowerCase() === userData.email.toLowerCase()) {
          firebaseUser = auth.currentUser;
        } else {
          // Create new Firebase Auth user
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            firebaseUser = userCredential.user;
            
            // Update Firebase Auth profile
            await updateProfile(firebaseUser, {
              displayName: userData.name || userData.fullName
            });
          } catch (authError) {
            // If email already in use, ask user to log in first
            if (authError.code === 'auth/email-already-in-use') {
              throw new Error('This email is already registered. Please log in first, then you can add a new role from your profile settings.');
            } else {
              throw authError;
            }
          }
        }
      }

      // 🆕 Use new hierarchical database structure
      // Creates: users/{userId} + users/{userId}/{category}/{roleType}/{userId}
      const userProfile = await userDatabaseService.registerUserWithRole(firebaseUser.uid, {
        ...userData,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        name: userData.name || userData.fullName,
        fullName: userData.name || userData.fullName,
      });

      // 📧 Send email verification (only for email/password, not Google)
      if (!userData.isGoogleAuth && !firebaseUser.emailVerified) {
        try {
          await sendEmailVerification(firebaseUser);
        } catch (emailError) {
          // Continue registration even if email fails
        }
      }

      // 🔒 SECURITY: Remove password from user data before saving to Redux/AsyncStorage
      const { password, confirmPassword, ...safeUserData } = userData;
      
      const finalUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
        displayName: userData.name || userData.fullName,
        userType: userData.role || 'parent',
        role: userData.role || 'parent',
        profile: safeUserData,
        timestamp: Date.now(),
        // Flag for new registrations - only for email/password (not Google)
        justRegistered: !userData.isGoogleAuth && !firebaseUser.emailVerified,
        isGoogleAuth: userData.isGoogleAuth || false,
        ...userProfile
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem('user', JSON.stringify(finalUserData));
      
      return finalUserData;
      
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // 1. Sign out from Google (if signed in via Google)
      try {
        await AuthService.signOutFromGoogle();
      } catch (googleError) {
        // Google sign out not needed or failed
      }
      
      // 2. Sign out from Firebase
      if (auth) {
        await signOut(auth);
      }
      
      // 3. Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      
      // 4. Clear session data
      await SessionManager.clearSession();
      
      // 5. Clear all Redux slices (CRITICAL for device reuse!)
      dispatch({ type: 'notifications/clearNotifications' });
      dispatch({ type: 'bookings/clearBookings' });
      dispatch({ type: 'appData/clearData' });
      
      return null;
      
    } catch (error) {
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
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          return userData;
        }
        throw new Error('No user to refresh');
      }

      // Jos Firebase auth on saatavilla, päivitä sieltä
      if (auth?.currentUser) {
        await auth.currentUser.reload();
        const refreshedUser = auth.currentUser;
        
        const updatedUserData = serializeFirestoreData({
          ...currentUser,
          emailVerified: refreshedUser.emailVerified,
          timestamp: Date.now()
        });
        
        return updatedUserData;
      }
      
      // Fallback: Jos Firebase ei ole saatavilla, älä päivitä jatkuvasti
      // Palauta nykyinen käyttäjä vain jos se on todella vanhentunut
      const lastUpdate = currentUser.timestamp || 0;
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdate;
      
      // Päivitä vain jos data on yli 5 minuuttia vanhaa
      if (timeSinceUpdate < 5 * 60 * 1000) {
        return serializeFirestoreData(currentUser); // Palauta ilman loggausta jos data on tuoretta
      }
      
      return serializeFirestoreData({
        ...currentUser,
        timestamp: now
      });
      
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadStoredAuth = createAsyncThunk(
  'auth/loadStoredAuth',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedUser) {
        const userData = serializeFirestoreData(JSON.parse(storedUser));
        
        // Wait a moment for Firebase to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if Firebase Auth session exists
        if (!auth?.currentUser) {
          // Clear everything and force re-login
          await AsyncStorage.removeItem('user');
          
          if (auth) {
            try {
              await signOut(auth);
            } catch (e) {
              // Signout error (expected)
            }
          }
          
          // Alert will be shown by app when user becomes null
          return null; // This will log the user out
        }
        
        return userData;
      }
      
      return null;
      
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const clearAllAuthData = createAsyncThunk(
  'auth/clearAllAuthData',
  async (_, { rejectWithValue }) => {
    try {
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
      
      return null;
      
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Initialize Session - Käynnistä session seuranta
export const initializeSession = createAsyncThunk(
  'auth/initializeSession',
  async (onSessionExpired, { rejectWithValue }) => {
    try {
      const isValid = await SessionManager.initialize(onSessionExpired);
      
      if (!isValid) {
        return { expired: true };
      }
      
      const sessionInfo = await SessionManager.getSessionInfo();
      
      return sessionInfo;
      
    } catch (error) {
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
      return rejectWithValue(error.message);
    }
  }
);

// 🆕 Set Remember Me - Aseta "Muista minut" -tila
export const setRememberMe = createAsyncThunk(
  'auth/setRememberMe',
  async (enabled, { rejectWithValue }) => {
    try {
      return { success: true, enabled, sessionInfo: null };
    } catch (error) {
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
      state.loading = false; // Clear loading state when setting user
      state.error = null; // Clear any previous errors
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.sessionInfo = null;
      state.rememberMe = false;
      state.loading = false; // Also clear loading when clearing auth
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
        // Ei aseteta loading = true, jotta ei jää jumiin
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