/**
 * GDPR Debug Tool
 * 
 * Lisää tämä koodi App.js:ään väliaikaisesti nähdäksesi mitä
 * AsyncStoragessa on tallennettuna.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Lisää AppNavigator komponenttiin:
useEffect(() => {
  const debugGDPR = async () => {
    try {
      // Hae kaikki GDPR-related data
      const consentData = await AsyncStorage.getItem('gdpr_consent');
      const privacyData = await AsyncStorage.getItem('privacy_settings');
      
      console.log('🔍 ========== GDPR DEBUG ==========');
      console.log('📋 Consent Data:', consentData ? JSON.parse(consentData) : 'None');
      console.log('🔒 Privacy Settings:', privacyData ? JSON.parse(privacyData) : 'None');
      console.log('🔍 ================================');
      
      // Tarkista onko analytics-suostumus annettu
      if (consentData) {
        const consent = JSON.parse(consentData);
        console.log('📊 Analytics allowed:', consent.analytics);
        console.log('📢 Marketing allowed:', consent.marketing);
        console.log('🎨 Personalization allowed:', consent.personalization);
      }
    } catch (error) {
      console.error('Error reading GDPR data:', error);
    }
  };
  
  debugGDPR();
}, []);

/**
 * Tulokset konsolissa:
 * 
 * Jos hyväksyit "Hyväksy kaikki":
 * {
 *   "necessary": true,
 *   "analytics": true,
 *   "marketing": true,
 *   "social_media": true,
 *   "personalization": true,
 *   "timestamp": "2025-10-20T...",
 *   "version": "1.0"
 * }
 * 
 * Jos hyväksyit "Vain välttämättömät":
 * {
 *   "necessary": true,
 *   "analytics": false,
 *   "marketing": false,
 *   "social_media": false,
 *   "personalization": false,
 *   "timestamp": "2025-10-20T...",
 *   "version": "1.0"
 * }
 */
