# 🔍 Google Authentication Diagnostiikka & Korjaus

## ✅ Nykytila - Mitä on jo tehty:
1. ✅ `@react-native-google-signin/google-signin@16.0.0` asennettu
2. ✅ Web Client ID lisätty authService.js:ään (`892513281177-v630fe7a65rpdoiqni3cpsqsk23qgb5u`)
3. ✅ Google Sign-In konfiguroidaan App.js:ssä käynnistyksen yhteydessä
4. ✅ LoginScreen sisältää Google-kirjautumisen logiikan
5. ✅ google-services.json löytyy ja sisältää client ID:t
6. ✅ Expo plugin lisätty app.json:iin

---

## 🚨 Yleisimmät ongelmat ja ratkaisut:

### 1. **Firebase Console - Varmista Google Sign-In on aktivoitu**

```
📍 Firebase Console checklist:
□ Mene: https://console.firebase.google.com/
□ Valitse: ParentsTeachersApp projekti
□ Mene: Authentication → Sign-in method
□ Tarkista: Google-provider on ENABLED (vihreä)
□ Tarkista: Web SDK configuration on oikein
```

### 2. **SHA-sertifikaattien tarkistus (Android)**

Sovelluksessa käytössä olevat SHA-sertifikaatit pitää löytyä Firebase Consolesta:

```powershell
# Tarkista nykyinen SHA-1 ja SHA-256:
cd android
./gradlew signingReport

# TAI kehitysympäristöstä:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Firebase Consolessa pitää olla:**
- ⚙️ Project Settings → Your apps → Android app
- SHA-1 ja SHA-256 fingerprints lisätty

### 3. **Web Client ID varmistus**

Tarkista että authService.js:ssä on **WEB** Client ID, EI Android Client ID:

```javascript
// authService.js rivi 477
webClientId: '892513281177-v630fe7a65rpdoiqni3cpsqsk23qgb5u.apps.googleusercontent.com'
```

**Mistä löydät oikean ID:n:**
```
Firebase Console → Project Settings → General
→ Your apps → Web app
→ Kopioi: Web client ID
```

---

## 🧪 Testausohjeet:

### Vaihe 1: Käynnistä sovellus
```bash
npm start
# TAI
expo start
```

### Vaihe 2: Paina 'a' Android-emulaattorille tai laitteelle

### Vaihe 3: Yritä kirjautua Google-tilillä

### Vaihe 4: Katso virheet konsolista

**Tärkeimmät virheilmoitukset:**

| Virhe | Syy | Ratkaisu |
|-------|-----|----------|
| `DEVELOPER_ERROR` | SHA-1 puuttuu tai väärin | Lisää SHA-1 Firebase Consoleen |
| `API_NOT_CONNECTED` | Google Sign-In ei aktivoitu | Aktivoi Firebase Authentication |
| `SIGN_IN_CANCELLED` | Käyttäjä peruutti | Ei ongelma, normaali käyttäjätoiminto |
| `NETWORK_ERROR` | Ei internetyhteyttä | Tarkista verkkoyhteys |
| `Configuration error` | webClientId väärin | Tarkista webClientId authService.js:ssä |

---

## 🔧 Korjaukset tarvittaessa:

### Jos SHA-sertifikaatit puuttuvat:

1. **Hae SHA-1 ja SHA-256:**
```powershell
cd android
./gradlew signingReport
```

2. **Lisää Firebase Consoleen:**
```
Firebase Console → Project Settings → Your apps
→ Android app → Add fingerprint
```

3. **Lataa uusi google-services.json:**
```
Firebase Console → Project Settings → Your apps
→ Android app → Download google-services.json
→ Korvaa projektin juuressa oleva tiedosto
```

### Jos webClientId on väärä:

1. **Hae oikea ID:**
```
Firebase Console → Project Settings → General
→ Your apps → Web app → Copy Web client ID
```

2. **Päivitä authService.js:**
```javascript
static configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: 'OIKEA_WEB_CLIENT_ID_TÄHÄN',
    offlineAccess: true,
  });
}
```

### Jos Google Sign-In ei ole aktivoitu:

```
Firebase Console → Authentication → Sign-in method
→ Etsi "Google"
→ Klikkaa → Enable → Save
```

---

## 📱 Testausskenaario:

1. **Avaa sovellus**
2. **Valitse kirjautumistapa** (Teacher/Parent)
3. **Paina "🔵 Kirjaudu Google-tilillä"**
4. **Valitse Google-tili**
5. **Anna sovellukselle luvat**
6. **Odotettu tulos:**
   - ✅ Kirjautuminen onnistuu
   - ✅ Käyttäjä ohjautuu dashboardille
   - ✅ Redux store päivittyy käyttäjätiedoilla

---

## 🐛 Debug-lokit:

Sovelluksessa on seuraavat debug-lokit Google-kirjautumiselle:

```
LoginScreen.js:
- "🔵 Google Sign-In button pressed"
- "🔵 Google loading state: true/false"

authService.js:
- "🔵 Starting Google Sign-In..."
- "✅ Google Sign-In configured successfully"
- "✅ Google Sign-In successful"
- "❌ Google Sign-In error:"
```

---

## 📞 Seuraavat askeleet:

1. ✅ **Käynnistä sovellus** ja yritä kirjautua
2. 📋 **Kopioi virheviesti** tarkasti (jos tulee)
3. 🔍 **Etsi virheviesti** yllä olevasta taulukosta
4. 🔧 **Tee ehdotettu korjaus**
5. 🔄 **Testaa uudelleen**

---

## 💡 Yleiset vinkit:

- **Kehitysympäristössä:** Käytä debug.keystore SHA-1:tä
- **Tuotannossa:** Käytä release.keystore SHA-1:tä
- **Google Play Console:** Lisää myös Google Play signing certificate SHA-1
- **Testaa ensin emulaattorilla,** sitten oikealla laitteella
- **Clear cache:** `expo start -c` jos ongelmat jatkuvat

---

## ✅ Checklist ennen tuotantoa:

- [ ] Google Sign-In aktivoitu Firebase Consolessa
- [ ] Web Client ID oikein authService.js:ssä
- [ ] Debug keystore SHA-1 lisätty Firebaseen (kehitys)
- [ ] Release keystore SHA-1 lisätty Firebaseen (tuotanto)
- [ ] google-services.json päivitetty projektiin
- [ ] Testattu emulaattorilla
- [ ] Testattu oikealla Android-laitteella
- [ ] Virheenkäsittely toimii
- [ ] Käyttäjä näkee selkeät virheilmoitukset
