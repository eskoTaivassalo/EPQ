# Natiivit Kirjastot - Dokumentaatio

## MVP:n Natiivit Riippuvuudet
*Päivitetty: 16.11.2025*

Tämä dokumentti listaa kaikki sovelluksen natiivit kirjastot, niiden tarkoituksen ja konfiguraation.

---

## 🔐 Autentikointi & Turvallisuus

### @react-native-firebase/app (v23.4.1)
**Tarkoitus:** Firebase SDK:n ydinmoduuli, mahdollistaa yhteyden Firebase-palveluihin.
**Status:** ✅ Asennettu
**Käyttö:** Firebase-projektin alustus ja konfiguraatio
**Konfiguraatio:** 
- `google-services.json` (Android)
- Firebase config objekti koodissa

### @react-native-firebase/auth (v23.4.1)
**Tarkoitus:** Firebase Authentication - käyttäjien autentikointi
**Status:** ✅ Asennettu
**Käyttö:** 
- Email/password kirjautuminen
- Google Sign-In integraatio
- Session management
- Email verifiointi
**Tiedostot:** `src/services/authService.js`, `src/store/slices/authSlice.js`

### @react-native-firebase/firestore (v23.4.1)
**Tarkoitus:** Cloud Firestore tietokanta
**Status:** ✅ Asennettu
**Käyttö:**
- Käyttäjäprofiilit (users, teachers, parents)
- Varaukset (bookings)
- Viestit (messages)
- Arvostelut (reviews)
**Security Rules:** `firestore.rules` (deployattu tuotantoon)

### @react-native-firebase/storage (v23.4.1)
**Tarkoitus:** Firebase Cloud Storage - tiedostojen tallennus
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:**
- Profiilikuvien tallennus
- Liitteiden tallennus (tulevaisuudessa)
- Dokumenttien tallennus (tulevaisuudessa)
**Security Rules:** `storage.rules` (odottaa Blaze-aktivointia)

### @react-native-google-signin/google-signin (v16.0.0)
**Tarkoitus:** Google Sign-In -integraatio
**Status:** ✅ Asennettu ja toimii
**Käyttö:** Google-tilien autentikointi
**Konfiguraatio:**
- Web Client ID Firebase Consolesta
- SHA-1 ja SHA-256 sertifikaatit lisätty
- Plugin lisätty app.json:iin

---

## 📱 UI & Käyttöliittymä

### expo-image-picker (~17.0.8)
**Tarkoitus:** Kuvien valinta kamerasta tai galleriasta
**Status:** ✅ Asennettu
**Käyttö:** Profiilikuvien valinta ja lataus
**Permissions:**
- `CAMERA` (Android)
- `READ_MEDIA_IMAGES` (Android)
- `NSCameraUsageDescription` (iOS)
- `NSPhotoLibraryUsageDescription` (iOS)
**Plugin:** Konfiguroitu app.json:ssa

### expo-notifications (~0.32.12)
**Tarkoitus:** Push-notifikaatiot ja paikalliset ilmoitukset
**Status:** ✅ Asennettu ja konfiguroitu
**Käyttö:**
- Varausmuistutukset (5 min ennen)
- Uudet viestit
- Varausten tilailmoitukset
**Tiedostot:** `src/services/notificationService.js`
**Plugin:** Konfiguroitu app.json:ssa (icon, color, sounds)

### expo-status-bar (~3.0.8)
**Tarkoitus:** Statusbarin hallinta
**Status:** ✅ Asennettu
**Käyttö:** Statusbarin tyylin muokkaus (light/dark)

---

## 📅 Kalenteri & Varaukset

### @react-native-community/datetimepicker (8.4.4)
**Tarkoitus:** Natiivin päivämäärä- ja aikavalinnan UI-komponentti
**Status:** ✅ Asennettu
**Käyttö:** Varausaikojen valinta

### react-native-big-calendar (^4.7.0)
**Tarkoitus:** Kalenteri-näkymä päivittäisille ja viikoittaisille varauksille
**Status:** ✅ Asennettu (nykyinen kalenteri)
**Käyttö:** Opettajien ja vanhempien varauskalenterit
**Tiedostot:** `src/screens/shared/CalendarScreen.js`

### react-native-calendars (juuri asennettu)
**Tarkoitus:** Monipuolinen kalenteri-kirjasto vaihtoehto
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:** Mahdollinen parannettu kalenteri-UI tulevaisuudessa
**Ominaisuudet:**
- Kuukausinäkymä
- Päivän valinta
- Markkerin lisäys
- Mukautettavat teemat

### expo-calendar (juuri asennettu)
**Tarkoitus:** Pääsy laitteen natiiviin kalenteriin
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:** 
- Varausten synkronointi laitteen kalenteriin
- Kalenteritapahtumien luonti
**Permissions:**
- `READ_CALENDAR` (Android)
- `WRITE_CALENDAR` (Android)
- `NSCalendarsUsageDescription` (iOS)
**Plugin:** Konfiguroitu app.json:ssa

---

## 🗺️ Sijainti & Kartat

### react-native-maps (juuri asennettu)
**Tarkoitus:** Google Maps integraatio karttanäkymiin
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:**
- Opettajien sijaintien näyttö kartalla
- Lähistöllä olevien opettajien haku
**Konfiguraatio:**
- Google Maps API Key lisätty app.json:iin
- `config.googleMaps.apiKey` (Android)
- `config.googleMapsApiKey` (iOS)
**API Key:** AIzaSyBqGm4hqJYm5K8RK_cJ8pKqd_4HkGZpMXc

### expo-location (juuri asennettu)
**Tarkoitus:** Geolokatiivinen sijainti ja GPS
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:**
- Käyttäjän sijainnin haku
- Lähistöllä olevien opettajien laskenta
- Etäisyyden laskenta
**Permissions:**
- `ACCESS_FINE_LOCATION` (Android)
- `ACCESS_COARSE_LOCATION` (Android)
- `NSLocationWhenInUseUsageDescription` (iOS)
- `NSLocationAlwaysAndWhenInUseUsageDescription` (iOS)
**Plugin:** Konfiguroitu app.json:ssa

---

## 🎨 Media & Sisältö

### expo-av (juuri asennettu)
**Tarkoitus:** Audio ja video toisto
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:** 
- Ilmoitusäänien toisto
- Tulevaisuus: Video-oppitunnit, tallennetut viestit

### expo-contacts (juuri asennettu)
**Tarkoitus:** Pääsy laitteen kontakteihin
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:** 
- Tulevaisuus: Kutsu ystäviä sovellukseen
- Opettajien suosittelu kontakteille

---

## 🔗 Navigaatio & Deep Linking

### @react-navigation/stack (^7.4.10)
**Tarkoitus:** Stack-navigaatio screenien välillä
**Status:** ✅ Asennettu
**Käyttö:** Perus navigaatio-arkkitehtuuri
**Tiedostot:** `src/navigation/`

### @react-navigation/bottom-tabs (^7.4.9)
**Tarkoitus:** Bottom tab navigaatio
**Status:** ✅ Asennettu (ei vielä käytössä)
**Käyttö:** Tulevaisuus: Bottom navigation bar

### react-native-gesture-handler (~2.28.0)
**Tarkoitus:** Natiivi ele-käsittely (swipe, pan, pinch)
**Status:** ✅ Asennettu
**Käyttö:** React Navigation -riippuvuus, ele-perusteinen navigointi

### react-native-safe-area-context (~5.6.0)
**Tarkoitus:** Safe area insets (notch, statusbar, navbar)
**Status:** ✅ Asennettu
**Käyttö:** Responsiivinen layout eri laitteilla

### react-native-screens (~4.16.0)
**Tarkoitus:** Natiivi screen management
**Status:** ✅ Asennettu
**Käyttö:** Parempi suorituskyky navigaatiossa

### expo-linking (juuri asennettu)
**Tarkoitus:** Deep linking ja URL scheme
**Status:** ✅ Asennettu (juuri lisätty)
**Käyttö:**
- Syvälinkitys (esim. varausvahvistus sähköpostista)
- Video-linkit (Jitsi Meet)
- Share-toiminnallisuus

---

## 💾 Data & State Management

### @reduxjs/toolkit (^2.9.1)
**Tarkoitus:** Redux state management
**Status:** ✅ Asennettu ja käytössä
**Käyttö:**
- Auth state
- Bookings state
- Notifications state
- App data state
**Tiedostot:** `src/store/`

### react-redux (^9.2.0)
**Tarkoitus:** Redux-React integraatio
**Status:** ✅ Asennettu
**Käyttö:** Hooks (useSelector, useDispatch)

### redux-persist (^6.0.0)
**Tarkoitus:** Redux staten persistointi
**Status:** ✅ Asennettu (ei vielä konfiguroitu)
**Käyttö:** Tulevaisuus: Offline-tila, session persistointi

### redux-logger (^3.0.6)
**Tarkoitus:** Redux action logging kehityksessä
**Status:** ✅ Asennettu
**Käyttö:** Dev-työkalut, debuggaus

### @react-native-async-storage/async-storage (2.2.0)
**Tarkoitus:** Paikallinen key-value tallennus
**Status:** ✅ Asennettu
**Käyttö:**
- Session tracking
- Remember me -toiminto
- Cached data

---

## 🧰 Utilities

### @expo/vector-icons (^15.0.2)
**Tarkoitus:** Ikonikirjasto (MaterialIcons, FontAwesome, etc.)
**Status:** ✅ Asennettu
**Käyttö:** UI-ikonit kaikkialla sovelluksessa

### expo-dev-client (~6.0.17)
**Tarkoitus:** Development build -workflow
**Status:** ✅ Asennettu ja käytössä
**Käyttö:**
- Native module testing
- Hot reload natiiveilla kirjastoilla
- Google Sign-In testing

---

## 📦 Yhteenveto

### Asennetut Natiivit Kirjastot (Määrä: 25+)

#### Kriittiset MVP:lle:
1. ✅ Firebase (app, auth, firestore, storage)
2. ✅ Google Sign-In
3. ✅ Image Picker
4. ✅ Notifications
5. ✅ Calendar & Date Picker
6. ✅ Maps & Location
7. ✅ Navigation
8. ✅ Redux State Management

#### Tulevaisuutta varten:
- expo-av (media toisto)
- expo-contacts (kontaktit)
- expo-linking (deep linking)
- react-native-calendars (vaihtoehtoinen kalenteri)
- redux-persist (offline-tila)

---

## 🚀 Seuraavat Askeleet

### 1. EAS Build Konfiguraatio
- `eas.json` päivitettävä kaikilla uusilla kirjastoilla
- Development build uudelleen buildata

### 2. Testaus
- Testaa jokainen uusi natiivi kirjasto
- Varmista permissions-dialogit toimivat
- Testaa Android ja iOS

### 3. Dokumentaatio
- Päivitä README.md uusilla kirjastoilla
- Lisää setup-ohje jokaiselle natiivlle kirjastolle

### 4. Security
- Storage Rules deployment (odottaa Blaze)
- API Keys turvallisuus (env variables)

---

## 🔧 Buildin Vaatimat Komennot

```bash
# Rebuild development build uusilla natiiveilla kirjastoilla
eas build --profile development --platform android

# iOS build (kun tarvitaan)
eas build --profile development --platform ios

# Production build (tulevaisuudessa)
eas build --profile production --platform all
```

---

## ⚠️ Huomioitavaa

1. **Google Maps API Key** on kovakoodattu app.json:iin
   - Tuotannossa siirrettävä environment variableihin
   
2. **Firebase Storage Rules** odottaa Blaze-plania
   - Deployment 21.10.2025 tai kun Blaze aktivoitu

3. **redux-persist** asennettu mutta ei konfiguroitu
   - Tarvitsee konfiguraatio myöhemmin offline-tilaa varten

4. **Notification sounds/icons** puuttuvat
   - Lisättävä assets-kansioon:
     - `assets/notification-icon.png`
     - `assets/notification-sound.wav`

---

*Dokumentti luotu automaattisesti natiivien kirjastojen asennuksen yhteydessä*
