# Parents & Teachers App

🌍 **Globaali mobiilisovellus** opettajille ja vanhemmille - yhdistää opetuksen ammattilaisia ja perheiden tarpeita maailmanlaajuisesti.

## ✨ Ominaisuudet

### 👨‍� Opettajille
- **📋 Opettajaprofiili**: Luo kattava profiili osaamisalueistasi ja kokemuksestasi
- **🌍 Globaali näkyvyus**: Tarjoa palveluitasi maailmanlaajuisesti
- **💰 Hinnoittelu**: Aseta omat tuntihinnat ja maksuehdot
- **📅 Saatavuus**: Määritä verkko- ja lähiopetuksen saatavuus
- **⭐ Arvostelut**: Kerää asiakaspalautetta ja rakenna mainetta
- **💬 Viestit**: Keskustele vanhempien kanssa suoraan sovelluksessa

### 👨‍👩‍👧‍👦 Vanhemmille
- **🔍 Opettajien haku**: Löydä parhaita opettajia maailmanlaajuisesti
- **🎯 Älykkäät suodattimet**: Hae aiheittain, hinnan mukaan tai sijainnin perusteella
- **📊 Arvostelut ja palautteet**: Lue muiden vanhempien kokemuksia
- **❤️ Suosikit**: Tallenna parhaat opettajat helposti
- **📞 Suora yhteydenotto**: Ota yhteyttä opettajiin välittömästi
- **🔒 Turvallinen ympäristö**: Varmistetut profiilit ja turvallinen viestintä

## 🛡️ Edistyneet turvallisuusominaisuudet

### � Pakollinen sähköpostivahvistus
- **✅ Email verification**: Kaikki käyttäjät vahvistavat sähköpostinsa ennen sovelluksen käyttöä
- **⏰ Automaattinen tunnistus**: Sovellus havaitsee vahvistuksen automaattisesti
- **🔄 Uudelleenlähetys**: Helppo vahvistusviestin uudelleenlähetys 60s cooldown:lla
- **⚠️ Account expiration**: Vahvistamattomat tilit poistetaan automaattisesti 3 päivän kuluttua

### 🔐 Salasanan turvallisuus
- **💪 Reaaliaikainen vahvuusmittari**: Näkyvä strength indicator kirjoittaessa
- **📏 Tiukat vaatimukset**: Vähintään 6 merkkiä, isoja ja pieniä kirjaimia, numerot
- **🎨 Visuaalinen palaute**: Värikoodattu palaute (heikko/keskinkertainen/vahva)
- **⚡ Client-side validointi**: Välitön palaute ennen lähetystä

### 🛡️ Input sanitization & Security
- **🧹 XSS-suojaus**: Kaikki käyttäjäsyötteet sanitoidaan
- **💉 SQL injection esto**: Turvallinen tietokantakäsittely
- **⏱️ Rate limiting**: Automaattinen väärinkäytön esto
- **🔒 GDPR compliance**: Tietosuoja-asetuksen mukainen toteutus

## 🚀 Teknologia

### Frontend
- **React Native** & **Expo** - Cross-platform mobiilisovellus
- **React Navigation 6** - Saumaton navigointi
- **AsyncStorage** - Paikallinen tallennustila
- **Expo Vector Icons** - Kattava ikonikirjasto

### Backend & Authentication
- **Firebase Authentication** - Turvallinen käyttäjien hallinta
- **Firestore Database** - Reaaliaikainen NoSQL tietokanta  
- **Firebase Security Rules** - Datan suojaus
- **Email verification** - Automaattinen sähköpostivahvistus

### Security & Data Protection
- **Input Sanitization** - XSS ja injection suojaus
- **Password Strength Validation** - Vahvojen salasanojen pakotus
- **Account Expiration System** - Automaattinen tilin hallinta
- **GDPR Compliance** - EU tietosuoja-asetuksen noudattaminen

## 📱 Asennus ja käyttöönotto

### 1. Kloonaa ja asenna
```bash
git clone [repository-url]
cd ParentsTeachersApp
npm install
```

### 2. Firebase Setup (Pakollinen)
1. Luo Firebase-projekti [Firebase Console:ssa](https://console.firebase.google.com/)
2. Ota käyttöön:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Email verification** (Authentication > Templates)
3. Päivitä `src/config/firebaseConfig.js` omilla tiedoillasi:
```javascript
export const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Käynnistä sovellus
```bash
npm start
```

### 4. Testaa eri alustoilla
- **📱 Mobiili**: Skannaa QR-koodi Expo Go -sovelluksella
- **🌐 Web**: Paina `w` terminaalissa  
- **🤖 Android**: Paina `a` terminaalissa
- **🍎 iOS**: Paina `i` terminaalissa

## 🔐 Käyttöönotto ja turvallisuustestaus

### Ensimmäinen käyttökerta
1. **Valitse rooli**: Opettaja tai Vanhempi
2. **Rekisteröidy**: Täytä tiedot vahvalla salasanalla
3. **Sähköpostivahvistus**: PAKOLLINEN - sovellus ohjaa verification-näkymään
4. **Vahvista email**: Tarkista sähköposti ja klikkaa linkkiä
5. **Automaattinen tunnistus**: Sovellus havaitsee vahvistuksen ja siirtää Dashboard:iin

### Turvallisuustestaus
1. Siirry **SecurityTest** -näkymään Dashboard:ista
2. Testaa seuraavat ominaisuudet:
   - **🧪 Security Tests**: Password validation, XSS suojaus, rate limiting
   - **🔓 Weak Password Tests**: Heikkojen salasanojen esto
   - **⏰ Account Expiration Tests**: Automaattinen cleanup-järjestelmä

## 📁 Tiedostorakenne

```
src/
├── components/                 # Uudelleenkäytettävät komponentit
│   ├── AccountExpirationWarning.js
│   ├── EmailVerificationReminder.js
│   ├── CookieConsentBanner.js
│   └── TagSelector.js
├── config/
│   └── firebaseConfig.js      # Firebase asetukset + AsyncStorage persistence
├── store/                     # 🆕 Redux State Management
│   ├── index.js              # Store configuration + Redux Persist
│   ├── middleware/
│   │   ├── authMiddleware.js        # Session tracking & auto-logout
│   │   └── errorLoggingMiddleware.js # Centralized error handling
│   └── slices/
│       ├── authSlice.js      # Authentication & user session
│       ├── appDataSlice.js   # Teachers, Parents, Search, Favorites
│       └── securitySlice.js  # Security validations & rate limiting
├── hooks/                     # 🆕 Redux Hooks (Custom API)
│   ├── useAuth.js            # Auth operations (login, register, logout)
│   ├── useAppData.js         # Data operations (teachers, search)
│   └── useSecurity.js        # Security validations
├── screens/
│   ├── WelcomeScreen.js       # Aloitusnäkymä
│   ├── LoginScreen.js         # Kirjautumisnäkymä  
│   ├── EmailVerificationScreen.js  # PAKOLLINEN email vahvistus
│   ├── TeacherSignupScreen.js      # Opettajan rekisteröinti
│   ├── ParentSignupScreen.js       # Vanhemman rekisteröinti
│   ├── TeacherDashboard.js         # Opettajan päävalikko
│   ├── ParentDashboard.js          # Vanhemman päävalikko
│   ├── FindTeachersScreen.js       # Opettajien haku
│   └── SecurityTestScreen.js       # Turvallisuustestit
├── services/
│   ├── authService.js         # Email verification, password validation
│   ├── securityService.js     # Input sanitization, XSS protection
│   └── gdprService.js         # GDPR compliance utilities
└── styles/
    └── commonStyles.js        # Yleiset tyylit ja värit
```

## � Firebase Firestore rakenne

```
teachers/
  {userId}/
    - uid: string
    - fullName: string
    - email: string
    - userType: 'teacher'
    - subjects: string
    - hourlyRate: string
    - experience: string
    - education: string
    - location: string
    - description: string
    - languages: string
    - onlineTeaching: boolean
    - inPersonTeaching: boolean
    - emailVerified: boolean
    - securityScore: number (password strength)
    - createdAt: timestamp
    - lastUpdated: timestamp

parents/
  {userId}/
    - uid: string
    - fullName: string
    - email: string
    - userType: 'parent'
    - phoneNumber: string
    - location: string
    - childrenAges: string
    - specificNeeds: string
    - lookingFor: array
    - emailVerified: boolean
    - securityScore: number
    - createdAt: timestamp
    - lastUpdated: timestamp
```

## 🛡️ Turvallisuusarkkitehtuuri

### Authentication Flow
```
1. User Registration → Client-side validation
2. Firebase Auth → Server-side validation  
3. Email Verification → PAKOLLINEN (ei pääsyä sovellukseen)
4. Account Creation Tracking → 3 päivän expiration
5. Dashboard Access → Vasta vahvistuksen jälkeen
```

### Security Services
- **AuthService**: Email verification, password strength, account expiration
- **SecurityService**: Input sanitization, XSS protection, injection prevention
- **GDPRService**: Data export, deletion, consent management

### Account Lifecycle
- **Creation**: Account tracking starts, email verification sent
- **Verification**: 3-day window to verify email
- **Expiration**: Automatic cleanup of unverified accounts
- **Active Use**: Normal application access after verification

## 🎨 Käyttöliittymä

### Värimaailma
- **Opettaja**: Oranssi (#FF9800)
- **Vanhempi**: Pinkki (#E91E63)  
- **Primary**: Sininen (#2196F3)
- **Success**: Vihreä (#4CAF50)
- **Warning**: Oranssi (#FF9800)
- **Error**: Punainen (#F44336)

### Password Strength Indicator
- **🔴 Erittäin heikko** (0-39/100): Punainen, 20% width
- **🟠 Heikko** (40-59/100): Oranssi, 40% width
- **🟡 Keskinkertainen** (60-79/100): Keltainen, 70% width  
- **🟢 Vahva** (80-100/100): Vihreä, 100% width

## 🧪 Testaaminen

### Security Testing
1. **Navigation**: SecurityTest screen Dashboard:ista
2. **Password Tests**: Weak password validation
3. **XSS Tests**: Script injection prevention
4. **Rate Limiting**: Abuse prevention
5. **Account Expiration**: Cleanup functionality

### Manual Testing Scenarios
- **Rekisteröinti heikolla salasanalla** → Esto + selkeä virheilmoitus
- **Email verification skip** → Esto, pakollinen verification screen
- **XSS injection yritys** → Sanitization toimii
- **Account expiration** → 3 päivän kuluttua automaattinen poisto

## 🚀 Tulevaisuuden kehitysideat

### � Turvallisuus
- [ ] **Two-Factor Authentication (2FA)** - SMS/Authenticator app
- [ ] **Advanced threat detection** - Suspicious activity monitoring
- [ ] **Encryption at rest** - Sensitive data encryption
- [ ] **Audit logging** - Complete security event tracking

### 💬 Viestintä
- [ ] **Real-time chat** - WebSocket-pohjaiset viestit
- [ ] **Video calls** - Zoom/Jitsi integraatio
- [ ] **File sharing** - Secure document exchange
- [ ] **Push notifications** - Real-time alerts

### 💰 Liiketoiminta
- [ ] **Payment processing** - Stripe/PayPal integraatio
- [ ] **Booking system** - Kalenderivaraukset
- [ ] **Rating system** - Opettaja-arvostelut
- [ ] **Subscription tiers** - Premium features

### 🌍 Kansainvälistyminen
- [ ] **Multi-language support** - i18n implementation
- [ ] **Currency conversion** - Real-time exchange rates
- [ ] **Timezone handling** - Global scheduling
- [ ] **Region-specific features** - Local compliance

## 📄 Lisenssit ja compliance

- **MIT License** - Vapaasti käytettävissä kehitystarkoituksiin
- **GDPR Compliant** - EU tietosuoja-asetuksen mukainen
- **Firebase Terms** - Google Firebase palveluehdot
- **Data Protection** - Industry standard security practices

---

*Päivitetty: Lokakuu 2025 - Sisältää uusimmat turvallisuusparannukset ja email verification pakotuksen*
---

*Päivitetty: Lokakuu 2025 - Sisältää uusimmat turvallisuusparannukset ja email verification pakotuksen*