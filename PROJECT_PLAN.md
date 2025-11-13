# Parents&Teachers App - Trello Suunnitelma
## 2025-11-13 ✅ Google Authentication VALMIS
- **Google Sign-In integraatio TOIMII** 🎉
  - ✅ @react-native-google-signin/google-signin v16.0.0 asennettu
  - ✅ Firebase Console konfiguroitu (Web Client ID)
  - ✅ SHA-1 ja SHA-256 sertifikaatit lisätty Firebase Consoleen
  - ✅ Development Build -workflow käytössä (hot reload toimii)
  - ✅ Google-autentikointi flow korjattu:
    1. Käyttäjä klikkaa "Continue with Google"
    2. Google-tiedot haetaan (EI vielä Firebase-autentikointia)
    3. Signup-lomake aukeaa esitäytettynä (email, nimi)
    4. Käyttäjä täyttää loput tiedot (bio, tags, jne.)
    5. Lomakkeen lähetys → Firebase-autentikointi + Firestore-profiili luodaan
  - ✅ Salasanakentät piilotettu Google-käyttäjiltä
  - ✅ Google info -laatikko lisätty signup-lomakkeisiin
  - ✅ authService.js: `getGoogleUserInfo()` ja `signInWithGoogleToken()` funktiot
  - ✅ authSlice.js: Google-käyttäjien tunnistus `registerUser()`-funktiossa
  - ✅ "email-already-in-use" -ongelma korjattu
  - ✅ Show/Hide password -toiminto lisätty (silmä-ikoni)
  - ⚠️ **TUNNETTU ONGELMA (MVP):** Salasanakentän bulletit eivät näy Huawei Honor 7 -laitteella
    - Syy: Laitteeseen liittyvä Android-bugi vanhemmissa laitteissa
    - Workaround: Show/hide password -painike lisätty
    - Korjaus: Seuraavassa versiossa (v1.1) - custom font tai erikoismerkit

## 2025-10-24
- EAS build tehty, sovellus toimii nyt itsenäisenä kokonaisuutena.
- Dockerin avulla buildit tehdään paikallisesti, eivät kuluta Expo-palvelun quota-rajaa. Docker-buildit voi tehdä rajattomasti omalla koneella.
## 8 viikon kehitys- ja julkaisusuunnitelma

---

## ✅ VALMIIT TYÖT (Päivitetty 19.10.2025)

### 🎯 Arkkitehtuuri & State Management
- [x] **Redux Toolkit migraatio VALMIS** - Context API korvattu Redux Toolkitilla
  - Redux store luotu (`src/store/index.js`)
  - Auth slice toteutettu (`src/store/slices/authSlice.js`)
  - AppData slice toteutettu (`src/store/slices/appDataSlice.js`)
  - Security slice toteutettu (`src/store/slices/securitySlice.js`)
  - Redux middleware: authMiddleware ja errorLoggingMiddleware
  - Redux DevTools integraatio
  - Redux-persist integroitu (PersistGate lisätty App.js:iin)
  - Memoized selectors (createSelector) Redux-varoitusten korjaamiseksi
  - ⚠️ **TARVITSEE: Kokonaisvaltainen testaus**
- [x] **Custom Hooks refaktorointi**
  - `useAuth` hook - Autentikointi
  - `useAppData` hook - Data management (React.useCallback lisätty)
  - `useSecurity` hook - Turvallisuus
  - ⚠️ **TARVITSEE: Integration testing**
- [x] **Context arkkitehtuuri optimointi**
  - Context API poistettu Redux Toolkitin hyväksi
  - Vanhat context-tiedostot poistettu (AppDataContext, AuthContext, SecurityContext)
  - ⚠️ **TARVITSEE: Performance benchmarking**
  - ⚠️ **TARVITSEE: Memory leak testing**

### 🔐 Autentikointi & Turvallisuus
- [x] Firebase autentikointi integraatio (perusteet)
- [x] Email/password kirjautuminen
- [x] **Google Sign-In integraatio** ✅ (13.11.2025)
  - ✅ Google-kirjautuminen toimii end-to-end
  - ✅ Pre-filled signup forms Google-käyttäjille
  - ✅ Firebase Authentication + Firestore profile creation
  - ✅ Development Build workflow
- [x] Käyttäjäroolit (Parent/Teacher)
- [x] Email-verifiointi
- [x] Salasanan resetointi toiminnallisuus (authService.js)
- [x] GDPR-yhteensopivuus perusteet
- [x] Cookie consent banner
- [x] Tilin vanhenemisen hallinta (120 päivää)
- [x] Security service luotu
- [x] **Firebase Security Rules luotu ja dokumentoitu** ✅ (20.10.2025)
  - ✅ Firestore rules DEPLOYATTU tuotantoon
  - ✅ Firestore indexes DEPLOYATTU tuotantoon
  - ⏳ Storage rules luotu (deployment 21.10.2025)
  - ✅ Composite indexes määritelty
  - ✅ Kattava dokumentaatio (FIREBASE_SECURITY_RULES.md)
  - ✅ Deployment-ohjeisto (FIREBASE_DEPLOYMENT.md)
- [x] **Session Management** ✅ (20.10.2025)
  - ✅ SessionManager luotu (timeout, token monitoring, remember me)
  - ✅ Redux integraatio valmis
  - ✅ useAuth hook päivitetty
  - ✅ SESSION_MANAGEMENT.md dokumentaatio
  - ⏳ UI komponentit puuttuvat
  - ⏳ Testaus vaaditaan
- [ ] **Storage Rules deployment** - Odottaa Blaze-aktivointia (24h)
- [ ] **Session Management UI** - Remember me checkbox
- [ ] **Security testing** - Rules + Session toimivuus

### 👤 Profiilienhallinta
- [x] Opettajaprofiilien luonti ja hallinta
- [x] Vanhempien profiilien luonti ja hallinta
- [x] Tag-systeemi (aineet, kielet, sijainnit)
- [x] Profiilin muokkaus näkymät
- [x] Tuntihinta ja kokemus kentät

### 🔍 Opettajahaku
- [x] Hakutoiminnallisuus opettajille
- [x] Tag-pohjainen suodatus (aineet, kielet, sijainnit)
- [x] Opettajakorttien näyttö
- [x] Hakutulosten optimointi
- [x] **Opettajien nimien näkyvyys korjattu** (name-kenttä tuki)

### 📱 Käyttöliittymä
- [x] WelcomeScreen - Aloitusnäyttö
- [x] LoginScreen - Kirjautumisnäyttö
- [x] Parent/Teacher SignupScreen - Rekisteröityminen
- [x] Parent/Teacher Dashboard - Käyttäjän etusivu
- [x] FindTeachersScreen - Opettajahaku
- [x] Profile screens - Profiilien näyttö
- [x] Common styles - Yhteiset tyylit
- [x] **Screens kansiorakenne uudelleenjärjestelty**
  - Alakansiot: `auth/`, `parent/`, `teacher/`, `shared/`, `dev/`
  - Import-polut päivitetty `../../` rakenteeseen
  - Auth-screenit siirretty ja korjattu (LoginScreen, EmailVerificationScreen)
- [ ] **IN PROGRESS: TeacherProfile-screenit yhdistäminen**
  - TeacherMyProfileScreen + TeacherProfileScreen → yksi screen (view+edit toggle)
  - Tavoite: vähentää duplikaatiota

### 🛠️ Tekninen infrastruktuuri
- [x] Firebase projekti konfiguroitu
- [x] Firestore tietokanta
- [x] Firebase Authentication
- [x] React Navigation setup
- [x] Expo projekti konfiguraatio
- [x] Git repository luotu (GitHub)
- [x] Branch management (master & tiedostot-ja-rakenne)
- [x] Redux Toolkit dependencies asennettu
- [x] Demo-data opettajille ja vanhemmille

### 📝 Dokumentaatio
- [x] README.md päivitetty
- [x] PROJECT_PLAN.md luotu
- [x] REDUX_MIGRATION_SUMMARY.md luotu
- [x] CONTEXT_ARCHITECTURE_PLAN.md
- [x] CONTEXT_REFACTORING_SUMMARY.md
- [x] Firebase konfiguraatio dokumentoitu

---

### 📋 Trello Board Rakenne:
1. **BACKLOG** - Kaikki tulevat tehtävät
2. **WEEK 1-2** - Toiminnallisuuden viimeistely
3. **WEEK 3-4** - UI/UX parannus & testaus
4. **WEEK 5-6** - Julkaisuvalmistelu
5. **WEEK 7-8** - Julkaisu & tuotantovaihe
6. **IN PROGRESS** - Käynnissä olevat tehtävät
7. **TESTING** - Testattavana olevat ominaisuudet
8. **DONE** - Valmiit tehtävät

---

## 📅 VIIKKO 1-2: TOIMINNALLISUUDEN VIIMEISTELY
*Tavoite: Kaikki ydinominaisuudet toimivat virheettömästi*

### 📌 Viikko 1 (Päivät 1-5) - MA-PE

#### Maanantai: Autentikointi & Turvallisuus
- [x] **Firebase Security Rules auditointi ja parannus** ✅ VALMIS! (20.10.2025)
  - `firestore.rules` luotu (users, teachers, parents, messages, reviews, bookings)
  - `storage.rules` luotu (profiilikuvat, liitteet, dokumentit)
  - `firebase.json` konfiguroitu
  - `firestore.indexes.json` luotu (7 composite indexiä)
  - `FIREBASE_SECURITY_RULES.md` dokumentaatio luotu
  - ✅ Firestore Rules DEPLOYATTU tuotantoon
  - ✅ Firestore Indexes DEPLOYATTU
  - ⏳ Storage Rules odottaa (Blaze-laskutus 24h, yritetään 21.10.2025)
- [x] Salasanan resetointi toiminnallisuus (authService.js)
- [x] Email-verifiointi pakolliseksi rekisteröinnissä
- [x] **Session management parannus** ✅ VALMIS! (20.10.2025)
  - ✅ SessionManager luotu (`src/utils/sessionManager.js`)
  - ✅ Session timeout (30 min inaktiivisuus)
  - ✅ Firebase token monitoring (5 min interval)
  - ✅ Remember me -toiminnallisuus (30 päivää)
  - ✅ Activity tracking (AsyncStorage)
  - ✅ Redux authSlice integraatio (4 uutta thunkia)
  - ✅ useAuth hook päivitetty (session functions)
  - ✅ SESSION_MANAGEMENT.md dokumentaatio (400+ riviä)
  - ⏳ UI komponentit puuttuvat (Remember me checkbox)
  - ⏳ Testaus vaaditaan (Unit + Integration tests)

#### Tiistai: Profiilienhallinta
- [ ] Profiilikuvien lisäys (Firebase Storage)
- [ ] Profiilitietojen validointi parannus (Perusteet tehty, tarvitsee testaus)
- [x] Tag-systeemin optimointi (Tehty constants/tags.js)
- [ ] "Edit Profile" UX parannus

#### Keskiviikko: Opettajahaku & Suodatus
- [ ] Hakutoiminnon optimointi (performance) - Osittain, tarvitsee testaus
- [x] Lisää suodatusvaihtoehtoja (aineet, kielet, sijainnit) - TagSelector toteutettu
- [ ] Karttanäkymä opettajien sijaintiin
- [ ] Favoriitin lisäys/poisto toiminnallisuus

#### Torstai: Viestintäjärjestelmä
- [ ] In-app viestintäjärjestelmä (Firebase Firestore)
- [ ] Push-notifikaatiot viesteille
- [ ] Viestien tila-indikaattorit (lähetetty/luettu)
- [ ] Keskusteluhistorian hallinta

#### Perjantai: Varausjärjestelmä & Arvostelut
- [ ] Tuntien varausjärjestelmä opettajilta
- [ ] Kalenteri-integraatio
- [ ] Opettajien arvostelu tähtijärjestelmä
- [x] Viikon 1 testaus ja bugien korjaus (Opettajien nimien korjaus)

### 📌 Viikko 2 (Päivät 6-10) - MA-PE

#### Maanantai: Notifikaatiot & Offline-toiminnallisuus
- [ ] Push-notifikaatioiden konfigurointi (Expo Notifications)
- [ ] Email-notifikaatiot tärkeistä tapahtumista
- [ ] AsyncStorage optimointi
- [ ] Offline-tilan käsittely

#### Tiistai: Admin-paneeli & Tietoturva
- [ ] Admin-roolin luonti Firebase:ssä
- [ ] Admin-dashboard perustoiminnot
- [ ] GDPR-yhteensopivuus
- [ ] Privacy Policy & Terms of Service sivut

#### Keskiviikko: Performance optimointi
- [ ] Bundle size optimointi (Redux asennettu mutta mittaus puuttuu)
- [ ] Image optimization
- [ ] Lazy loading toteutus
- [ ] Memory leakien tarkistus (Tarvitsee testaus)

#### Torstai: API optimointi & Error handling
- [ ] Firebase queryt optimointi (Perusteet tehty, optimointi puuttuu)
- [ ] Caching strategioiden parannus (Redux-persist asennettu, ei konfiguroitu)
- [ ] Error handling parannus (Middleware tehty, tarvitsee testaus)
- [ ] Retry mechanismit

#### Perjantai: Integration Testing
- [ ] Kaikkien viikon 1-2 ominaisuuksien testaus
- [ ] Integration testing
- [ ] User acceptance testing pohjatyö
- [ ] Dokumentaation päivitys

---

## 📅 VIIKKO 3-4: UI/UX PARANNUS & TESTAUS
*Tavoite: Käyttäjäkokemus on saumaton ja visuaalisesti houkutteleva*

### 📌 Viikko 3 (Päivät 11-15) - MA-PE

#### Maanantai: Design System
- [ ] Yhtenäisen väripaletin vahvistus
- [ ] Typography-sääntöjen standardointi
- [ ] Component library dokumentointi
- [ ] Accessibility guidelines

#### Tiistai: Käyttöliittymän kiillotus
- [ ] Animaatioiden lisäys (React Native Reanimated)
- [ ] Smooth transitions sivujen välillä
- [ ] Loading states parannus
- [ ] Error states parannus

#### Keskiviikko: Responsiivisuus & Käytettävyys
- [ ] Tablet-tuki
- [ ] Erilaisten näyttökokojen tuki
- [ ] A/B testauksen setup
- [ ] User journey mapping

#### Torstai: Saavutettavuus
- [ ] Screen reader tuki
- [ ] Keyboard navigation
- [ ] Color contrast parannus
- [ ] Voice over tuki

#### Perjantai: Kielikäännökset & UI Testaus
- [ ] i18n setup (react-native-localize)
- [ ] Suomi/Englanti käännökset
- [ ] UI/UX testauksen koonti
- [ ] Cross-platform testing

### 📌 Viikko 4 (Päivät 16-20) - MA-PE

#### Maanantai: Automated Testing
- [ ] Jest unit testien lisäys
- [ ] Detox E2E testien setup
- [ ] Component testing (React Native Testing Library)
- [ ] API testing

#### Tiistai: Manual & Security Testing
- [ ] Comprehensive manual test cases
- [ ] Regression testing
- [ ] Penetration testing
- [ ] API security audit

#### Keskiviikko: Load Testing & Performance
- [ ] Firebase performance testing
- [ ] Concurrent user testing
- [ ] Database optimization
- [ ] CDN setup harkinta

#### Torstai: Bug Fixing Sprint
- [ ] Critical bugs korjaus
- [ ] Performance issues korjaus
- [ ] UI/UX issues korjaus
- [ ] Security issues korjaus

#### Perjantai: Beta Testing Setup
- [ ] TestFlight setup (iOS)
- [ ] Google Play Internal Testing (Android)
- [ ] Beta version release
- [ ] Beta tester rekrytointi

---

## 📅 VIIKKO 5-6: JULKAISUVALMISTELU
*Tavoite: Sovellus on valmis store-julkaisuun*

### 📌 Viikko 5 (Päivät 21-25) - MA-PE

#### Maanantai: Store Assets
- [ ] App icon suunnittelu (1024x1024)
- [ ] Screenshots eri laitteille
- [ ] App Store/Play Store kuvaukset
- [ ] Privacy Policy finalisointi

#### Tiistai: App Store Connect & Google Play
- [ ] iOS App Store Connect setup
- [ ] Google Play Developer account
- [ ] Metadata täyttö molempiin
- [ ] Age/Content rating selvitys

#### Keskiviikko: Production Environment
- [ ] Firebase production project
- [ ] Environment variables config
- [ ] Production build testing
- [ ] Performance monitoring setup

#### Torstai: Analytics & Monitoring
- [ ] Firebase Analytics tuotantoon
- [ ] Crashlytics integration
- [ ] Performance monitoring
- [ ] User behavior tracking

#### Perjantai: Legal & Compliance
- [ ] Terms of Service review
- [ ] GDPR compliance check
- [ ] Production build testing
- [ ] Store submission test run

### 📌 Viikko 6 (Päivät 26-30) - MA-PE

#### Maanantai: Marketing Content
- [ ] Marketing materials
- [ ] Website landing page
- [ ] Social media assets
- [ ] Press release draft

#### Tiistai: SEO & ASO
- [ ] App Store Optimization (ASO)
- [ ] Google Play Store optimization
- [ ] Social media accounts
- [ ] Website SEO

#### Keskiviikko: Beta Feedback Integration
- [ ] Beta tester feedback analyysi
- [ ] Critical feedback implementation
- [ ] UI/UX final touches
- [ ] Performance final optimization

#### Torstai: Final Testing & Release Candidate
- [ ] End-to-end testing
- [ ] Device compatibility final check
- [ ] Release candidate build
- [ ] Internal team testing

#### Perjantai: Store Submission Prep
- [ ] Final metadata check
- [ ] Screenshots final review
- [ ] Launch strategy finalization
- [ ] Submission timeline planning

---

## 📅 VIIKKO 7-8: JULKAISU & TUOTANTOVAIHE
*Tavoite: Sovellus livenä markkinoilla ja toimiva tuki*

### 📌 Viikko 7 (Päivät 31-35) - MA-PE

#### Maanantai: Store Submissions
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Submission tracking setup
- [ ] Review process monitoring

#### Tiistai: Launch Preparation
- [ ] Launch day timeline
- [ ] Customer support setup
- [ ] FAQ documentation
- [ ] Troubleshooting guides

#### Keskiviikko: Marketing Launch & Monitoring
- [ ] Website live
- [ ] Social media campaign
- [ ] Real-time monitoring setup
- [ ] User acquisition tracking

#### Torstai: Store Review Process
- [ ] App Store review follow-up
- [ ] Play Store review follow-up
- [ ] Review feedback addressing
- [ ] Resubmission if needed

#### Perjantai: Soft Launch
- [ ] Limited market release
- [ ] User feedback monitoring
- [ ] Performance metrics analysis
- [ ] Launch metrics review

### 📌 Viikko 8 (Päivät 36-40) - MA-PE

#### Maanantai: Full Launch
- [ ] Global availability
- [ ] Marketing campaign full scale
- [ ] Community management
- [ ] PR activities

#### Tiistai: User Support & Optimization
- [ ] Customer support queries
- [ ] Bug reports handling
- [ ] Real user data analysis
- [ ] Performance bottleneck fixes

#### Keskiviikko: Feature Planning & Business Metrics
- [ ] User feedback analysis
- [ ] Feature prioritization
- [ ] User acquisition analysis
- [ ] Retention rate analysis

#### Torstai: Growth Strategy & Planning
- [ ] Revenue tracking setup
- [ ] Growth strategy planning
- [ ] Version 1.1 planning
- [ ] Future development planning

#### Perjantai: Project Evaluation & Retrospective
- [ ] Success metrics evaluation
- [ ] Project retrospective meeting
- [ ] Lessons learned documentation
- [ ] Celebration & recognition

---

## 📊 MILESTONES & SUCCESS METRICS

### 🎯 Viikko 2 Milestone (1.11.2025):
- ✅ Kaikki ydinominaisuudet toimivat
- ✅ 90% test coverage
- ✅ No critical bugs

### 🎯 Viikko 4 Milestone (15.11.2025):
- ✅ Beta version released
- ✅ 10+ beta testers feedback
- ✅ Performance targets met

### 🎯 Viikko 6 Milestone (29.11.2025):
- ✅ Store-ready build
- ✅ All compliance requirements met
- ✅ Marketing materials ready

### 🎯 Viikko 8 Milestone (13.12.2025):
- ✅ App live in stores
- ✅ 100+ downloads first week
- ✅ <5% crash rate
- ✅ 4+ star rating

---

## 🔧 TYÖKALUT & RESURSSIT

### Development:
- **VS Code** - Kehitysympäristö
- **Expo** - React Native framework
- **Firebase** - Backend services
- **Git** - Version control

### Testing:
- **Jest** - Unit testing
- **Detox** - E2E testing
- **Firebase Test Lab** - Device testing
- **TestFlight/Play Console** - Beta testing

### Project Management:
- **Trello** - Task management
- **Slack** - Communication
- **Google Analytics** - App analytics
- **Crashlytics** - Crash reporting

### Design:
- **Figma** - UI/UX design
- **Adobe Creative Suite** - Assets
- **Unsplash** - Stock photos
- **Canva** - Marketing materials

---

## ⚡ RISKIT & MITIGAATIO

### Korkean riskin alueet:
1. **Store Review Process** (1-7 päivää viive)
   - Mitigaatio: Early submission, compliance check

2. **Firebase Scaling Issues**
   - Mitigaatio: Load testing, monitoring setup

3. **Legal Compliance Issues**
   - Mitigaatio: Legal review, compliance audit

4. **User Adoption Challenges**
   - Mitigaatio: Marketing strategy, user testing

### Aikataulu riskit:
- **Buffer time** varattu jokaiselle viikolle
- **Critical path tracking** jatkuvasti
- **Resource reallocation** tarpeen mukaan

---

## 📈 POST-LAUNCH SUUNNITELMA

### Viikot 9-10 (Joulukuu 2025):
- User feedback integration
- Performance optimization  
- Feature updates (v1.1)
- Market expansion planning

### Viikot 11-12 (Tammikuu 2026):
- Advanced features development
- Monetization optimization
- Partnership development
- Team scaling planning

---

## ⏰ TYÖAIKA ARVIO

**Yhteensä:** 8 viikkoa × 5 päivää = **40 työpäivää**
**Arvioitu työmäärä:** 40 × 8h = **320 työtuntia**
**Kokonaisaika:** 2 kuukautta (viikonloput vapaita)

**Päivittäinen rytmi:**
- 09:00-12:00: Focused development (3h)
- 12:00-13:00: Lunch break
- 13:00-16:00: Development continues (3h)  
- 16:00-17:00: Testing & documentation (1h)
- 17:00-18:00: Planning & communication (1h)

*Tämä suunnitelma on elävä dokumentti ja päivittyy projektin edetessä. Jokainen milestone tarkistetaan ja tarvittaessa mukautetaan.*