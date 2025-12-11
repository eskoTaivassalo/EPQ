import { 
  sendEmailVerification, 
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import imagePickerService from './imagePickerService';
import * as userDatabaseService from './userDatabaseService';

/**
 * Auth Service - Keskitetty autentikointipalvelu
 * 
 * Sisältää:
 * - Email verification
 * - Password reset
 * - Password change
 * - Account deletion
 * - Security validations
 */

export class AuthService {
  
  // 📅 ACCOUNT EXPIRATION CONSTANTS
  static EMAIL_VERIFICATION_TIMEOUT = 3 * 24 * 60 * 60 * 1000; // 3 päivää millisekunneissa
  static CLEANUP_CHECK_INTERVAL = 60 * 60 * 1000; // Tarkista tunnin välein
  
  /**
   * 📅 Tallenna tilin luontiaika local storageen seurantaa varten
   */
  static markAccountCreationTime(userId) {
    try {
      const creationData = {
        userId: userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.EMAIL_VERIFICATION_TIMEOUT).toISOString(),
        emailVerified: false
      };
      
      // Tallenna local storageen
      const existingAccounts = this.getUnverifiedAccounts();
      existingAccounts[userId] = creationData;
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('unverifiedAccounts', JSON.stringify(existingAccounts));
      }
      
      console.log('⏰ Account creation time marked for user:', userId);
      console.log('📅 Account expires at:', creationData.expiresAt);
      
      return creationData;
    } catch (error) {
      console.error('Error marking account creation time:', error);
    }
  }
  
  /**
   * 📋 Hae kaikki vahvistamattomat tilit
   */
  static getUnverifiedAccounts() {
    try {
      if (typeof localStorage === 'undefined') return {};
      
      const stored = localStorage.getItem('unverifiedAccounts');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting unverified accounts:', error);
      return {};
    }
  }
  
  /**
   * ✅ Merkitse tili vahvistetuksi
   */
  static markAccountVerified(userId) {
    try {
      const accounts = this.getUnverifiedAccounts();
      if (accounts[userId]) {
        delete accounts[userId];
        
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('unverifiedAccounts', JSON.stringify(accounts));
        }
        
        console.log('✅ Account marked as verified:', userId);
      }
    } catch (error) {
      console.error('Error marking account verified:', error);
    }
  }
  
  /**
   * 🗑️ Tarkista ja poista vanhentuneet tilit
   */
  static async cleanupExpiredAccounts() {
    try {
      const accounts = this.getUnverifiedAccounts();
      const now = new Date();
      const expiredAccounts = [];
      
      // Etsi vanhentuneet tilit
      for (const [userId, accountData] of Object.entries(accounts)) {
        const expiresAt = new Date(accountData.expiresAt);
        
        if (now > expiresAt) {
          expiredAccounts.push({ userId, accountData });
        }
      }
      
      console.log(`🗑️ Found ${expiredAccounts.length} expired accounts`);
      
      // Poista vanhentuneet tilit
      for (const { userId, accountData } of expiredAccounts) {
        await this.deleteExpiredAccount(userId, accountData);
      }
      
      return {
        checked: Object.keys(accounts).length,
        expired: expiredAccounts.length,
        cleaned: expiredAccounts.length
      };
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      return { error: error.message };
    }
  }
  
  /**
   * 🗑️ Poista yksittäinen vanhentunut tili
   */
  static async deleteExpiredAccount(userId, accountData) {
    try {
      console.log(`🗑️ Deleting expired account: ${userId} (created: ${accountData.createdAt})`);
      
      // Poista local storagesta
      const accounts = this.getUnverifiedAccounts();
      delete accounts[userId];
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('unverifiedAccounts', JSON.stringify(accounts));
      }
      
      // HUOM: Firebase user deletion vaatisi admin SDK:ta tai Cloud Functions
      // Tässä vaiheessa vain poistetaan local tracking
      
      console.log('✅ Expired account tracking removed:', userId);
      
      return { success: true, userId };
      
    } catch (error) {
      console.error('Error deleting expired account:', error);
      throw error;
    }
  }
  
  /**
   * ⏰ Käynnistä automaattinen cleanup timer
   */
  static startCleanupTimer() {
    if (typeof setInterval === 'undefined') return null;
    
    console.log('⏰ Starting account cleanup timer...');
    
    return setInterval(async () => {
      console.log('🔍 Running scheduled account cleanup...');
      const result = await this.cleanupExpiredAccounts();
      
      if (result.expired > 0) {
        console.log(`🗑️ Cleanup completed: ${result.cleaned} accounts removed`);
      }
    }, this.CLEANUP_CHECK_INTERVAL);
  }
  
  /**
   * 📊 Hae tilin tila (vahvistettu/vanhentunut/aktiivinen)
   */
  static getAccountStatus(userId) {
    const accounts = this.getUnverifiedAccounts();
    const accountData = accounts[userId];
    
    if (!accountData) {
      return { status: 'verified_or_not_tracked', verified: true };
    }
    
    const now = new Date();
    const expiresAt = new Date(accountData.expiresAt);
    const timeLeft = expiresAt - now;
    
    if (timeLeft <= 0) {
      return { 
        status: 'expired', 
        verified: false, 
        timeLeft: 0,
        expiresAt: accountData.expiresAt
      };
    }
    
    return { 
      status: 'pending_verification', 
      verified: false, 
      timeLeft: timeLeft,
      expiresAt: accountData.expiresAt,
      timeLeftHours: Math.ceil(timeLeft / (60 * 60 * 1000))
    };
  }
  
  /**
   * Lähetä email-vahvistus uudelle käyttäjälle
   */
  static async sendEmailVerification(user = null) {
    const currentUser = user || auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    if (currentUser.emailVerified) {
      throw new Error('Email already verified');
    }

    try {
      // 🔧 KORJAUS: Käytä Firebase:n default URL:ia ilman custom redirectiä
      await sendEmailVerification(currentUser);
      
      console.log('Email verification sent successfully');
      return {
        success: true,
        message: 'Vahvistussähköposti lähetetty osoitteeseen: ' + currentUser.email
      };
    } catch (error) {
      console.error('Email verification error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Lähetä salasanan nollausviesti
   */
  static async sendPasswordReset(email) {
    const emailValidation = this.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(emailValidation.message);
    }

    try {
      // 🔧 KORJAUS: Käytä Firebase:n default URL:ia
      await sendPasswordResetEmail(auth, email);
      
      console.log('Password reset email sent to:', email);
      return {
        success: true,
        message: 'Salasanan nollausviesti lähetetty osoitteeseen: ' + email
      };
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Vaihda salasana (vaatii nykyisen salasanan)
   */
  static async changePassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Ei kirjautunut käyttäjä');
    }

    // Validoi uusi salasana
    const passwordValidation = this.validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.message);
    }

    try {
      // Re-authenticate käyttäjä ensin
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Päivitä salasana
      await updatePassword(user, newPassword);
      
      console.log('Password updated successfully');
      return {
        success: true,
        message: 'Salasana vaihdettu onnistuneesti'
      };
    } catch (error) {
      console.error('Password change error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Poista käyttäjätili (vaatii re-authentication)
   */
  static async deleteAccount(password) {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Ei kirjautunut käyttäjä');
    }

    try {
      // Re-authenticate käyttäjä
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Poista käyttäjä
      await deleteUser(user);
      
      console.log('User account deleted successfully');
      return {
        success: true,
        message: 'Käyttäjätili poistettu onnistuneesti'
      };
    } catch (error) {
      console.error('Account deletion error:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  /**
   * Validoi sähköpostiosoite
   */
  static validateEmail(email) {
    if (!email) {
      return { isValid: false, message: 'Sähköposti on pakollinen' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    
    return {
      isValid,
      message: isValid ? 'Kelvollinen sähköposti' : 'Virheellinen sähköpostiosoite'
    };
  }

  /**
   * Validoi salasana - parannettu versio
   */
  static validatePassword(password) {
    const minLength = 8;
    const maxLength = 128;
    
    if (!password) {
      return { isValid: false, message: 'Salasana on pakollinen' };
    }
    
    if (password.length < minLength) {
      return { isValid: false, message: `Salasanan tulee olla vähintään ${minLength} merkkiä` };
    }
    
    if (password.length > maxLength) {
      return { isValid: false, message: `Salasana on liian pitkä (max ${maxLength} merkkiä)` };
    }
    
    // Tarkista että sisältää:
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const requirements = [];
    if (!hasUpperCase) requirements.push('isoja kirjaimia');
    if (!hasLowerCase) requirements.push('pieniä kirjaimia');
    if (!hasNumbers) requirements.push('numeroita');
    if (!hasSpecialChar) requirements.push('erikoismerkkejä (!@#$%^&*)');
    
    if (requirements.length > 0) {
      return { 
        isValid: false, 
        message: `Salasanan tulee sisältää: ${requirements.join(', ')}` 
      };
    }
    
    // Tarkista yleiset heikot salasanat
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      return { isValid: false, message: 'Liian yleinen salasana, valitse turvallisempi' };
    }
    
    return { isValid: true, message: 'Salasana on kelvollinen' };
  }

  /**
   * Tarkista salasanan vahvuus (0-100)
   */
  static getPasswordStrength(password) {
    let score = 0;
    
    if (!password) return 0;
    
    // Pituus
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Merkki tyypit
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    
    // Monipuolisuus
    if (/[a-z].*[A-Z]|[A-Z].*[a-z]/.test(password)) score += 5;
    if (/[a-zA-Z].*[0-9]|[0-9].*[a-zA-Z]/.test(password)) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Muunna Firebase error koodi käyttäjäystävälliseksi viestiksi
   */
  static getErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'Käyttäjää ei löydy tällä sähköpostiosoitteella',
      'auth/wrong-password': 'Virheellinen salasana',
      'auth/email-already-in-use': 'Sähköpostiosoite on jo käytössä',
      'auth/weak-password': 'Salasana on liian heikko',
      'auth/invalid-email': 'Virheellinen sähköpostiosoite',
      'auth/too-many-requests': 'Liian monta yritystä, yritä myöhemmin uudelleen',
      'auth/network-request-failed': 'Verkkoyhteysvirhe, tarkista internetyhteytesi',
      'auth/requires-recent-login': 'Toiminto vaatii uudelleen kirjautumisen',
      'auth/user-disabled': 'Käyttäjätili on poistettu käytöstä',
      'auth/operation-not-allowed': 'Toiminto ei ole sallittu',
      'auth/invalid-action-code': 'Virheellinen tai vanhentunut toimintokoodi',
      'auth/expired-action-code': 'Toimintokoodi on vanhentunut'
    };
    
    return errorMessages[errorCode] || 'Tuntematon virhe tapahtui';
  }

  /**
   * Tarkista onko käyttäjän email vahvistettu
   */
  static isEmailVerified() {
    return auth.currentUser?.emailVerified || false;
  }

  /**
   * Hae käyttäjän metadata
   */
  static getUserMetadata() {
    const user = auth.currentUser;
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      displayName: user.displayName,
      photoURL: user.photoURL,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
      providerData: user.providerData
    };
  }
 
  /**
   * 🔧 Konfiguroi Google Sign-In
   * Kutsutaan sovelluksen käynnistyessä
   */
  static configureGoogleSignIn() {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        offlineAccess: true,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * � Hae Google-käyttäjän tiedot ILMAN Firebase-autentikointia
   * Käytetään signup-lomakkeen esitäyttämiseen
   */
  static async getGoogleUserInfo() {
    try {
      // Tarkista onko Google Play Services saatavilla
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Kirjaudu Googleen (EI vielä Firebaseen)
      const userInfo = await GoogleSignin.signIn();
      
      // Hae idToken
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;
      const user = userInfo?.data?.user || userInfo?.user;
      
      if (!idToken) {
        throw new Error('Google-kirjautuminen epäonnistui: ei saatu tunnistetta');
      }
      
      // Palauta käyttäjätiedot JA idToken (tarvitaan myöhemmin Firebase-autentikointiin)
      return {
        idToken,
        email: user?.email,
        displayName: user?.name,
        photoURL: user?.photo,
        givenName: user?.givenName,
        familyName: user?.familyName,
      };
    } catch (error) {
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === '-5') {
        throw new Error('Kirjautuminen peruutettiin');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Kirjautuminen on jo käynnissä');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services ei ole saatavilla');
      }
      
      throw error;
    }
  }

  /**
   * 🔵 Luo Firebase-autentikointi Google idToken:illa
   * Kutsutaan VASTA signup-lomakkeen lähetyksen jälkeen
   */
  static async signInWithGoogleToken(idToken) {
    try {
      if (!idToken) {
        throw new Error('idToken puuttuu');
      }
      
      // Luo Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Kirjaudu Firebaseen
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Merkitse tili vahvistetuksi
      if (userCredential.user.uid) {
        this.markAccountVerified(userCredential.user.uid);
      }
      
      return userCredential;
    } catch (error) {
      throw error;
    }
  }

  /**
   * �🔐 Kirjaudu sisään Google-tilillä (VANHA - olemassa oleville käyttäjille)
   * @returns {Promise<UserCredential>} Firebase UserCredential
   */
  static async signInWithGoogle() {
    try {
      // Tarkista onko Google Play Services saatavilla
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Kirjaudu Googleen
      const userInfo = await GoogleSignin.signIn();
      
      // Hae idToken oikein uudesta API:sta
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;
      
      if (!idToken) {
        throw new Error('Google-kirjautuminen epäonnistui: ei saatu tunnistetta');
      }
      
      // Luo Firebase credential
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Kirjaudu Firebaseen
      const userCredential = await signInWithCredential(auth, googleCredential);
      
      // Google-kirjautumisella ei tarvitse email-vahvistusta
      // Merkitse tili vahvistetuksi automaattisesti
      if (userCredential.user.uid) {
        this.markAccountVerified(userCredential.user.uid);
      }
      
      return userCredential;
    } catch (error) {
      // Käyttäjäystävälliset virheilmoitukset
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === '-5') {
        throw new Error('Kirjautuminen peruutettiin');
      } else if (error.code === 'IN_PROGRESS') {
        throw new Error('Kirjautuminen on jo käynnissä');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services ei ole saatavilla');
      } else if (error.message && error.message.includes('argument-error')) {
        throw new Error('Virhe Google-tunnisteen käsittelyssä. Yritä uudelleen.');
      }
      
      throw error;
    }
  }

  /**
   * 🚪 Kirjaudu ulos Google-tililtä
   */
  static async signOutFromGoogle() {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        await GoogleSignin.signOut();
      }
    } catch (error) {
    }
  }

  /**
   * 🔄 Tarkista Google-kirjautumisen tila
   */
  static async checkGoogleSignInStatus() {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      if (isSignedIn) {
        const userInfo = await GoogleSignin.getCurrentUser();
        return userInfo;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 📸 Päivitä profiilikuva
   * 
   * Lataa profiilikuvan Firebase Storageen ja päivittää URL:n
   * Firebase Authiin ja Firestoreen.
   * 
   * @param {string} imageUri - Paikallinen kuvan URI
   * @param {string} userId - Käyttäjän ID
   * @param {string} userType - Käyttäjätyyppi ('teacher' tai 'parent')
   * @returns {string|null} - Kuvan julkinen URL tai null jos epäonnistui
   */
  static async updateProfileImage(imageUri, userId, userType) {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      console.log('📸 Updating profile image...');
      console.log('  User ID:', userId);
      console.log('  User type:', userType);
      console.log('  Image URI:', imageUri);

      // Lataa kuva Firebase Storageen
      const downloadURL = await imagePickerService.uploadImage(imageUri, userId, 'profile.jpg');

      if (!downloadURL) {
        throw new Error('Failed to upload image');
      }

      console.log('✅ Image uploaded, updating profile...');

      // Päivitä Firebase Auth profiilikuva
      await updateProfile(currentUser, {
        photoURL: downloadURL
      });

      console.log('✅ Firebase Auth profile updated');

      // Päivitä Firestore profiilikuva - käytetään userDatabaseService
      // Päivitä main profile
      const mainUserDocRef = doc(db, 'users', userId);
      await updateDoc(mainUserDocRef, {
        photoURL: downloadURL,
        profileImageUrl: downloadURL,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Firestore main profile updated');

      // Päivitä role profile
      // Path: serviceTypes/{serviceType}/{collectionName}/{userId}
      const role = userType === 'teacher' ? 'service_provider' : 'parent';
      const { serviceType, collection: collectionName } = userDatabaseService.getRoleCollectionInfo(role);
      const roleDocRef = doc(db, 'serviceTypes', serviceType, collectionName, userId);
      
      // Use setDoc with merge to create or update
      await setDoc(roleDocRef, {
        photoURL: downloadURL,
        profileImageUrl: downloadURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log('✅ Firestore role profile updated');

      return downloadURL;
    } catch (error) {
      console.error('❌ Error updating profile image:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Poista profiilikuva
   * 
   * Poistaa profiilikuvan Firebase Storagesta ja päivittää
   * Firebase Authin ja Firestoren.
   * 
   * @param {string} userId - Käyttäjän ID
   * @param {string} userType - Käyttäjätyyppi ('teacher' tai 'parent')
   * @returns {boolean} - True jos onnistui
   */
  static async deleteProfileImage(userId, userType) {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      console.log('🗑️ Deleting profile image...');
      console.log('  User ID:', userId);
      console.log('  User type:', userType);

      // Poista kuva Firebase Storagesta
      await imagePickerService.deleteImage(userId, 'profile.jpg');

      console.log('✅ Image deleted from storage');

      // Päivitä Firebase Auth profiilikuva
      await updateProfile(currentUser, {
        photoURL: null
      });

      console.log('✅ Firebase Auth profile updated');

      // Päivitä Firestore profiilikuva
      const collectionName = userType === 'teacher' ? 'teachers' : 'parents';
      const userDocRef = doc(db, collectionName, userId);
      
      await updateDoc(userDocRef, {
        photoURL: null,
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Firestore profile updated');

      return true;
    } catch (error) {
      console.error('❌ Error deleting profile image:', error);
      throw error;
    }
  }
}

export default AuthService;