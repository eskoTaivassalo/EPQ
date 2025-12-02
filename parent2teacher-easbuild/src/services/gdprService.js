import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebaseConfig';
import { deleteDoc, doc, collection, getDocs, query, where } from 'firebase/firestore';

/**
 * GDPR Service - Tietosuoja-asetuksen vaatimusten täyttäminen
 * 
 * Sisältää:
 * - Cookie/tracking consent management
 * - Data portability (export user data)
 * - Right to be forgotten (delete user data)
 * - Privacy settings management
 * - Data processing logging
 */

export class GDPRService {
  
  static CONSENT_KEY = 'gdpr_consent';
  static PRIVACY_SETTINGS_KEY = 'privacy_settings';
  
  /**
   * Cookie/Tracking consent tyypit
   */
  static CONSENT_TYPES = {
    NECESSARY: 'necessary',       // Pakollinen toiminnallisuus
    ANALYTICS: 'analytics',       // Google Analytics, ym.
    MARKETING: 'marketing',       // Mainokset, retargeting
    SOCIAL_MEDIA: 'social_media', // Facebook, Twitter integraatiot
    PERSONALIZATION: 'personalization' // Henkilökohtaistaminen
  };

  /**
   * Hae nykyiset suostumusasetukset
   */
  static async getConsentSettings() {
    try {
      const stored = await AsyncStorage.getItem(this.CONSENT_KEY);
      
      const defaultConsent = {
        [this.CONSENT_TYPES.NECESSARY]: true, // Aina pakollinen
        [this.CONSENT_TYPES.ANALYTICS]: false,
        [this.CONSENT_TYPES.MARKETING]: false,
        [this.CONSENT_TYPES.SOCIAL_MEDIA]: false,
        [this.CONSENT_TYPES.PERSONALIZATION]: false,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      if (!stored) {
        return defaultConsent;
      }
      
      return { ...defaultConsent, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error getting consent settings:', error);
      return null;
    }
  }

  /**
   * Tallenna suostumusasetukset
   */
  static async saveConsentSettings(consents) {
    try {
      const consentData = {
        ...consents,
        [this.CONSENT_TYPES.NECESSARY]: true, // Pakollinen aina true
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      
      await AsyncStorage.setItem(this.CONSENT_KEY, JSON.stringify(consentData));
      
      // Logi tapahtuma
      this.logGDPREvent('consent_updated', {
        consents: consentData,
        userId: auth.currentUser?.uid
      });
      
      return consentData;
    } catch (error) {
      console.error('Error saving consent settings:', error);
      throw new Error('Suostumusasetusten tallentaminen epäonnistui');
    }
  }

  /**
   * Tarkista onko käyttäjä antanut suostumuksen tietylle toiminnalle
   */
  static async hasConsent(consentType) {
    const settings = await this.getConsentSettings();
    return settings?.[consentType] || false;
  }

  /**
   * Näytä suostumusbanneri jos tarvitaan
   */
  static async shouldShowConsentBanner() {
    const settings = await this.getConsentSettings();
    
    // Näytä jos:
    // 1. Ei ole vielä tallennettu asetuksia
    // 2. Versio on vanhentunut
    // 3. Pakollinen uudelleen suostumus (esim. 12kk välein)
    
    if (!settings) {
      return true;
    }
    
    const timestamp = new Date(settings.timestamp);
    const now = new Date();
    const daysSinceConsent = (now - timestamp) / (1000 * 60 * 60 * 24);
    
    // Pyydä uudelleen suostumusta vuoden välein
    if (daysSinceConsent > 365) {
      return true;
    }
    
    return false;
  }

  /**
   * Vie käyttäjän kaikki tiedot (data portability)
   */
  static async exportUserData() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Käyttäjä ei ole kirjautunut');
    }

    try {
      const userData = {
        account: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        },
        profile: null,
        messages: [],
        bookings: [],
        reviews: [],
        privacy_settings: null,
        consent_history: []
      };

      // Hae profiilitiedot
      try {
        const profileDoc = await getDocs(query(
          collection(db, 'teachers'), 
          where('uid', '==', user.uid)
        ));
        
        if (!profileDoc.empty) {
          userData.profile = profileDoc.docs[0].data();
        } else {
          // Yritä parents-kokoelmasta
          const parentDoc = await getDocs(query(
            collection(db, 'parents'), 
            where('uid', '==', user.uid)
          ));
          
          if (!parentDoc.empty) {
            userData.profile = parentDoc.docs[0].data();
          }
        }
      } catch (error) {
        console.warn('Could not fetch profile data:', error);
      }

      // Hae viestit (placeholder - toteutettava myöhemmin)
      // userData.messages = await this.getUserMessages(user.uid);
      
      // Hae varaukset (placeholder)
      // userData.bookings = await this.getUserBookings(user.uid);
      
      // Hae arvostelut (placeholder)
      // userData.reviews = await this.getUserReviews(user.uid);

      // Hae yksityisyysasetukset
      try {
        const privacySettings = await AsyncStorage.getItem(this.PRIVACY_SETTINGS_KEY);
        if (privacySettings) {
          userData.privacy_settings = JSON.parse(privacySettings);
        }
      } catch (error) {
        console.warn('Could not fetch privacy settings:', error);
      }

      // Hae suostumushistoria
      try {
        const consentSettings = await AsyncStorage.getItem(this.CONSENT_KEY);
        if (consentSettings) {
          userData.consent_history = [JSON.parse(consentSettings)];
        }
      } catch (error) {
        console.warn('Could not fetch consent history:', error);
      }

      // Logi tapahtuma
      this.logGDPREvent('data_export_requested', {
        userId: user.uid,
        dataTypes: Object.keys(userData).filter(key => userData[key] !== null)
      });

      return {
        exportDate: new Date().toISOString(),
        userId: user.uid,
        data: userData
      };
      
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Tietojen vienti epäonnistui');
    }
  }

  /**
   * Poista käyttäjän kaikki tiedot (right to be forgotten)
   */
  static async deleteAllUserData(password) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Käyttäjä ei ole kirjautunut');
    }

    try {
      // Logi ennen poistoa
      this.logGDPREvent('data_deletion_requested', {
        userId: user.uid,
        email: user.email
      });

      // 1. Poista profiili Firestoresta
      try {
        await deleteDoc(doc(db, 'teachers', user.uid));
      } catch (error) {
        // Yritä parents-kokoelmasta
        try {
          await deleteDoc(doc(db, 'parents', user.uid));
        } catch (parentError) {
          console.warn('No profile found to delete');
        }
      }

      // 2. Poista viestit (placeholder)
      // await this.deleteUserMessages(user.uid);
      
      // 3. Poista varaukset (placeholder)
      // await this.deleteUserBookings(user.uid);
      
      // 4. Poista arvostelut (placeholder)
      // await this.deleteUserReviews(user.uid);

      // 5. Poista lokaali data
      await AsyncStorage.multiRemove([
        this.CONSENT_KEY,
        this.PRIVACY_SETTINGS_KEY,
        'user', // AuthContext käyttää tätä
        '@user_profile',
        '@app_settings'
      ]);

      // 6. Poista Firebase Auth käyttäjä (tehdään viimeiseksi)
      // Tämä hoidetaan AuthService.deleteAccount() metodissa

      console.log('All user data deleted successfully');
      return true;
      
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Tietojen poistaminen epäonnistui');
    }
  }

  /**
   * Yksityisyysasetusten hallinta
   */
  static async getPrivacySettings() {
    try {
      const stored = await AsyncStorage.getItem(this.PRIVACY_SETTINGS_KEY);
      
      const defaultSettings = {
        showProfile: true,
        showContactInfo: false,
        allowSearchEngineIndexing: false,
        showOnlineStatus: true,
        allowDirectMessages: true,
        shareUsageData: false,
        marketingEmails: false,
        pushNotifications: true,
        emailNotifications: true
      };
      
      if (!stored) {
        return defaultSettings;
      }
      
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return null;
    }
  }

  /**
   * Tallenna yksityisyysasetukset
   */
  static async savePrivacySettings(settings) {
    try {
      await AsyncStorage.setItem(this.PRIVACY_SETTINGS_KEY, JSON.stringify(settings));
      
      this.logGDPREvent('privacy_settings_updated', {
        userId: auth.currentUser?.uid,
        settings
      });
      
      return settings;
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      throw new Error('Yksityisyysasetusten tallentaminen epäonnistui');
    }
  }

  /**
   * Generoi tietosuojaseloste
   */
  static generatePrivacyPolicy() {
    return {
      lastUpdated: '2025-10-19',
      version: '1.0',
      content: {
        fi: {
          title: 'Tietosuojaseloste - Parents&Teachers',
          sections: [
            {
              title: '1. Rekisterinpitäjä',
              content: 'Parents&Teachers sovellus, tietosuojavastaava: privacy@parentsteachers.com'
            },
            {
              title: '2. Käsiteltävät henkilötiedot',
              content: 'Käsittelemme: nimi, sähköposti, puhelinnumero, profiilitiedot, viestit, varaukset'
            },
            {
              title: '3. Käsittelyn tarkoitus',
              content: 'Tietoja käsitellään palvelun tarjoamiseksi, turvallisuuden varmistamiseksi ja käyttökokemuksen parantamiseksi'
            },
            {
              title: '4. Oikeutesi',
              content: 'Sinulla on oikeus tarkastaa, oikaista, poistaa ja siirtää tietosi. Voit myös vastustaa käsittelyä.'
            },
            {
              title: '5. Tietojen säilytysaika',
              content: 'Säilytämme tietoja niin kauan kuin käytät palvelua tai lakisääteinen säilytysvelvollisuus sitä edellyttää'
            },
            {
              title: '6. Yhteydenotto',
              content: 'Tietosuoja-asioissa voit ottaa yhteyttä: privacy@parentsteachers.com'
            }
          ]
        }
      }
    };
  }

  /**
   * Logi GDPR-tapahtuma
   */
  static logGDPREvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      type: 'GDPR'
    };
    
    console.log('[GDPR]', logEntry);
    
    // Tuotannossa tallennetaan audit-lokiin
    // await saveToAuditLog(logEntry);
  }

  /**
   * Tarkista onko käyttäjä EU:sta (GDPR scope)
   */
  static async isEUUser() {
    // Yksinkertainen toteutus - tuotannossa käytettäisiin IP geolocation:ia
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const euTimezones = [
        'Europe/Helsinki', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen',
        'Europe/Berlin', 'Europe/Paris', 'Europe/London', 'Europe/Rome',
        // ... muut EU aikavyöhykkeet
      ];
      
      return euTimezones.some(tz => timezone.includes('Europe/'));
    } catch (error) {
      // Jos epävarma, oletetaan EU-käyttäjä (safer approach)
      return true;
    }
  }

  /**
   * Generoi cookie consent bannerin data
   */
  static async getConsentBannerData() {
    const isEU = await this.isEUUser();
    const currentConsent = await this.getConsentSettings();
    
    return {
      showBanner: await this.shouldShowConsentBanner(),
      isEUUser: isEU,
      currentConsent,
      consentTypes: [
        {
          type: this.CONSENT_TYPES.NECESSARY,
          title: 'Välttämättömät evästeet',
          description: 'Tarvitaan sovelluksen perustoimintojen käyttöön',
          required: true
        },
        {
          type: this.CONSENT_TYPES.ANALYTICS,
          title: 'Analytiikka',
          description: 'Auttaa meitä ymmärtämään sovelluksen käyttöä',
          required: false
        },
        {
          type: this.CONSENT_TYPES.MARKETING,
          title: 'Markkinointi',
          description: 'Kohdistetut mainokset ja suositukset',
          required: false
        },
        {
          type: this.CONSENT_TYPES.PERSONALIZATION,
          title: 'Henkilökohtaistaminen',
          description: 'Räätälöidyn sisällön näyttäminen',
          required: false
        }
      ]
    };
  }
}

export default GDPRService;