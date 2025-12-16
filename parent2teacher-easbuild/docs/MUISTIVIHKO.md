# Muistivihko - MVP Status & Kehityssuunnitelma

Päivitetty: 11.11.2025

---

## ✅ NYKYINEN MVP - MITÄ TOIMII TÄLLÄ HETKELLÄ

### 🏗️ **Tekninen Arkkitehtuuri**
- ✅ React Native + Expo setup
- ✅ Firebase Backend (Authentication, Firestore)
- ✅ Redux Toolkit state management
- ✅ React Navigation (Stack Navigator)
- ✅ Redux Persist (tilan tallennus)
- ✅ EAS Build konfiguraatio (Android)
- ✅ Docker-pohjainen local build
- ✅ Git version control (GitHub)

### 🔐 **Autentikointi & Turvallisuus**
- ✅ Email/password kirjautuminen
- ✅ **Google Sign-In kirjautuminen (KOODI VALMIS)** 🆕
  - Web Client ID konfiguroitu
  - LoginScreen sisältää Google-napin
  - Parannettu virheenkäsittely
  - SHA-sertifikaatit haettu
  - Odottaa: Firebase Console aktivointia
- ✅ Käyttäjärekisteröinti (Parent/Teacher)
- ✅ Email-verifiointi
- ✅ Salasanan resetointi
- ✅ Session management (timeout, token monitoring)
- ✅ Firebase Security Rules (Firestore)
- ✅ Firestore Indexes
- ✅ Tilin vanhenemisen hallinta (3 päivää vahvistamattomille)
- ✅ GDPR Service (backend valmis)
- ✅ Cookie Consent Banner (komponentti valmis, EI käytössä)

### 👤 **Käyttäjäroolit & Profiilit**

#### **Parent (Vanhempi)**
- ✅ Rekisteröityminen
- ✅ Profiilin luonti (nimi, yhteystiedot)
- ✅ Oma Dashboard
- ✅ Profiilin muokkaus (ParentMyProfileScreen)
- ✅ Opettajien haku
- ✅ Opettajaprofiilin katselu (ParentProfileScreen)

#### **Teacher (Opettaja)**
- ✅ Rekisteröityminen
- ✅ Profiilin luonti:
  - Nimi, yhteystiedot
  - Tuntihinta (€/h)
  - Kokemusvuodet
  - Bio/kuvaus
- ✅ Oma Dashboard
- ✅ Profiilin muokkaus (TeacherMyProfileScreen)
- ✅ Tag-systeemi:
  - Opetettavat aineet
  - Kielet
  - Sijainnit

### 🔍 **Opettajahaku (FindTeachersScreen)**
- ✅ Kaikkien opettajien listaus
- ✅ Tag-pohjainen suodatus:
  - Aiheittain (Math, English, Music, jne.)
  - Kielittäin (Finnish, English, Spanish, jne.)
  - Sijainneittain (Helsinki, Tampere, jne.)
- ✅ Opettajakorttien näyttö:
  - Nimi
  - Tagit (aineet, kielet, sijainnit)
  - Tuntihinta
  - Kokemus
- ✅ Hakutulosten optimointi

### 📱 **Näytöt (Screens)**

#### Auth-näytöt:
- ✅ WelcomeScreen (aloitus)
- ✅ LoginScreen (kirjautuminen)
- ✅ EmailVerificationScreen (vahvistus)

#### Parent-näytöt:
- ✅ ParentSignupScreen (rekisteröinti)
- ✅ ParentDashboard (etusivu)
- ✅ ParentMyProfileScreen (oman profiilin muokkaus)
- ✅ ParentProfileScreen (opettajan profiilin katselu)

#### Teacher-näytöt:
- ✅ TeacherSignupScreen (rekisteröinti)
- ✅ TeacherDashboard (etusivu)
- ✅ TeacherMyProfileScreen (oman profiilin muokkaus)

#### Shared-näytöt:
- ✅ FindTeachersScreen (opettajahaku)

#### Dev-näytöt:
- ✅ SecurityTestScreen (turvallisuustestaus)

### 🎨 **UI/UX**
- ✅ Common styles (yhteiset tyylit)
- ✅ Color scheme
- ✅ SafeAreaView (iOS/Android)
- ✅ Responsiivinen layout
- ✅ Tag selector -komponentti

### 📦 **Services & Utilities**
- ✅ authService.js (autentikointi)
- ✅ gdprService.js (GDPR-toiminnot, EI käytössä UI:ssa)
- ✅ securityService.js (turvallisuus)
- ✅ sessionManager.js (session hallinta)
- ✅ tagUtils.js (tag-työkalut)

### 🗂️ **Redux State Management**
- ✅ Auth Slice (autentikointi)
- ✅ AppData Slice (sovellusdata)
- ✅ Security Slice (turvallisuus)
- ✅ Auth Middleware
- ✅ Error Logging Middleware
- ✅ Custom Hooks:
  - useAuth
  - useAppData
  - useSecurity

### 📊 **Firestore Collections**
```
users/
  - {userId}/
    - role: "parent" | "teacher"
    - email, name, createdAt
    - accountStatus, lastLoginAt
    
teachers/
  - {teacherId}/
    - name, email, bio
    - hourlyRate, yearsOfExperience
    - subjects[], languages[], locations[]
    - createdAt, updatedAt

parents/
  - {parentId}/
    - name, email
    - createdAt, updatedAt
```

---

## ❌ MITÄ EI VIELÄ TOIMI (MVP:stä puuttuu)

### 🔴 Kriittiset puutteet:
- ❌ **Viestintä** - Ei chat/messaging-toimintoa
- ❌ **Varausjärjestelmä** - Ei ajanvaraus/booking-toimintoa
- ❌ **Arvostelut** - Ei review/rating-järjestelmää
- ❌ **Maksut** - Ei maksujärjestelmää
- ❌ **Push-notifikaatiot** - Ei ilmoituksia
- ❌ **Admin-paneeli** - Ei hallintanäkymää

### 🟡 UI/UX puutteet:
- ❌ **Google Sign-In** - Konfiguroitu mutta EI käytössä
- ❌ **Cookie Consent Banner** - Valmis mutta EI integroitu
- ❌ **GDPR Privacy Settings** - Ei UI:ta asetuksille
- ❌ **Profiilivalokuva** - Ei kuvan upload-toimintoa
- ❌ **Suosikki-opettajat** - Ei tallennustoimintoa
- ❌ **Hakuhistoria** - Ei tallenneta
- ❌ **Dark mode** - Ei tukea

### 🟢 Tekninen velka:
- ⚠️ **iOS-tuki** - Ei testattu, ei buildia
- ⚠️ **Storage Rules** - Ei deployattu (odotetaan Blaze)
- ⚠️ **Kattava testaus** - Redux/hooks testaamatta
- ⚠️ **Performance** - Ei optimoitu/mitattu
- ⚠️ **Error handling** - Rajallinen käyttäjäpalaute
- ⚠️ **Lokalisointi** - Vain englanti
- ⚠️ **Accessibility** - Ei WCAG-tukea

---

## 🎯 SEURAAVAT PRIORITEETIT (MVP+)

### 1. **Viestintä (Messaging)** - KRIITTINEN
Mahdollistaa yhteydenoton opettajan ja vanhemman välillä:
- Real-time chat (Firestore)
- Viestihistoria
- Lukuviestit
- Yksinkertainen UI

### 2. **iOS-tuki** - TÄRKEÄ
Mahdollistaa demoamisen iOS:llä:
- iOS build (EAS)
- iOS-emulaattori tai Appetize.io
- Platform-specific testing

### 3. **Google Sign-In aktivointi** - TÄRKEÄ
Helpottaa kirjautumista:
- OAuth-konfiguraatio
- UI-integraatio
- Error handling

### 4. **GDPR UI-integraatio** - COMPLIANCE
Privacy-asetusten näkyvyys:
- Cookie banner App.js:ssä
- Privacy Settings -sivu
- Tietojen lataus/poisto UI

---

## 💭 TULEVAISUUDEN LAAJENNUKSET (Post-MVP)

### Ammattilaiskunta-laajennus
**Idea:** Laajentaa "opettajat" kattamaan kaikki sosiaalisen työn ammattilaiset

### 1. Opettajahaku - Laajenna ammattilaisryhmiin (EI PRIORITEETTI)
**Tavoite:** Laajentaa sovellus kattamaan kaikki sosiaalisen työn ammattilaiset

#### Toteutettavat muutokset:
- [ ] Muuta "Teacher" → "Professional" / "Specialist"
- [ ] Lisää uudet ammattikategoriat:
  - Terapeutit (Therapists)
  - Spesialistit (Specialists)  
  - Kliiniset asiantuntijat (Clinicals)
  - Opettajat (Teachers)
  - Ohjaajat (Counselors)
  - Psykologit (Psychologists)
  
#### Tekniset tehtävät:
- [ ] Päivitä Firestore-skeema
  - Lisää `professionalType` kenttä
  - Lisää `specializations` array
  - Päivitä indeksit
  
- [ ] UI-muutokset:
  - FindTeachersScreen → FindProfessionalsScreen
  - Lisää ammattityyppi-suodatin
  - Päivitä hakutoiminnallisuus
  - Muokkaa tageja kattamaan uudet kategoriat
  
- [ ] Backend-muutokset:
  - Päivitä authService.js
  - Päivitä Firestore-kyselyt
  - Lisää uudet roolit
  
- [ ] Dokumentaatio:
  - Päivitä README
  - Päivitä PROJECT_PLAN.md
  - Luo migraatio-ohje olemassa oleville käyttäjille

#### Vaikutukset:
- Firestore collections: `teachers` → `professionals` tai lisää type-kenttä
- Navigation: päivitä reitit ja screen-nimet
- Redux: päivitä state-rakenne
- UI-tekstit: kaikki viittaukset "teacher" → "professional"

---

### 2. iOS-tuki ja emulaattori
**Tavoite:** Varmistaa sovelluksen toimivuus iOS:ssä ja mahdollistaa demot

#### Toteutettavat muutokset:
- [ ] iOS-buildin valmistelu
  - [ ] Asenna Xcode (Mac) tai käytä EAS Build
  - [ ] Konfiguroi iOS-bundle identifier
  - [ ] Määritä app.json iOS-asetukset
  - [ ] Luo Apple Developer -tili (tarvittaessa)
  
- [ ] Emulaattorin setup:
  - **Vaihtoehto A: iOS Simulator (Mac)**
    - Vaatii macOS
    - Xcode + iOS Simulator
    - Komento: `npx expo start --ios`
  
  - **Vaihtoehto B: EAS Build Preview (Suositus)**
    - Toimii Windowsilla
    - Luo .ipa-tiedosto
    - Testaa Expo Go:lla tai TestFlight
    - Komento: `eas build --platform ios --profile preview`
  
  - **Vaihtoehto C: Appetize.io**
    - Cloud-pohjainen iOS-emulaattori
    - Ei vaadi Mac:ia
    - Hyvä demoihin
    - https://appetize.io

#### Tekniset tehtävät:
- [ ] Päivitä app.json iOS-konfiguraatiolla:
  ```json
  "ios": {
    "bundleIdentifier": "com.parents2teachers.app",
    "supportsTablet": true,
    "infoPlist": {
      "NSCameraUsageDescription": "...",
      "NSPhotoLibraryUsageDescription": "..."
    }
  }
  ```

- [ ] Testaa iOS-spesifit ominaisuudet:
  - [ ] SafeAreaView (react-native-safe-area-context)
  - [ ] Google Sign-In iOS-konfiguraatio
  - [ ] Firebase iOS SDK
  - [ ] Navigationin toimivuus
  - [ ] Näppäimistön käyttäytyminen
  - [ ] Push-notifikaatiot (tulevaisuudessa)

- [ ] Luo iOS-build-profiilit:
  - Development
  - Preview (demo)
  - Production

- [ ] Dokumentaatio:
  - [ ] Luo iOS_BUILD_GUIDE.md
  - [ ] Päivitä iOS_CHECKLIST.md
  - [ ] Lisää demo-ohjeet

#### Huomioitavaa:
- Google Sign-In vaatii iOS-spesifiä konfiguraatiota
- Firebase iOS-konfiguraatio (GoogleService-Info.plist)
- Apple Developer Program maksaa $99/vuosi (production)
- TestFlight-jakelu vaatii Apple Developer -tilin
- Expo Go ilmainen testaukseen kehitysvaiheessa

---

---

### Muut laajennusideat (Post-MVP):

#### Maksujärjestelmä
- Stripe/PayPal-integraatio
- Tuntihinnoittelu ja laskutus
- **Status:** Ei prioriteetti MVP:lle

#### Kalenteriintegraatio
- Google Calendar sync
- Ajanvarauksen hallinta
- **Status:** Tulevaisuuden feature

#### Admin-paneeli
- Käyttäjien hallinta
- Moderointi
- Analytiikka
- **Status:** Tarvitaan skaalautuvuuden myötä

#### Lokalisointi
- Moninkertainen kielituki (suomi, englanti, muut)
- i18n-kirjasto
- **Status:** Tulevaisuuden feature

#### Analytics
- Käyttäjäkäyttäytyminen
- Conversion tracking
- **Status:** Tulevaisuuden feature

---

## 📝 Tekniset päätökset & muistiinpanot

### Prioriteettijärjestys (nyt):
1. **Viestintä** - Mahdollistaa yhteydenoton (core feature)
2. **iOS-tuki** - Demot ja laajempi käyttäjäkunta
3. **Google Sign-In** - Parempi UX
4. **GDPR UI** - Compliance

### Avoinna olevat kysymykset:
- Tarvitaanko varausjärjestelmä heti vai riittääkö viestintä?
- Miten turvallinen viestintä toteutetaan?
- Milloin maksujärjestelmä on prioriteetti?

### Tekniset valinnat:
- **Messaging:** Firestore real-time vs. Socket.io?
- **iOS:** EAS Build vs. local Xcode?
- **Storage:** Milloin Blaze-plan aktivoidaan?

---

## 🔗 Liittyvät dokumentit
- [APP_OVERVIEW.md](./APP_OVERVIEW.md) - Sovelluksen yleiskatsaus
- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Projektinhallinta
- [iOS_CHECKLIST.md](./iOS_CHECKLIST.md) - iOS-asiat
- [GDPR_IMPLEMENTATION_STATUS.md](./GDPR_IMPLEMENTATION_STATUS.md) - GDPR-status
- [FIREBASE_SECURITY_RULES.md](./FIREBASE_SECURITY_RULES.md) - Turvallisuussäännöt
