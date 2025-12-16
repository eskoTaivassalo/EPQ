# GDPR Integration Quick Guide

## 🎯 Tavoite
Integroida valmis `CookieConsentBanner` komponentti sovellukseen.

## ⏱️ Arvioitu aika: 15-30 minuuttia

---

## 📝 VAIHE 1: App.js Integration

### Lisää importit App.js:ään (rivin 1-10 jälkeen):

```javascript
import CookieConsentBanner from './src/components/CookieConsentBanner';
import GDPRService from './src/services/gdprService';
```

### Päivitä AppContent komponentti:

```javascript
const AppContent = () => {
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  // Tarkista näytetäänkö GDPR consent banner
  useEffect(() => {
    const checkConsent = async () => {
      try {
        const shouldShow = await GDPRService.shouldShowConsentBanner();
        setShowConsentBanner(shouldShow);
      } catch (error) {
        console.error('Error checking consent banner:', error);
      }
    };
    
    checkConsent();
  }, []);

  const handleConsentGiven = async (consents) => {
    console.log('✅ User consents saved:', consents);
    setShowConsentBanner(false);

    // Jos analytics-suostumus annettu, voi initata analytics
    if (consents.analytics) {
      console.log('📊 Analytics consent given - can initialize analytics');
      // await initializeAnalytics();
    }

    // Jos marketing-suostumus annettu
    if (consents.marketing) {
      console.log('📢 Marketing consent given');
      // await initializeMarketing();
    }
  };

  return (
    <>
      <AppNavigator />
      {showConsentBanner && (
        <CookieConsentBanner onConsentGiven={handleConsentGiven} />
      )}
    </>
  );
};
```

---

## 📝 VAIHE 2: Privacy Settings Screen (Valinnainen)

### Luo uusi tiedosto: `src/screens/shared/PrivacySettingsScreen.js`

```javascript
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GDPRService from '../../services/gdprService';
import { colors } from '../../styles/commonStyles';

const PrivacySettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [consents, setConsents] = useState(null);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const current = await GDPRService.getConsentSettings();
      setConsents(current);
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export Your Data',
      'Download all your data in JSON format?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            setLoading(true);
            try {
              const data = await GDPRService.exportUserData();
              
              // Tallenna tiedostoon tai lähetä emailiin
              console.log('Exported data:', data);
              
              Alert.alert(
                'Success',
                'Your data has been exported. Check console for data.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete all your data. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Navigate to password confirmation screen
            // Or show password input dialog
            Alert.alert(
              'Confirm',
              'Please contact support to delete your account',
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Data</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Cookie Consents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍪 Cookie Preferences</Text>
          {consents && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Analytics: {consents.analytics ? '✅ Allowed' : '❌ Blocked'}
              </Text>
              <Text style={styles.infoText}>
                Marketing: {consents.marketing ? '✅ Allowed' : '❌ Blocked'}
              </Text>
              <Text style={styles.infoText}>
                Last updated: {new Date(consents.timestamp).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Data Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Export Your Data</Text>
          <Text style={styles.description}>
            Download all your personal data in JSON format
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleExportData}
            disabled={loading}
          >
            <Ionicons name="download-outline" size={20} color={colors.white} />
            <Text style={styles.buttonText}>
              {loading ? 'Exporting...' : 'Export Data'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗑️ Delete Account</Text>
          <Text style={styles.description}>
            Permanently delete your account and all data
          </Text>
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Policy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Privacy Policy</Text>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Read Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 12,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  linkText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default PrivacySettingsScreen;
```

### Lisää route App.js:ään:

```javascript
// Import
import PrivacySettingsScreen from './src/screens/shared/PrivacySettingsScreen';

// Add to both Teacher and Parent stacks:
<Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
```

---

## 📝 VAIHE 3: Lisää linkki profiileihin

### TeacherMyProfileScreen.js & ParentMyProfileScreen.js:

Lisää navigointilinkki:

```javascript
<TouchableOpacity
  style={styles.settingItem}
  onPress={() => navigation.navigate('PrivacySettings')}
>
  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
  <Text style={styles.settingText}>Privacy & Data</Text>
  <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
</TouchableOpacity>
```

---

## ✅ Testaus

### 1. Käynnistä app:
```bash
npm start
```

### 2. Tarkista konsoli:
- Näkyykö "Should show banner: true/false"
- Tallennuuko consent AsyncStorageen

### 3. Testaa UI:
- [ ] Banner näkyy kun ei ole tallennettuja asetuksia
- [ ] "Accept All" tallentaa kaikki suostumukset
- [ ] "Reject Optional" tallentaa vain pakolliset
- [ ] "Customize" avaa detailed modal
- [ ] Toggles toimivat (paitsi required)
- [ ] "Save Settings" tallentaa ja sulkee

### 4. Testaa Privacy Settings:
- [ ] Export data toimii
- [ ] Konsoli näyttää exported datan
- [ ] Cookie preferences näkyvät

---

## 🎯 Valmista!

GDPR-toteutus on nyt täysin integroitu ja toiminnassa. Käyttäjät näkevät consent bannerin ja voivat hallita tietojaan.

### Seuraavat parannukset:
1. Email data export sijaan console.log
2. Password confirmation account deletion:ssa
3. Privacy policy -sivu (markdown tai webview)
4. Analytics integration consent-tarkistuksilla

