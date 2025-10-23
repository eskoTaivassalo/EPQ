/**
 * 🕐 Session Manager - Käyttäjäsession hallinta
 * 
 * Hallitsee:
 * - Session timeout (auto-logout inaktiivisuuden jälkeen)
 * - Token expiry tracking (Firebase token vanheneminen)
 * - Last activity tracking (viimeinen toiminta)
 * - Remember me -toiminnallisuus
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseConfig';

class SessionManager {
  constructor() {
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minuuttia millisekunteina
    this.REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 päivää
    this.activityTimer = null;
    this.tokenCheckInterval = null;
    this.onSessionExpired = null;
    this.rememberMe = false;
  }

  /**
   * Alustaa session seurannan
   * @param {Function} onExpiredCallback - Callback kun sessio vanhenee
   */
  async initialize(onExpiredCallback) {
    console.log('🕐 SessionManager: Initializing session tracking');
    this.onSessionExpired = onExpiredCallback;

    // Tarkista onko "remember me" päällä
    const rememberMeFlag = await AsyncStorage.getItem('rememberMe');
    this.rememberMe = rememberMeFlag === 'true';

    // Lataa viimeinen aktiviteetti
    const lastActivity = await this.getLastActivity();
    
    if (lastActivity && !this.rememberMe) {
      const timeSinceLastActivity = Date.now() - lastActivity;
      
      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        console.log('⏰ SessionManager: Session expired due to inactivity');
        this.handleSessionExpired();
        return false;
      }
    }

    // Käynnistä session seuranta
    this.startActivityTracking();
    this.startTokenMonitoring();
    
    // Päivitä viimeinen aktiviteetti
    await this.updateLastActivity();
    
    console.log('✅ SessionManager: Session tracking started');
    return true;
  }

  /**
   * Käynnistää käyttäjän aktiviteetin seurannan
   */
  startActivityTracking() {
    // Tyhjennä vanha timer jos on
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }

    // Älä käynnistä timeria jos "remember me" on päällä
    if (this.rememberMe) {
      console.log('🕐 SessionManager: Remember me enabled, skipping timeout');
      return;
    }

    // Aseta uusi timer
    this.activityTimer = setTimeout(() => {
      console.log('⏰ SessionManager: Session timeout reached');
      this.handleSessionExpired();
    }, this.SESSION_TIMEOUT);

    console.log(`🕐 SessionManager: Activity timer set for ${this.SESSION_TIMEOUT / 1000 / 60} minutes`);
  }

  /**
   * Käynnistää Firebase tokenin valvonnan
   */
  startTokenMonitoring() {
    // Tarkista token joka 5 minuutti
    this.tokenCheckInterval = setInterval(async () => {
      await this.checkTokenExpiry();
    }, 5 * 60 * 1000);

    console.log('🕐 SessionManager: Token monitoring started (check every 5 min)');
  }

  /**
   * Tarkistaa onko Firebase token vanhentunut
   */
  async checkTokenExpiry() {
    if (!auth || !auth.currentUser) {
      return;
    }

    try {
      // Firebase päivittää tokenin automaattisesti jos se vanhenee
      const token = await auth.currentUser.getIdToken(false);
      
      if (!token) {
        console.log('⚠️ SessionManager: Token refresh failed');
        this.handleSessionExpired();
        return;
      }

      // Dekoodaa token ja tarkista expiry
      const tokenResult = await auth.currentUser.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const now = Date.now();
      const timeUntilExpiry = expirationTime - now;

      console.log(`🕐 SessionManager: Token expires in ${Math.floor(timeUntilExpiry / 1000 / 60)} minutes`);

      // Jos token vanhenee alle 5 minuutissa, päivitä se
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 SessionManager: Refreshing token...');
        await auth.currentUser.getIdToken(true); // Force refresh
        console.log('✅ SessionManager: Token refreshed');
      }

    } catch (error) {
      console.error('❌ SessionManager: Token check error:', error);
      this.handleSessionExpired();
    }
  }

  /**
   * Päivittää viimeisen aktiviteetin aikaleiman
   */
  async updateLastActivity() {
    const now = Date.now();
    await AsyncStorage.setItem('lastActivity', now.toString());
    
    // Käynnistä timer uudelleen
    this.startActivityTracking();
    
    console.log('🕐 SessionManager: Last activity updated');
  }

  /**
   * Hakee viimeisen aktiviteetin aikaleiman
   */
  async getLastActivity() {
    try {
      const lastActivity = await AsyncStorage.getItem('lastActivity');
      return lastActivity ? parseInt(lastActivity, 10) : null;
    } catch (error) {
      console.error('❌ SessionManager: Error getting last activity:', error);
      return null;
    }
  }

  /**
   * Asettaa "Remember Me" -tilan
   * @param {boolean} enabled - Onko remember me päällä
   */
  async setRememberMe(enabled) {
    this.rememberMe = enabled;
    await AsyncStorage.setItem('rememberMe', enabled.toString());
    
    if (enabled) {
      console.log('✅ SessionManager: Remember me enabled');
      // Tyhjennä timeout timer
      if (this.activityTimer) {
        clearTimeout(this.activityTimer);
        this.activityTimer = null;
      }
    } else {
      console.log('✅ SessionManager: Remember me disabled');
      // Käynnistä timeout timer
      this.startActivityTracking();
    }
  }

  /**
   * Tarkistaa onko "Remember Me" päällä
   */
  async isRememberMeEnabled() {
    const rememberMeFlag = await AsyncStorage.getItem('rememberMe');
    return rememberMeFlag === 'true';
  }

  /**
   * Käsittelee session vanhentumisen
   */
  handleSessionExpired() {
    console.log('🚪 SessionManager: Session expired, logging out...');
    
    // Tyhjennä timerit
    this.cleanup();
    
    // Kutsu callback
    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  /**
   * Pysäyttää session seurannan
   */
  cleanup() {
    console.log('🧹 SessionManager: Cleaning up session tracking');
    
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
  }

  /**
   * Nollaa session
   */
  async reset() {
    console.log('🔄 SessionManager: Resetting session');
    
    this.cleanup();
    await AsyncStorage.removeItem('lastActivity');
    await AsyncStorage.removeItem('rememberMe');
    this.rememberMe = false;
  }

  /**
   * Tyhjentää kaikki session tiedot (alias reset-metodille)
   * Käytetään logout-toiminnossa
   */
  async clearSession() {
    console.log('🧹 SessionManager: Clearing session (logout)');
    await this.reset();
  }

  /**
   * Palauttaa session tiedot
   */
  async getSessionInfo() {
    const lastActivity = await this.getLastActivity();
    const rememberMe = await this.isRememberMeEnabled();
    
    let sessionStatus = 'active';
    let timeRemaining = null;

    if (!rememberMe && lastActivity) {
      const timeSinceLastActivity = Date.now() - lastActivity;
      timeRemaining = this.SESSION_TIMEOUT - timeSinceLastActivity;
      
      if (timeRemaining <= 0) {
        sessionStatus = 'expired';
      } else if (timeRemaining < 5 * 60 * 1000) {
        sessionStatus = 'expiring_soon';
      }
    }

    return {
      lastActivity: lastActivity ? new Date(lastActivity) : null,
      rememberMe,
      sessionStatus,
      timeRemaining: timeRemaining ? Math.floor(timeRemaining / 1000 / 60) : null, // Minuutteina
      sessionTimeout: this.SESSION_TIMEOUT / 1000 / 60 // Minuutteina
    };
  }
}

// Singleton instance
export default new SessionManager();
