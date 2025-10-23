# Google Sign-In Setup Guide

## 📋 Mitä olet jo tehnyt:
- ✅ SHA-1 ja SHA-256 fingerprint lisätty Firebase Consoleen
- ✅ Google Sign-In paketti asennettu
- ✅ AuthService päivitetty Google-kirjautumisella

---

## 🔑 Vaihe 1: Hae Web Client ID Firebase Consolesta

1. Mene **Firebase Console**: https://console.firebase.google.com/
2. Valitse projektisi: **ParentsTeachersApp**
3. Mene: **Project Settings** (⚙️ -kuvake vasemmassa yläkulmassa)
4. Valitse välilehti: **General**
5. Scrollaa alas kohtaan: **Your apps**
6. Etsi **Web app** -osio (ei Android-osio!)
7. Kopioi **Web client ID** (se näyttää tältä: `123456789-xxxxxx. !)

**TÄRKEÄÄ:** Tarvitset **WEB** Client ID:n, ei Android Client ID:tä!

---

## 🔧 Vaihe 2: Lisää Web Client ID koodiin

Avaa tiedosto: `src/services/authService.js`

Etsi rivi (noin rivi 485):
```javascript
webClientId: 'YOUR_WEB_CLIENT_ID_HERE',
```

Korvaa se:
```javascript
webClientId: '1234567890-xxxxxxxxxxxxx.apps.googleusercontent.com',
```

---

## 🔥 Vaihe 3: Varmista Firebase Authentication asetukset

1. Firebase Consolessa mene: **Authentication**
2. Valitse välilehti: **Sign-in method**
3. Varmista että **Google** on **Enabled**
4. Jos ei ole, klikkaa sitä ja ota käyttöön

---

## 📱 Vaihe 4: Lisää Google Sign-In nappi kirjautumissivulle

Päivitetään `LoginScreen.js`:

```javascript
import { AuthService } from '../../services/authService';

// Lisää komponentin sisään:
const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    await AuthService.signInWithGoogle();
    // Käyttäjä ohjataan automaattisesti sisään authSlice:n kautta
  } catch (error) {
    Alert.alert('Virhe', error.message);
  } finally {
    setLoading(false);
  }
};

// Lisää UI:hin nappi:
<TouchableOpacity 
  style={styles.googleButton}
  onPress={handleGoogleSignIn}
  disabled={loading}
>
  <Text style={styles.googleButtonText}>
    🔵 Kirjaudu Google-tilillä
  </Text>
</TouchableOpacity>
```

---

## 🎨 Vaihe 5: Lisää tyylit (LoginScreen.js)

```javascript
googleButton: {
  backgroundColor: '#4285F4',
  padding: 15,
  borderRadius: 8,
  alignItems: 'center',
  marginTop: 10,
  flexDirection: 'row',
  justifyContent: 'center',
},
googleButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
```

---

## 🚀 Vaihe 6: Käynnistä Google Sign-In sovelluksen alussa

Lisää `App.js`:een (tai pääkomponenttiisi):

```javascript
import { AuthService } from './src/services/authService';

// useEffect:iin tai komponentti mountissa:
useEffect(() => {
  // Konfiguroi Google Sign-In
  AuthService.configureGoogleSignIn();
}, []);
```

---

## ✅ Vaihe 7: Testaa

1. Käynnistä sovellus uudelleen
2. Mene kirjautumissivulle
3. Klikkaa "Kirjaudu Google-tilillä" -nappia
4. Valitse Google-tili
5. Hyväksy käyttöoikeudet
6. Pitäisi kirjautua sisään automaattisesti! 🎉

---

## 🐛 Yleisiä ongelmia

### "Developer Error" tai "API not enabled"
- Tarkista että **Google Sign-In API** on enabled Google Cloud Consolessa
- Mene: https://console.cloud.google.com/
- Valitse projektisi
- APIs & Services → Enabled APIs
- Etsi "Google Sign-In API" ja varmista että se on enabled

### "SIGN_IN_CANCELLED"
- Käyttäjä peruutti kirjautumisen - tämä on normaali

### "PLAY_SERVICES_NOT_AVAILABLE"
- Google Play Services puuttuu (yleensä vain emulaattorissa)
- Asenna Google Play Services emulaattoriin tai testaa oikealla laitteella

### SHA-1/SHA-256 virheet
- Varmista että lisäsit OIKEAN SHA-1 fingerprint:in Firebase Consoleen
- Debug ja Release keystoreilla on ERI fingerprint:it!

---

## 📝 Muistilista

- [ ] Web Client ID kopioitu Firebase Consolesta
- [ ] Web Client ID lisätty `authService.js`:ään
- [ ] Google Sign-In enabled Firebase Authentication asetuksissa
- [ ] Google-nappi lisätty LoginScreen:iin
- [ ] configureGoogleSignIn() kutsuttu App.js:ssä
- [ ] Testattu että kirjautuminen toimii

---

## 🔗 Hyödylliset linkit

- Firebase Console: https://console.firebase.google.com/
- Google Cloud Console: https://console.cloud.google.com/
- React Native Google Sign-In docs: https://github.com/react-native-google-signin/google-signin

---

**Seuraavat askeleet:**
1. Hae Web Client ID
2. Päivitä authService.js
3. Lisää Google-nappi LoginScreen:iin
4. Testaa!
