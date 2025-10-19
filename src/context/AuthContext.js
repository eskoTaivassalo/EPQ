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
import { doc, setDoc, getDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import AuthService from '../services/authService';
import SecurityService from '../services/securityService';
import GDPRService from '../services/gdprService';

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
    console.log('AuthContext: userData.role specifically:', userData.role);
    
    try {
      // 🔒 SECURITY VALIDATIONS - Uudet turvallisuustarkistukset
      
      // 1. Rate limiting tarkistus
      const rateLimitResult = SecurityService.checkRateLimit(
        userData.email, 
        3, // max 3 rekisteröintiä
        300000 // 5 minuutissa
      );
      
      if (!rateLimitResult.allowed) {
        throw new Error(rateLimitResult.message);
      }

      // 2. Sanitoi ja validoi kaikki syötteet
      const sanitizedData = SecurityService.sanitizeObject(userData);
      
      // Validoi nimi
      const nameValidation = SecurityService.validateUsername(sanitizedData.name);
      if (!nameValidation.isValid) {
        throw new Error(`Nimi: ${nameValidation.message}`);
      }

      // Validoi sähköposti
      if (!AuthService.validateEmail(sanitizedData.email)) {
        throw new Error('Virheellinen sähköpostiosoite');
      }

      // Validoi salasana
      const passwordValidation = AuthService.validatePassword(sanitizedData.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Salasana: ${passwordValidation.message}`);
      }

      // Validoi puhelinnumero jos annettu
      if (sanitizedData.phone) {
        const phoneValidation = SecurityService.validatePhoneNumber(sanitizedData.phone);
        if (!phoneValidation.isValid) {
          throw new Error(`Puhelinnumero: ${phoneValidation.message}`);
        }
        sanitizedData.phone = phoneValidation.sanitized;
      }

      // Validoi bio/kuvaus jos annettu
      if (sanitizedData.bio) {
        const bioValidation = SecurityService.validateDescription(sanitizedData.bio);
        if (!bioValidation.isValid) {
          throw new Error(`Kuvaus: ${bioValidation.message}`);
        }
        sanitizedData.bio = bioValidation.sanitized;
      }

      // Validoi tagit
      if (sanitizedData.tags && Array.isArray(sanitizedData.tags)) {
        const tagsValidation = SecurityService.validateTags(sanitizedData.tags);
        if (!tagsValidation.isValid) {
          throw new Error(`Oppiaineet: ${tagsValidation.message}`);
        }
        sanitizedData.tags = tagsValidation.sanitized;
      }

      // 3. Tarkista injection-hyökkäykset
      const userValues = Object.values(sanitizedData).filter(v => typeof v === 'string');
      for (const value of userValues) {
        if (!SecurityService.isSafeFromInjection(value)) {
          SecurityService.logSecurityEvent('injection_attempt', {
            email: sanitizedData.email,
            suspiciousValue: value.substring(0, 50)
          });
          throw new Error('Virheellisiä merkkejä syötteessä');
        }
      }

      console.log('AuthContext: Security validations passed');

      if (!auth || !db) {
        console.log('AuthContext: No Firebase, using fallback for registration');
        // Fallback mode
        const userRole = sanitizedData.role || 'parent';
        console.log('AuthContext: Using role for direct fallback:', userRole);
        return await loginFallback(userRole, sanitizedData);
      }

      console.log('AuthContext: Attempting Firebase registration');
      
      // Luo käyttäjä Firebase Authiin käyttäen sanitoituja tietoja
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        sanitizedData.email, 
        sanitizedData.password
      );

      console.log('AuthContext: Firebase Auth user created successfully');

      // Päivitä käyttäjän nimi käyttäen sanitoitua nimeä
      await updateProfile(userCredential.user, {
        displayName: nameValidation.sanitized
      });

      // 📧 Lähetä email verification automaattisesti (varoitus jos epäonnistuu)
      try {
        await AuthService.sendEmailVerification(userCredential.user);
        console.log('AuthContext: Email verification sent successfully');
        
        // 📅 Merkitse tilin luontiaika expiration trackingiin
        AuthService.markAccountCreationTime(userCredential.user.uid);
        
      } catch (emailError) {
        console.warn('AuthContext: Email verification failed:', emailError.message);
        // 🔧 KEHITYSVAIHEESSA: Ei keskeytä rekisteröintiä
        // Tuotannossa tämä voisi olla pakollinen
      }

      // Tallenna lisätiedot Firestoreen käyttäen sanitoituja tietoja
      const userDoc = {
        ...sanitizedData,
        uid: userCredential.user.uid,
        email: sanitizedData.email,
        userType: sanitizedData.role,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        lastUpdated: new Date().toISOString(),
        securityScore: AuthService.getPasswordStrength(sanitizedData.password)
      };

      try {
        // Tallenna vain rooli-specifiseen kokoelmaan
        const collectionName = userData.role === 'teacher' ? 'teachers' : 'parents';
        await setDoc(doc(db, collectionName, userCredential.user.uid), userDoc);
        console.log(`AuthContext: User saved to ${collectionName} collection`);
      } catch (firestoreError) {
        console.log('AuthContext: Firestore write failed, but Auth user created. Continuing with Auth user only:', firestoreError.message);
        // Jatka ilman Firestore-tallennusta jos permissions puuttuvat
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
      console.log('AuthContext: userData.role:', userData.role);
      
      // Jos sähköposti on jo käytössä, yritä kirjautua sisään
      if (error.code === 'auth/email-already-in-use') {
        console.log('AuthContext: Email already in use, trying to login instead');
        try {
          // Yritä kirjautua sisään olemassa olevalla käyttäjällä
          const userCredential = await signInWithEmailAndPassword(
            auth, 
            userData.email, 
            userData.password || 'demo123456'
          );
          
          // Hae käyttäjän tiedot rooli-spesifisestä kokoelmasta
          try {
            // Yritä ensin opettajien kokoelmasta
            let userDoc = await getDoc(doc(db, 'teachers', userCredential.user.uid));
            let collectionUsed = 'teachers';
            
            // Jos ei löydy opettajista, yritä vanhempien kokoelmasta
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
              // Jos Firestore-dokumentti ei löydy kummastakaan kokoelmasta, käytä annettuja tietoja
              setUser({
                ...userCredential.user,
                userType: userData.role,
                profile: userData
              });
              console.log('AuthContext: Login successful, no Firestore data found in teachers or parents collections, using provided data');
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
          // Jos kirjautuminen epäonnistuu, käytä fallback-moodia
          const userRole = userData.role || 'parent';
          return await loginFallback(userRole, userData);
        }
      }
      
      // Muut Firebase-virheet, käytä fallback-moodia
      console.log('AuthContext: Firebase registration failed, using fallback');
      try {
        // Varmista että rooli on määritelty
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
    try {
      if (!auth || !db) {
        // Fallback mode
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
    
    // 🚫 EI HYVÄKSYTÄ HEIKKOJA SALASANOJA FALLBACK-MOODISSAKAAN
    if (userData.password) {
      const passwordValidation = AuthService.validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        console.error('AuthContext: Fallback rejected due to weak password');
        throw new Error(passwordValidation.message);
      }
    }
    
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

  // Apufunktiot tietokannan hakuun
  const getTeachers = async () => {
    try {
      if (!db) {
        console.log('AuthContext: No Firestore, cannot fetch teachers');
        return [];
      }
      
      const teachersRef = collection(db, 'teachers');
      const snapshot = await getDocs(teachersRef);
      const teachers = [];
      
      snapshot.forEach((doc) => {
        teachers.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`AuthContext: Fetched ${teachers.length} teachers from database`);
      return teachers;
    } catch (error) {
      console.error('AuthContext: Error fetching teachers:', error);
      return [];
    }
  };

  const getParents = async () => {
    try {
      if (!db) {
        console.log('AuthContext: No Firestore, cannot fetch parents');
        return [];
      }
      
      const parentsRef = collection(db, 'parents');
      const snapshot = await getDocs(parentsRef);
      const parents = [];
      
      snapshot.forEach((doc) => {
        parents.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`AuthContext: Fetched ${parents.length} parents from database`);
      return parents;
    } catch (error) {
      console.error('AuthContext: Error fetching parents:', error);
      return [];
    }
  };

  // 🔐 Uudet security ja GDPR metodit
  const sendPasswordReset = async (email) => {
    try {
      return await AuthService.sendPasswordReset(email);
    } catch (error) {
      console.error('AuthContext: Password reset error:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      return await AuthService.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('AuthContext: Password change error:', error);
      throw error;
    }
  };

  const deleteAccount = async (password) => {
    try {
      // 1. Poista kaikki käyttäjädata GDPR:n mukaisesti
      await GDPRService.deleteAllUserData(password);
      
      // 2. Poista Firebase Auth käyttäjä
      await AuthService.deleteAccount(password);
      
      // 3. Nollaa lokaali state
      setUser(null);
      
      return { success: true, message: 'Käyttäjätili poistettu onnistuneesti' };
    } catch (error) {
      console.error('AuthContext: Account deletion error:', error);
      throw error;
    }
  };

  const exportUserData = async () => {
    try {
      return await GDPRService.exportUserData();
    } catch (error) {
      console.error('AuthContext: Data export error:', error);
      throw error;
    }
  };

  const getConsentSettings = async () => {
    try {
      return await GDPRService.getConsentSettings();
    } catch (error) {
      console.error('AuthContext: Consent settings error:', error);
      throw error;
    }
  };

  const updateConsentSettings = async (consents) => {
    try {
      return await GDPRService.saveConsentSettings(consents);
    } catch (error) {
      console.error('AuthContext: Consent update error:', error);
      throw error;
    }
  };

  const getPrivacySettings = async () => {
    try {
      return await GDPRService.getPrivacySettings();
    } catch (error) {
      console.error('AuthContext: Privacy settings error:', error);
      throw error;
    }
  };

  const updatePrivacySettings = async (settings) => {
    try {
      return await GDPRService.savePrivacySettings(settings);
    } catch (error) {
      console.error('AuthContext: Privacy settings update error:', error);
      throw error;
    }
  };

  const validatePassword = (password) => {
    return AuthService.validatePassword(password);
  };

  const getPasswordStrength = (password) => {
    return AuthService.getPasswordStrength(password);
  };

  const isEmailVerified = () => {
    return AuthService.isEmailVerified();
  };

  const sendEmailVerification = async () => {
    try {
      return await AuthService.sendEmailVerification();
    } catch (error) {
      console.error('AuthContext: Email verification error:', error);
      throw error;
    }
  };

  // 🔄 Refresh user data from Firebase Auth
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
    getTeachers,
    getParents,
    
    // 🔐 Security features
    sendPasswordReset,
    changePassword,
    validatePassword,
    getPasswordStrength,
    isEmailVerified,
    sendEmailVerification,
    refreshUser,
    
    // 🛡️ GDPR & Privacy
    deleteAccount,
    exportUserData,
    getConsentSettings,
    updateConsentSettings,
    getPrivacySettings,
    updatePrivacySettings
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};