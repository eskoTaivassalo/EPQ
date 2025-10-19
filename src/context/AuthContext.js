import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import AuthService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    let timeoutId;
    let cleanupTimer = null; // 🗑️ Account cleanup timer
    
    console.log('AuthContext: Initializing, auth available:', !!auth);
    
    // 🗑️ Käynnistä account expiration cleanup timer
    try {
      cleanupTimer = AuthService.startCleanupTimer();
      console.log('⏰ Account cleanup timer started');
    } catch (error) {
      console.error('Failed to start cleanup timer:', error);
    }
    
    // Aseta timeout fallbackille
    timeoutId = setTimeout(() => {
      console.log('AuthContext: Firebase timeout, switching to fallback mode');
      loadStoredAuth();
    }, 5000); // 5 sekuntia timeout
    
    if (auth) {
      console.log('AuthContext: Setting up Firebase auth listener');
      // Kuuntele Firebase Auth tilan muutoksia
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          console.log('AuthContext: Auth state changed, user:', !!firebaseUser);
          clearTimeout(timeoutId); // Peruuta timeout jos Firebase toimii
          
          if (firebaseUser) {
            // ✅ Tarkista email verification status ja päivitä tracking
            if (firebaseUser.emailVerified) {
              AuthService.markAccountVerified(firebaseUser.uid);
              console.log('✅ Email verified, account marked as verified');
            }
            
            try {
              console.log('AuthContext: Fetching user data from Firestore');
              // Hae käyttäjän lisätiedot rooli-spesifisestä kokoelmasta
              let userDoc = await getDoc(doc(db, 'teachers', firebaseUser.uid));
              let userData = userDoc.data();
              let collectionUsed = 'teachers';
              
              // Jos ei löydy opettajista, yritä vanhempien kokoelmasta
              if (!userDoc.exists()) {
                userDoc = await getDoc(doc(db, 'parents', firebaseUser.uid));
                userData = userDoc.data();
                collectionUsed = 'parents';
              }
              
              setUser({
                ...firebaseUser,
                userType: userData?.userType || 'parent',
                profile: userData || {}
              });
              console.log(`AuthContext: User set with Firestore data from ${collectionUsed} collection`);
              
              // 📧 Näytä first-time user email verification reminder
              showFirstTimeEmailReminder(firebaseUser, userData);
            } catch (firestoreError) {
              console.error('AuthContext: Firestore error, using auth data only:', firestoreError);
              // Jos Firestore epäonnistuu, käytä vain auth-dataa
              setUser({
                ...firebaseUser,
                userType: 'parent', // Default type
                profile: {}
              });
            }
          } else {
            console.log('AuthContext: No user, setting null');
            setUser(null);
          }
          setLoading(false);
          console.log('AuthContext: Loading set to false');
        } catch (error) {
          console.error('AuthContext: Auth state change error:', error);
          // Jos kaikki epäonnistuu, siirry fallback-tilaan
          loadStoredAuth();
        }
      });
    } else {
      clearTimeout(timeoutId);
      console.log('AuthContext: No Firebase auth, using fallback');
      // Fallback ilman Firebasea
      loadStoredAuth();
    }

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
      
      // 🗑️ Cleanup account expiration timer
      if (cleanupTimer) {
        clearInterval(cleanupTimer);
        console.log('⏰ Account cleanup timer stopped');
      }
    };
  }, []);

  // 📧 First-time user email verification reminder
  const showFirstTimeEmailReminder = (firebaseUser, userData) => {
    if (!firebaseUser.emailVerified) {
      const accountCreated = userData?.createdAt;
      const now = new Date();
      const createdDate = accountCreated ? new Date(accountCreated) : now;
      const timeSinceCreation = now - createdDate;
      const minutesSinceCreation = timeSinceCreation / (1000 * 60);
      
      // Näytä muistutus jos tili on luotu <10 minuuttia sitten (hiljattain rekisteröitynyt)
      if (minutesSinceCreation < 10) {
        setTimeout(() => {
          Alert.alert(
            '📧 Muista vahvistaa sähköpostisi!',
            '🔒 Tilisi turvallisuuden vuoksi vahvista sähköpostiosoitteesi 3 päivän kuluessa.\n\n' +
            '✉️ Tarkista sähköpostisi ja klikkaa vahvistuslinkkiä\n' +
            '⚠️ Tili poistetaan automaattisesti jos et vahvista ajoissa\n\n' +
            '💡 Löydät "Lähetä uudelleen" -napin sovelluksen yläosasta.',
            [{ text: 'OK, ymmärretty!' }]
          );
        }, 2000); // 2 sekunnin viive että Dashboard ehtii latautua
      }
    }
  };

  const loadStoredAuth = async () => {
    console.log('AuthContext: Loading stored auth from AsyncStorage');
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        console.log('AuthContext: Found stored user data');
        setUser(JSON.parse(storedUser));
      } else {
        console.log('AuthContext: No stored user data found');
      }
    } catch (error) {
      console.error('AuthContext: Error loading stored auth:', error);
    } finally {
      console.log('AuthContext: Setting loading to false from loadStoredAuth');
      setLoading(false);
    }
  };

  const register = async (userData) => {
    console.log('AuthContext: Register called with userData:', JSON.stringify(userData, null, 2));
    
    try {
      if (!auth || !db) {
        console.log('AuthContext: No Firebase, using fallback for registration');
        const userRole = userData.role || 'parent';
        return await loginFallback(userRole, userData);
      }

      console.log('AuthContext: Attempting Firebase registration');
      
      // Luo käyttäjä Firebase Authiin
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );

      console.log('AuthContext: Firebase Auth user created successfully');

      // Päivitä käyttäjän nimi
      await updateProfile(userCredential.user, {
        displayName: userData.name
      });

      // 📧 Lähetä email verification automaattisesti
      try {
        await AuthService.sendEmailVerification(userCredential.user);
        console.log('AuthContext: Email verification sent successfully');
        
        // 📅 Merkitse tilin luontiaika expiration trackingiin
        AuthService.markAccountCreationTime(userCredential.user.uid);
        
      } catch (emailError) {
        console.warn('AuthContext: Email verification failed:', emailError.message);
      }

      // Tallenna lisätiedot Firestoreen
      const userDoc = {
        ...userData,
        uid: userCredential.user.uid,
        email: userData.email,
        userType: userData.role,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        lastUpdated: new Date().toISOString()
      };

      try {
        // Tallenna vain rooli-specifiseen kokoelmaan
        const collectionName = userData.role === 'teacher' ? 'teachers' : 'parents';
        await setDoc(doc(db, collectionName, userCredential.user.uid), userDoc);
        console.log(`AuthContext: User saved to ${collectionName} collection`);
      } catch (firestoreError) {
        console.log('AuthContext: Firestore write failed, but Auth user created. Continuing with Auth user only:', firestoreError.message);
      }

      // Aseta käyttäjä heti rekisteröinnin jälkeen
      setUser({
        ...userCredential.user,
        userType: userData.role,
        profile: userData
      });

      console.log('AuthContext: Firebase registration successful');
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      
      // Jos sähköposti on jo käytössä, yritä kirjautua sisään
      if (error.code === 'auth/email-already-in-use') {
        console.log('AuthContext: Email already in use, trying to login instead');
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password || 'demo123456'
          );
          
          // Hae käyttäjän tiedot rooli-spesifisestä kokoelmasta
          try {
            let userDoc = await getDoc(doc(db, 'teachers', userCredential.user.uid));
            let collectionUsed = 'teachers';
            
            if (!userDoc.exists()) {
              userDoc = await getDoc(doc(db, 'parents', userCredential.user.uid));
              collectionUsed = 'parents';
            }
            
            if (userDoc.exists()) {
              const existingUserData = userDoc.data();
              setUser({
                ...userCredential.user,
                userType: existingUserData.userType,
                profile: existingUserData
              });
              console.log(`AuthContext: Login successful with existing user data from ${collectionUsed} collection`);
            } else {
              setUser({
                ...userCredential.user,
                userType: userData.role,
                profile: userData
              });
              console.log('AuthContext: Login successful, no Firestore data found, using provided data');
            }
          } catch (firestoreError) {
            console.log('AuthContext: Firestore error during login, using provided data:', firestoreError);
            setUser({
              ...userCredential.user,
              userType: userData.role,
              profile: userData
            });
          }
          
          return { success: true, user: userCredential.user };
        } catch (loginError) {
          console.log('AuthContext: Login also failed, using fallback');
          const userRole = userData.role || 'parent';
          return await loginFallback(userRole, userData);
        }
      }
      
      // Muut Firebase-virheet, käytä fallback-moodia
      console.log('AuthContext: Firebase registration failed, using fallback');
      try {
        const userRole = userData.role || 'parent';
        console.log('AuthContext: Using role for fallback:', userRole);
        return await loginFallback(userRole, userData);
      } catch (fallbackError) {
        console.error('AuthContext: Fallback registration also failed:', fallbackError);
        return { success: false, error: fallbackError.message };
      }
    }
  };

  const login = async (userType, userData) => {
    console.log('🔑 AuthContext: LOGIN STARTED');
    console.log('🔑 UserType:', userType);
    console.log('🔑 UserData:', { email: userData.email, hasPassword: !!userData.password });
    
    try {
      if (!auth || !db) {
        console.log('🔑 AuthContext: No Firebase, using fallback mode');
        return await loginFallback(userType, userData);
      }

      console.log('AuthContext: Attempting Firebase login with email:', userData.email);
      console.log('AuthContext: Expected user type:', userType);
      
      // Yritä kirjautua sisään Firebase Authiin
      const userCredential = await signInWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      console.log('AuthContext: Firebase login successful');

      // Hae käyttäjän tiedot rooli-spesifisestä kokoelmasta
      try {
        let userDoc = null;
        let actualUserType = null;
        let collectionUsed = null;
        
        // Tarkista ensin se kokoelma johon käyttäjä yrittää kirjautua
        if (userType === 'teacher') {
          userDoc = await getDoc(doc(db, 'teachers', userCredential.user.uid));
          if (userDoc.exists()) {
            actualUserType = 'teacher';
            collectionUsed = 'teachers';
          }
        } else if (userType === 'parent') {
          userDoc = await getDoc(doc(db, 'parents', userCredential.user.uid));
          if (userDoc.exists()) {
            actualUserType = 'parent';
            collectionUsed = 'parents';
          }
        }
        
        // Jos käyttäjää ei löydy odotetusta kokoelmasta, tarkista toinen kokoelma
        if (!userDoc || !userDoc.exists()) {
          if (userType === 'teacher') {
            // Yritettiin kirjautua opettajana, tarkistetaan löytyykö vanhempien kokoelmasta
            const parentDoc = await getDoc(doc(db, 'parents', userCredential.user.uid));
            if (parentDoc.exists()) {
              // Käyttäjä löytyi vanhempien kokoelmasta, mutta yrittää kirjautua opettajana
              await signOut(auth); // Kirjaudu ulos
              return { 
                success: false, 
                error: 'This email is registered as a parent account. Please use the parent login.' 
              };
            }
          } else if (userType === 'parent') {
            // Yritettiin kirjautua vanhempana, tarkistetaan löytyykö opettajien kokoelmasta
            const teacherDoc = await getDoc(doc(db, 'teachers', userCredential.user.uid));
            if (teacherDoc.exists()) {
              // Käyttäjä löytyi opettajien kokoelmasta, mutta yrittää kirjautua vanhempana
              await signOut(auth); // Kirjaudu ulos
              return { 
                success: false, 
                error: 'This email is registered as a teacher account. Please use the teacher login.' 
              };
            }
          }
          
          // Jos käyttäjää ei löydy kummastakaan kokoelmasta
          await signOut(auth); // Kirjaudu ulos
          return { 
            success: false, 
            error: `No ${userType} account found with this email. Please register first.` 
          };
        }
        
        // Käyttäjä löytyi oikeasta kokoelmasta
        const existingUserData = userDoc.data();
        setUser({
          ...userCredential.user,
          userType: actualUserType,
          type: actualUserType, // Lisätään myös type-kenttä yhteensopivuuden vuoksi
          profile: existingUserData,
          ...existingUserData // Spread kaikki Firestore-tiedot
        });
        console.log(`AuthContext: User set with Firestore data from ${collectionUsed} collection`);
        
      } catch (firestoreError) {
        console.log('AuthContext: Firestore error during login:', firestoreError);
        await signOut(auth); // Kirjaudu ulos jos Firestore-virhe
        return { 
          success: false, 
          error: 'Database error occurred. Please try again.' 
        };
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.log('AuthContext: Firebase login failed:', error.message);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return { success: false, error: 'Invalid email or password' };
      }
      
      // Jos Firebase epäonnistuu, kokeile fallback-moodia
      console.log('AuthContext: Trying fallback login');
      return await loginFallback(userType, userData);
    }
  };

  const loginFallback = async (userType, userData) => {
    console.log('AuthContext: Using fallback login/registration for userType:', userType);
    
    try {
      const userInfo = {
        id: Date.now(),
        userType: userType,
        type: userType, // Backward compatibility
        email: userData.email,
        profile: userData,
        loginTime: new Date().toISOString(),
        fallbackMode: true // Merkki että käytetään fallbackia
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      console.log('AuthContext: Fallback login successful');
      return { success: true };
    } catch (error) {
      console.error('AuthContext: Fallback login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      } else {
        await AsyncStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  //  Refresh user data from Firebase Auth
  const refreshUser = async () => {
    try {
      if (auth?.currentUser) {
        await auth.currentUser.reload(); // Refresh Firebase user
        const refreshedUser = auth.currentUser;
        
        // Update user state with fresh data
        setUser(prevUser => ({
          ...prevUser,
          ...refreshedUser,
          emailVerified: refreshedUser.emailVerified
        }));
        
        console.log('✅ User data refreshed, emailVerified:', refreshedUser.emailVerified);
        return refreshedUser;
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const value = {
    // Perus auth
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};