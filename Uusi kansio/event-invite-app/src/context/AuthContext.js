import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

// Create context
const AuthContext = createContext();

// Create hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Clear any errors
  const clearError = () => setError('');

  // Sign up function
  const register = async (email, password, displayName) => {
    try {
      clearError();
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        events: [],
        invites: []
      });
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      clearError();
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Google sign in
  const loginWithGoogle = async () => {
    try {
      clearError();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      // If user doesn't exist in Firestore, create their document
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          events: [],
          invites: []
        });
      }
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Log out function
  const logout = async () => {
    try {
      clearError();
      await signOut(auth);
      setUserProfile(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Password reset
  const resetPassword = async (email) => {
    try {
      clearError();
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Update user profile
  const updateUserProfile = async (displayName, photoURL) => {
    try {
      clearError();
      const user = auth.currentUser;
      
      if (!user) throw new Error('No user logged in');
      
      const updateData = {};
      if (displayName) updateData.displayName = displayName;
      if (photoURL) updateData.photoURL = photoURL;
      
      // Update Firebase Auth profile
      await updateProfile(user, updateData);
      
      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), {
        ...updateData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local state
      if (userProfile) {
        setUserProfile({
          ...userProfile,
          ...updateData
        });
      }
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Fetch user profile data
  const fetchUserProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        return userData;
      } else {
        console.log('No user profile found');
        return null;
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch additional user data from Firestore
        await fetchUserProfile(user.uid);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    loginWithGoogle,
    updateUserProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;