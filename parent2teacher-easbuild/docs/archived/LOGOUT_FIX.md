# Logout-toiminnon korjaus

**Päivämäärä:** 21.10.2025  
**Ongelma:** Sovelluksesta uloskirjautuminen ei toiminut oikein

---

## 🔍 HAVAITUT ONGELMAT

1. **SessionManager.clearSession() puuttui**
   - `logoutUser` thunk kutsui metodia jota ei ollut olemassa
   
2. **Logout ei tyhjentänyt session tietoja**
   - Redux state ei nollannut `sessionInfo` ja `rememberMe` kenttiä
   
3. **Logout funktiot eivät olleet async**
   - Dashboard-komponentit kutsuivat logout-toimintoa ilman await:ia
   - Virheet eivät käsittyneet kunnolla

4. **Logout rejected -tilaa ei käsitelty kunnolla**
   - Jos logout epäonnistui, käyttäjä jäi jumiin

---

## ✅ TEHDYT KORJAUKSET

### 1. **SessionManager.clearSession() metodi lisätty**
**Tiedosto:** `src/utils/sessionManager.js`

```javascript
/**
 * Tyhjentää kaikki session tiedot (alias reset-metodille)
 * Käytetään logout-toiminnossa
 */
async clearSession() {
  console.log('🧹 SessionManager: Clearing session (logout)');
  await this.reset();
}
```

### 2. **logoutUser thunk parannettu**
**Tiedosto:** `src/store/slices/authSlice.js`

**Ennen:**
```javascript
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      if (auth) {
        await signOut(auth);
      }
      await AsyncStorage.removeItem('user');
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

**Jälkeen:**
```javascript
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // 1. Sign out from Firebase
      if (auth) {
        await signOut(auth);
      }
      
      // 2. Clear AsyncStorage
      await AsyncStorage.removeItem('user');
      
      // 3. Clear session data
      await SessionManager.clearSession();
      
      return null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 3. **Logout reducer parannettu**
**Tiedosto:** `src/store/slices/authSlice.js`

**Ennen:**
```javascript
.addCase(logoutUser.fulfilled, (state) => {
  state.loading = false;
  state.user = null;
  state.isAuthenticated = false;
  state.error = null;
  state.lastLogin = null;
})
.addCase(logoutUser.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
})
```

**Jälkeen:**
```javascript
.addCase(logoutUser.fulfilled, (state) => {
  // Tyhjennä kaikki auth state
  state.loading = false;
  state.user = null;
  state.isAuthenticated = false;
  state.error = null;
  state.lastLogin = null;
  state.sessionInfo = null;
  state.rememberMe = false;
})
.addCase(logoutUser.rejected, (state, action) => {
  state.loading = false;
  state.error = action.payload;
  // Tyhjennä silti state, vaikka logout epäonnistuisi
  state.user = null;
  state.isAuthenticated = false;
  state.sessionInfo = null;
  state.rememberMe = false;
})
```

### 4. **ParentDashboard handleLogout parannettu**
**Tiedosto:** `src/screens/parent/ParentDashboard.js`

**Ennen:**
```javascript
const handleLogout = () => {
  logout();
};
```

**Jälkeen:**
```javascript
const handleLogout = async () => {
  console.log('🚪 ParentDashboard: Logout button pressed');
  try {
    const result = await logout();
    if (result.success) {
      console.log('✅ ParentDashboard: Logout successful');
    } else {
      console.error('❌ ParentDashboard: Logout failed:', result.error);
      alert('Logout failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ ParentDashboard: Logout error:', error);
    alert('An error occurred during logout.');
  }
};
```

### 5. **TeacherDashboard handleLogout parannettu**
**Tiedosto:** `src/screens/teacher/TeacherDashboard.js`

Sama korjaus kuin ParentDashboard:ssa.

---

## 🧪 TESTAUSOHJEET

### 1. **Perus logout-testi**
```
1. Kirjaudu sisään sovellukseen (Parent tai Teacher)
2. Paina logout-nappia Dashboard:ssa
3. Tarkista että:
   ✅ Näet "Logout button pressed" logissa
   ✅ Näet "Logout successful" logissa
   ✅ Sovellus navigoi Welcome-screenille
   ✅ Et pääse takaisin sisään ilman uudelleen kirjautumista
```

### 2. **Session data tyhjennysTesti**
```
1. Kirjaudu sisään
2. Avaa React Native Debugger
3. Tarkista Redux state ennen logoutia:
   - user: {...}
   - isAuthenticated: true
   - sessionInfo: {...}
   - rememberMe: true/false
   
4. Kirjaudu ulos
5. Tarkista Redux state logout:n jälkeen:
   - user: null
   - isAuthenticated: false
   - sessionInfo: null
   - rememberMe: false
```

### 3. **AsyncStorage tyhjennysTesti**
```
1. Kirjaudu sisään
2. Tarkista AsyncStorage (React Native Debugger):
   - @root:auth sisältää user-dataa
   
3. Kirjaudu ulos
4. Tarkista AsyncStorage:
   - @root:auth ei sisällä user-dataa
   - lastActivity poistettu
   - rememberMe poistettu
```

### 4. **Virhetilanteiden testi**
```
1. Simuloi verkkovirhe (offline-tila)
2. Yritä kirjautua ulos
3. Tarkista että:
   ✅ Näet virheilmoituksen
   ✅ Käyttäjä kirjataan ulos siitä huolimatta
   ✅ Sovellus palaa login-screenille
```

---

## 📋 TARKISTUSLISTA

- [x] SessionManager.clearSession() metodi lisätty
- [x] logoutUser thunk tyhjentää session datan
- [x] Logout reducer tyhjentää kaikki state-kentät
- [x] Logout rejected -tila käsittelee virheen ja kirjaa ulos
- [x] ParentDashboard käyttää async/await logout:issa
- [x] TeacherDashboard käyttää async/await logout:issa
- [x] Virheenkäsittely lisätty logout-toiminnoille
- [x] Console.log viestit lisätty debuggausta varten
- [ ] **TESTAA:** Logout toimii Parent-roolilla
- [ ] **TESTAA:** Logout toimii Teacher-roolilla
- [ ] **TESTAA:** Redux state tyhjentyy oikein
- [ ] **TESTAA:** AsyncStorage tyhjentyy oikein
- [ ] **TESTAA:** Navigointi toimii logout:n jälkeen

---

## 🔍 DEBUGGING-VINKIT

Jos logout EI VIELÄ toimi:

### 1. Tarkista console logit:
```
🚪 ParentDashboard: Logout button pressed
🚪 Redux: Logout attempt
✅ Redux: Firebase signOut successful
✅ Redux: AsyncStorage user removed
✅ Redux: Session cleared
✅ Redux: Logout successful
✅ ParentDashboard: Logout successful
```

### 2. Tarkista Redux DevTools:
- Näkyykö `auth/logoutUser/pending` action?
- Näkyykö `auth/logoutUser/fulfilled` action?
- Muuttuuko `isAuthenticated` false:ksi?

### 3. Tarkista App.js navigointi:
```javascript
{!isAuthenticated ? (
  // Pitäisi näyttää auth screens
  <Stack.Screen name="Welcome" component={WelcomeScreen} />
) : (
  // Ei pitäisi näkyä logout:n jälkeen
  <Stack.Screen name="ParentDashboard" component={ParentDashboard} />
)}
```

### 4. Tyhjennä cache ja käynnistä uudelleen:
```bash
# Tyhjennä Expo cache
npx expo start -c

# TAI
npm start -- --reset-cache
```

---

## 🎯 ODOTETTU TOIMINTA

1. **Käyttäjä painaa logout-nappia**
   ```
   handleLogout() kutsutaan
   ```

2. **Logout dispatchtaa Redux action:in**
   ```
   dispatch(logoutUser())
   ```

3. **logoutUser thunk suorittaa:**
   ```
   a) Firebase signOut
   b) AsyncStorage.removeItem('user')
   c) SessionManager.clearSession()
   ```

4. **Redux reducer päivittää state:n:**
   ```
   user: null
   isAuthenticated: false
   sessionInfo: null
   rememberMe: false
   ```

5. **App.js reagoi state muutokseen:**
   ```
   isAuthenticated === false
   → Näyttää Welcome/Login screenin
   ```

6. **Käyttäjä näkee kirjautumissivun**
   ✅ Logout valmis!

---

## 📚 LIITTYVÄT TIEDOSTOT

- `src/store/slices/authSlice.js` - Auth state ja logout thunk
- `src/hooks/useAuth.js` - Auth hook
- `src/utils/sessionManager.js` - Session hallinta
- `src/screens/parent/ParentDashboard.js` - Parent logout UI
- `src/screens/teacher/TeacherDashboard.js` - Teacher logout UI
- `App.js` - Navigointi logiikka

---

**Status:** ✅ Korjaukset tehty, odottaa testausta  
**Seuraavat toimenpiteet:** Testaa sovellusta ja varmista että logout toimii molemmilla rooleilla

---

## 🛡️ Middleware loop -korjaus (tärkeä)

**Ongelma:** `authMiddleware` dispatchasi pelkän `{ type: 'auth/logoutUser' }` actionin sessionin vanhentuessa. Tätä action-tyyppiä ei käsittele mikään reducer, joten `isAuthenticated` jäi `true`:ksi ja middleware käynnisti saman dispatchin yhä uudelleen → logout-loop.

**Korjaus:**
- `src/store/middleware/authMiddleware.js` päivitetty niin, että:
  - Käytetään oikeaa thunkia: `store.dispatch(logoutUser())` (importattu `../slices/authSlice`)
  - Lisätty vartija `isLoggingOut` estämään uudelleentriggeröinnin kesken uloskirjautumisen
  - Session-aikaleiman tarkistus siirretty `next(action)` jälkeen ja ohitetaan kaikille `auth/*` -actioneille (ei rekursiota)
  - `auth/logoutUser/fulfilled` kohdalla tyhjennetään muiden slicien sensitiivinen välimuisti ja vapautetaan vartija

**Näin varmistetaan:**
- Yksi ainoa logout sykäys session vanhentuessa
- `isAuthenticated` vaihtuu `false`:ksi varmasti
- Navigointi palaa auth-flow'hun ilman silmukkaa
