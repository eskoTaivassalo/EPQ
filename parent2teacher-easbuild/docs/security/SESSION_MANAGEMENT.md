# 🕐 Session Management - Dokumentaatio

## Yleiskatsaus

Session Management -järjestelmä hallitsee käyttäjäsessioita Parents&Teachers -sovelluksessa. Se tarjoaa automaattisen uloskirjautumisen inaktiivisuuden jälkeen, Firebase tokenin seurannan ja "Muista minut" -toiminnallisuuden.

---

## 📋 Ominaisuudet

### 1. ⏰ Session Timeout
- **Timeout-aika:** 30 minuuttia inaktiivisuutta
- **Toiminta:** Automaattinen uloskirjautuminen kun aikakatkaisun raja ylittyy
- **Bypass:** "Muista minut" -toiminto ohittaa timeout:in

### 2. 🔑 Firebase Token Monitoring
- **Tarkistustahti:** Joka 5. minuutti
- **Toiminta:** Päivittää Firebase tokenin automaattisesti jos se vanhenee pian (<5 min)
- **Turvallisuus:** Logout jos token refresh epäonnistuu

### 3. 📊 Activity Tracking
- **Seuranta:** Viimeinen käyttäjän aktiivisuus tallennetaan AsyncStorageen
- **Päivitys:** Aktiviteetti päivittyy kun käyttäjä tekee toimintoja sovelluksessa
- **Validointi:** Session voimassaolo tarkistetaan sovelluksen käynnistyessä

### 4. 💾 Remember Me -toiminnallisuus
- **Kesto:** 30 päivää pysyvä kirjautuminen
- **Toiminta:** Ohittaa session timeout:in
- **Tallentaa:** AsyncStorage `rememberMe` -flag

---

## 🛠️ Käyttö

### 1. Alustus (App.js tai pääkomponentti)

```javascript
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

function App() {
  const { isAuthenticated, initSession, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // Alusta session seuranta
      initSession(() => {
        console.log('Session expired, logging out...');
        logout();
      });
    }
  }, [isAuthenticated]);

  return (
    // ... your app components
  );
}
```

### 2. Aktiviteetin seuranta (käyttäjän toiminnot)

```javascript
import { useAuth } from './hooks/useAuth';

function SomeComponent() {
  const { trackActivity } = useAuth();

  const handleUserAction = async () => {
    // Päivitä aktiviteetti kun käyttäjä tekee jotain
    await trackActivity();
    
    // ... your action logic
  };

  return (
    <TouchableOpacity onPress={handleUserAction}>
      <Text>Do something</Text>
    </TouchableOpacity>
  );
}
```

### 3. Remember Me -checkbox

```javascript
import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { Checkbox } from 'react-native';

function LoginScreen() {
  const { login, toggleRememberMe, rememberMe } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleLogin = async () => {
    const result = await login({ email, password });
    
    if (result.success) {
      // Aseta remember me -tila
      await toggleRememberMe(remember);
    }
  };

  return (
    <View>
      {/* Email & Password inputs */}
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Checkbox
          value={remember}
          onValueChange={(newValue) => setRemember(newValue)}
        />
        <Text>Muista minut</Text>
      </View>

      <Button title="Kirjaudu" onPress={handleLogin} />
    </View>
  );
}
```

### 4. Session-tietojen näyttö

```javascript
import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';

function SessionInfoComponent() {
  const { sessionInfo, fetchSessionInfo } = useAuth();

  useEffect(() => {
    fetchSessionInfo();
  }, []);

  if (!sessionInfo) return null;

  return (
    <View>
      <Text>Session Status: {sessionInfo.sessionStatus}</Text>
      
      {sessionInfo.timeRemaining && (
        <Text>
          Time remaining: {sessionInfo.timeRemaining} minutes
        </Text>
      )}
      
      {sessionInfo.rememberMe && (
        <Text>Remember me: Enabled ✅</Text>
      )}
      
      {sessionInfo.lastActivity && (
        <Text>
          Last activity: {sessionInfo.lastActivity.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}
```

---

## 🔧 Redux Integration

### Auth Slice State

```javascript
{
  user: { ... },
  isAuthenticated: true,
  loading: false,
  error: null,
  lastLogin: 1634567890123,
  sessionInfo: {
    lastActivity: Date,
    rememberMe: boolean,
    sessionStatus: 'active' | 'expiring_soon' | 'expired',
    timeRemaining: number, // minuutteina
    sessionTimeout: 30 // minuutteina
  },
  rememberMe: false
}
```

### Thunks

1. **initializeSession** - Käynnistä session seuranta
2. **updateActivity** - Päivitä viimeinen aktiviteetti
3. **setRememberMe** - Aseta "Muista minut" -tila
4. **getSessionInfo** - Hae session tiedot

### Selectors

```javascript
import {
  selectSessionInfo,
  selectRememberMe
} from './store/slices/authSlice';

// Käyttö komponentissa
const sessionInfo = useSelector(selectSessionInfo);
const rememberMe = useSelector(selectRememberMe);
```

---

## ⚙️ Konfiguraatio

### SessionManager.js -asetukset

```javascript
class SessionManager {
  constructor() {
    this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minuuttia
    this.REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 päivää
    this.tokenCheckInterval = 5 * 60 * 1000; // 5 minuuttia
  }
}
```

### Muokkaa timeout-aikoja

```javascript
// src/utils/sessionManager.js

// Muuta timeout-aika (esim. 15 minuuttia)
this.SESSION_TIMEOUT = 15 * 60 * 1000;

// Muuta remember me -kesto (esim. 7 päivää)
this.REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000;

// Muuta token check -taajuus (esim. 10 minuuttia)
const tokenCheckInterval = setInterval(async () => {
  await this.checkTokenExpiry();
}, 10 * 60 * 1000);
```

---

## 🧪 Testaus

### 1. Session Timeout -testaus

```javascript
// Testaa että sessio vanhenee 30 min jälkeen
describe('Session Timeout', () => {
  it('should logout after 30 minutes of inactivity', async () => {
    // Login
    const { login, sessionInfo } = useAuth();
    await login({ email, password });

    // Odota 31 minuuttia (simuloi)
    jest.advanceTimersByTime(31 * 60 * 1000);

    // Tarkista että käyttäjä on kirjautunut ulos
    expect(sessionInfo.sessionStatus).toBe('expired');
  });
});
```

### 2. Remember Me -testaus

```javascript
describe('Remember Me', () => {
  it('should not logout with remember me enabled', async () => {
    const { login, toggleRememberMe, sessionInfo } = useAuth();
    
    await login({ email, password });
    await toggleRememberMe(true);

    // Odota 31 minuuttia
    jest.advanceTimersByTime(31 * 60 * 1000);

    // Session pitää olla vielä aktiivinen
    expect(sessionInfo.sessionStatus).toBe('active');
  });
});
```

### 3. Activity Tracking -testaus

```javascript
describe('Activity Tracking', () => {
  it('should reset timeout when activity is tracked', async () => {
    const { login, trackActivity, sessionInfo } = useAuth();
    
    await login({ email, password });

    // Odota 25 minuuttia
    jest.advanceTimersByTime(25 * 60 * 1000);

    // Track activity (resetoi timer)
    await trackActivity();

    // Odota vielä 25 minuuttia (yhteensä 50 min)
    jest.advanceTimersByTime(25 * 60 * 1000);

    // Session pitää olla vielä aktiivinen (resetoitui 25 min kohdalla)
    expect(sessionInfo.sessionStatus).toBe('active');
  });
});
```

---

## 🐛 Debugging

### Lokitus

SessionManager tulostaa lokeja jokaisesta toiminnosta:

```
🕐 SessionManager: Initializing session tracking
✅ SessionManager: Session tracking started
🕐 SessionManager: Activity timer set for 30 minutes
🕐 SessionManager: Token monitoring started (check every 5 min)
🕐 SessionManager: Token expires in 55 minutes
🕐 SessionManager: Last activity updated
⏰ SessionManager: Session timeout reached
🚪 SessionManager: Session expired, logging out...
🧹 SessionManager: Cleaning up session tracking
```

### Yleisiä ongelmia

#### 1. Session ei vanhene
- **Syy:** `rememberMe` on `true`
- **Ratkaisu:** Tarkista `rememberMe` -tila ja poista käytöstä

#### 2. Token refresh epäonnistuu
- **Syy:** Firebase auth ei ole käytössä tai verkkoyhteys katkesi
- **Ratkaisu:** Tarkista Firebase-konfiguraatio ja verkkoyhteys

#### 3. Activity tracking ei toimi
- **Syy:** `trackActivity()` ei kutsuta käyttäjän toiminnoissa
- **Ratkaisu:** Lisää `trackActivity()` kutsut kaikiin tärkeisiin käyttäjän toimintoihin

---

## 📊 Session Lifecycle

```
1. LOGIN
   ↓
2. INITIALIZE SESSION
   ↓
   ├─→ Start Activity Timer (30 min)
   └─→ Start Token Monitoring (every 5 min)
   ↓
3. USER ACTIVITY
   ↓
   └─→ Track Activity → Reset Timer
   ↓
4. SESSION CHECK
   ↓
   ├─→ Active (< 30 min)
   ├─→ Expiring Soon (< 5 min)
   └─→ Expired (> 30 min) → LOGOUT
   ↓
5. LOGOUT
   ↓
   └─→ Cleanup Timers
```

---

## 🔒 Turvallisuus

### Best Practices

1. **Älä tallenna sensitiivistä dataa** AsyncStorageen
2. **Käytä Firebase tokenin validointia** ennen API-kutsuja
3. **Logout automaattisesti** jos token refresh epäonnistuu
4. **Tarkista session voimassaolo** jokaisella sovelluksen käynnistyksellä
5. **Käytä HTTPS:ää** kaikissa API-kutsuissa

### OWASP Top 10 Compliance

- ✅ **A01:2021 - Broken Access Control** → Session timeout estää pitkät kirjautumiset
- ✅ **A02:2021 - Cryptographic Failures** → Token säilytetään turvallisesti
- ✅ **A07:2021 - Identification and Authentication Failures** → Firebase token monitoring

---

## 📚 API Reference

### SessionManager

#### Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `initialize(callback)` | `onExpiredCallback: Function` | `Promise<boolean>` | Alustaa session seurannan |
| `updateLastActivity()` | - | `Promise<void>` | Päivittää viimeinen aktiviteetti |
| `setRememberMe(enabled)` | `enabled: boolean` | `Promise<void>` | Asettaa remember me -tilan |
| `getSessionInfo()` | - | `Promise<SessionInfo>` | Palauttaa session tiedot |
| `cleanup()` | - | `void` | Pysäyttää timerit |
| `reset()` | - | `Promise<void>` | Nollaa session |

#### SessionInfo Type

```typescript
interface SessionInfo {
  lastActivity: Date | null;
  rememberMe: boolean;
  sessionStatus: 'active' | 'expiring_soon' | 'expired';
  timeRemaining: number | null; // minutes
  sessionTimeout: number; // minutes
}
```

### useAuth Hook

#### Session Management Functions

```javascript
const {
  sessionInfo,      // SessionInfo object
  rememberMe,       // boolean
  initSession,      // (callback) => Promise<{ success, sessionInfo? }>
  trackActivity,    // () => Promise<{ success }>
  toggleRememberMe, // (enabled) => Promise<{ success }>
  fetchSessionInfo, // () => Promise<{ success, sessionInfo }>
} = useAuth();
```

---

## ✅ Checklist

- [x] SessionManager luotu
- [x] Redux authSlice integraatio
- [x] useAuth hook päivitetty
- [x] Session timeout (30 min)
- [x] Firebase token monitoring (5 min interval)
- [x] Remember me -toiminnallisuus
- [x] Activity tracking
- [x] AsyncStorage integration
- [x] Dokumentaatio luotu
- [ ] **UI komponentit** (Remember me checkbox)
- [ ] **Testing** (Unit tests)
- [ ] **Integration testing** (E2E tests)
- [ ] **Performance monitoring**

---

## 📝 Huomautukset

1. **Session Management on nyt valmis** Redux authSlicessa ja useAuth hookissa
2. **UI-komponentit puuttuvat** - Lisää "Muista minut" -checkbox Login-screeniin
3. **Testaus vaaditaan** - Luo unit testit SessionManagerille
4. **Activity tracking** - Lisää `trackActivity()` kutsut käyttäjän toimintoihin

---

**Luotu:** 2025-10-20  
**Versio:** 1.0.0  
**Tila:** ✅ VALMIS (kooditaso), ⏳ ODOTTAA (testaus + UI)
