# iOS Build - Tilanne ja Ohjeet

**Päivitetty: 16.11.2025**

## ✅ iOS-tuki: KYLLÄ, mutta vaatii lisäkonfiguraatioita

Sovellus on teknisesti valmis iOS-buildiin, mutta tarvitaan muutamia lisäasioita ennen ensimmäistä buildia.

---

## 📋 Nykyinen Tilanne

### ✅ Valmiina:

1. **app.json iOS-konfiguraatio:**
   - ✅ `bundleIdentifier: "com.parents2teachers"` lisätty
   - ✅ Kaikki permissions määritelty (Camera, Location, Calendar, etc.)
   - ✅ Google Maps API Key konfiguroitu
   - ✅ Info.plist usage descriptions valmiina
   - ✅ Tablet-tuki aktivoitu

2. **eas.json Build-profiilit:**
   - ✅ Development build: iOS simulator-tuki
   - ✅ Preview build: iOS device testing
   - ✅ Production build: App Store release

3. **Natiivit kirjastot:**
   - ✅ Kaikki 25+ natiivit kirjastot ovat iOS-yhteensopivia
   - ✅ Firebase, Google Sign-In, Maps, Notifications, Calendar, Location jne.

4. **Plugins:**
   - ✅ Kaikki expo-pluginit konfiguroitu app.json:ssa
   - ✅ @react-native-google-signin/google-signin
   - ✅ expo-notifications, expo-location, expo-calendar

---

## ⚠️ Puuttuu iOS-buildiin:

### 1. **GoogleService-Info.plist** (KRIITTINEN)
**Status:** ❌ Puuttuu

Firebase-integraatio vaatii iOS:lle oman konfiguraatiotiedoston (kuten Android:lle on `google-services.json`).

**Mistä saada:**
1. Mene [Firebase Console](https://console.firebase.google.com/)
2. Valitse projekti: `parents2teachers-1d8a3`
3. Project Settings → Your apps → iOS app
4. Jos iOS app ei ole lisätty:
   - Klikkaa "Add app" → iOS
   - Bundle ID: `com.parents2teachers`
   - App nickname: `Parents2Teachers iOS`
   - Download `GoogleService-Info.plist`
5. Jos iOS app on jo olemassa:
   - Klikkaa iOS app → Download `GoogleService-Info.plist`

**Minne laittaa:**
- Tallenna projektin juureen: `ParentsTeachersApp/GoogleService-Info.plist`
- Lisää `.gitignore`:een (jos ei halua commitoida)

**app.json päivitys:**
```json
"ios": {
  "bundleIdentifier": "com.parents2teachers",
  "googleServicesFile": "./GoogleService-Info.plist",
  ...
}
```

---

### 2. **Apple Developer Account** (Pakollinen device/App Store buildeihin)
**Status:** ❓ Tuntematon

**Simulator-buildiin EI tarvita**, mutta fyysiseen laitteeseen tai App Storeen julkaisuun tarvitaan:

- **Apple Developer Program** membership ($99/vuosi)
- **Bundle ID** rekisteröinti: `com.parents2teachers`
- **Signing credentials** (certificates, provisioning profiles)

**EAS hoitaa suurimman osan automaattisesti**, mutta tarvitset:
1. Apple ID kirjautumisen EAS:iin
2. Developer Program -jäsenyyden
3. Hyväksynnän terms and conditions

---

### 3. **Notification Assets** (Valinnainen)
**Status:** ⚠️ Puuttuu (app.json viittaa niihin)

`app.json` viittaa tiedostoihin jotka eivät (vielä) ole olemassa:
```json
"expo-notifications": {
  "icon": "./assets/notification-icon.png",
  "sounds": ["./assets/notification-sound.wav"]
}
```

**Ratkaisu:**
- **Vaihtoehto A:** Luo kyseiset tiedostot `assets/`-kansioon
- **Vaihtoehto B:** Poista nuo rivit `app.json`:sta (käytä oletuksia)

Suositus: Poista toistaiseksi, lisää myöhemmin kun brändäät sovelluksen.

---

## 🚀 Kuinka Buildaa iOS:lle

### Vaihtoehto 1: iOS Simulator Build (HELPOIN, ei tarvitse Apple Developer Accountia)

```bash
# Development build simulaattorille
eas build --profile development --platform ios

# Tai jos haluat vain simulaattorin
eas build --profile development --platform ios --local
```

**Edut:**
- ✅ Ei vaadi Apple Developer Accountia
- ✅ Nopea testata Mac:illa (Xcode Simulator)
- ✅ Hyvä kehitykseen

**Haitat:**
- ❌ Ei toimi oikealla laitteella
- ❌ Ei testaa kaikkia natiiveja ominaisuuksia (push notifications, maps täysin)

---

### Vaihtoehto 2: iOS Device Build (Tarvitaan Apple Developer Account)

```bash
# Preview build oikealle laitteelle (internal testing)
eas build --profile preview --platform ios

# Production build (App Store submission)
eas build --profile production --platform ios
```

**Vaatii:**
- ✅ Apple Developer Program ($99/vuosi)
- ✅ Bundle ID rekisteröity
- ✅ Signing credentials

**EAS kysyy automaattisesti:**
1. Apple ID
2. Luodaanko uusi Bundle ID vai käytetäänkö olemassaolevaa
3. Distribution certificate
4. Provisioning profile

---

### Vaihtoehto 3: Molemmat Alustat Samalla Kertaa

```bash
# Development build molemmille (Android APK + iOS Simulator)
eas build --profile development --platform all

# Preview build molemmille (testaukseen)
eas build --profile preview --platform all

# Production build molemmille (julkaisuun)
eas build --profile production --platform all
```

**Huom:** `--platform all` buildaa iOS:n myös → tarvitaan GoogleService-Info.plist ja Apple Developer Account (paitsi simulator buildissa).

---

## 📝 Vaiheittainen TODO iOS-buildiin

### Nyt Heti (Simulator build):

1. **Lataa GoogleService-Info.plist Firebase Consolesta**
   - Lisää projektin juureen
   - Päivitä `app.json`: `"googleServicesFile": "./GoogleService-Info.plist"`

2. **Poista/luo notification assets**
   - Vaihtoehto A: Poista icon/sounds `app.json`:sta
   - Vaihtoehto B: Luo `assets/notification-icon.png` ja `notification-sound.wav`

3. **Aja iOS simulator build**
   ```bash
   eas build --profile development --platform ios
   ```

4. **Testaa Xcode Simulatorissa** (jos sinulla on Mac)

---

### Myöhemmin (Device/App Store build):

1. **Hanki Apple Developer Program membership** ($99)

2. **Rekisteröi Bundle ID Firebase Consoleen**
   - iOS app luonti Firebase:ssä
   - Bundle ID: `com.parents2teachers`

3. **Ensimmäinen device build**
   ```bash
   eas build --profile preview --platform ios
   ```
   - EAS kysyy Apple ID:tä
   - Valitse "Let EAS handle credentials"

4. **Testaa TestFlight:lla** (Apple:n beta-testauspalvelu)

5. **App Store submission**
   ```bash
   eas submit --platform ios
   ```

---

## 🎯 Suositeltu Eteneminen

### Tällä hetkellä (ilman Apple Developer Accountia):

**ANDROID ENSIN:**
```bash
# Android build on helpompi ja halvempi
eas build --profile development --platform android
eas build --profile preview --platform android
```

**Edut:**
- ✅ Ei vaadi maksullista developer-accountia
- ✅ google-services.json on jo olemassa
- ✅ Voit testata oikealla laitteella heti
- ✅ Nopeampi build-aika

---

### Kun iOS tarvitaan:

1. **Hanki Apple Developer Account** ($99)
2. **Lataa GoogleService-Info.plist**
3. **Tee iOS simulator build** (testaus)
4. **Tee iOS device build** (oikea laite)
5. **TestFlight** (beta-testaus)
6. **App Store** (julkaisu)

---

## 💰 Kustannukset

| Alusta | Kustannus | Vaatimukset |
|--------|-----------|-------------|
| **Android Development** | **ILMAINEN** | Google-tili |
| **Android Play Store** | **$25** (kertaluonteinen) | Google Play Console |
| **iOS Development (Simulator)** | **ILMAINEN** | Mac + Xcode |
| **iOS Device/App Store** | **$99/vuosi** | Apple Developer Program |

---

## 🔧 Komennot

### Tarkista EAS build status:
```bash
eas build:list
```

### Konfiguraation tarkistus:
```bash
eas build:configure
```

### Simulator build (ei tarvitse Apple Account):
```bash
eas build --profile development --platform ios
```

### Device build (tarvitaan Apple Account):
```bash
eas build --profile preview --platform ios
```

### Molemmat alustat:
```bash
# Development (Android APK + iOS Simulator)
eas build --profile development --platform all

# Preview (Android APK + iOS Device)
eas build --profile preview --platform all

# Production (Android Bundle + iOS App Store)
eas build --profile production --platform all
```

---

## ✅ Yhteenveto

**KYLLÄ, iOS-tuki on olemassa!**

**Valmiina:**
- ✅ Kaikki koodi ja kirjastot iOS-yhteensopivia
- ✅ app.json ja eas.json konfiguroitu
- ✅ Permissions määritelty
- ✅ Simulator build voidaan tehdä HETI (kun GoogleService-Info.plist lisätty)

**Puuttuu:**
- ❌ GoogleService-Info.plist (Firebase Console)
- ❌ Apple Developer Account ($99) - vain device/App Store buildeihin
- ⚠️ Notification assets (valinnainen)

**Seuraava Askel:**
1. **Jos haluat testata iOS:ää heti:** Lataa GoogleService-Info.plist, buildaa simulaattorille
2. **Jos riittää Android:** Jatka Android-buildeilla (halvempi ja helpompi aloitus)

---

**Suositus:** Aloita Android-buildeilla MVP:hen, lisää iOS kun tarvitaan (tai kun halutaan laajempi käyttäjäkunta).
