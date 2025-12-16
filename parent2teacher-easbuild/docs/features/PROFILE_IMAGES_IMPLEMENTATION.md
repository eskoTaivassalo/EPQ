# Profiilikuvien Toteutus - ParentsTeachersApp

## 📅 Päivämäärä: 14. marraskuuta 2025

## 📸 Yleiskatsaus

Profiilikuvien hallinta on nyt lisätty sovellukseen. Käyttäjät voivat:
- ✅ Valita profiilikuvan tiedostoista
- ✅ Ottaa profiilikuvan kameralla
- ✅ Nähdä profiilikuvat sovelluksessa
- ✅ Muokata profiilikuviaan

---

## 🛠️ Toteutetut Muutokset

### 1. **Uusi Palvelu: ImagePickerService**
📁 `src/services/imagePickerService.js`

Keskitetty palvelu kuvien käsittelylle:
- 📷 `takePhoto()` - Ota kuva kameralla
- 🖼️ `pickImage()` - Valitse kuva galleriasta
- ☁️ `uploadImage()` - Lataa kuva Firebase Storageen
- 🗑️ `deleteImage()` - Poista kuva Storagesta
- 🎨 `showImagePickerOptions()` - Näytä valintalomake

**Ominaisuudet:**
- Automaattiset käyttöoikeudet kameralle ja gallerialle
- Kuvan rajaus neliön muotoon
- Kuvanlaadun optimointi (80%)
- Firebase Storage integraatio

---

### 2. **AuthService Päivitykset**
📁 `src/services/authService.js`

Lisätyt funktiot:
- `updateProfileImage(imageUri, userId, userType)` - Päivitä profiilikuva
- `deleteProfileImage(userId, userType)` - Poista profiilikuva

**Toiminnallisuus:**
- Lataa kuva Firebase Storageen polkuun `profiles/{userId}/profile.jpg`
- Päivitä Firebase Auth profiilikuva
- Päivitä Firestore dokumentti (teachers/parents kokoelma)
- Automaattinen URL:n generointi ja tallennus

---

### 3. **Uusi UI-Komponentti: ProfileImagePicker**
📁 `src/components/ProfileImagePicker.js`

Uudelleenkäytettävä komponentti profiilikuvien hallintaan:

**Props:**
- `imageUri` - Nykyinen profiilikuvan URI
- `onImageSelected` - Callback kun kuva valitaan
- `size` - Kuvan koko (oletus: 120px)
- `editable` - Onko muokkaus sallittu (oletus: true)

**Ominaisuudet:**
- 📸 Kamera-painike kuvan valintaan
- ❌ Poista-painike profiilikuvan poistamiseen
- 🎨 Placeholder ikoni kun kuvaa ei ole
- ⏳ Latausanimaatio
- 📏 Mukautettavissa koko

**Tyyli:**
- Pyöreä muoto
- Primary-väri kehyksenä
- Varjostus ja elevation
- Responsiivinen

---

### 4. **TeacherSignupScreen Päivitykset**
📁 `src/screens/teacher/TeacherSignupScreen.js`

**Lisäykset:**
- ProfileImagePicker lomakkeen alussa
- State `profileImageUri` kuvan tallennukseen
- Profiilikuvan lataus rekisteröinnin yhteydessä
- Virheiden hallinta (ei estä rekisteröintiä)

**Toiminta:**
1. Käyttäjä valitsee kuvan profiilin luonnin aikana
2. Kuva tallennetaan tilaan
3. Rekisteröinnin onnistuttua kuva ladataan Firebase Storageen
4. URL tallennetaan Firebase Authiin ja Firestoreen

---

### 5. **ParentSignupScreen Päivitykset**
📁 `src/screens/parent/ParentSignupScreen.js`

**Samat lisäykset kuin TeacherSignupScreenissä:**
- ProfileImagePicker integrointi
- Profiilikuvan lataus rekisteröinnin yhteydessä
- Virheiden hallinta

---

### 6. **FindTeachersScreen Päivitykset**
📁 `src/screens/shared/FindTeachersScreen.js`

**Muutokset:**
- Lisätty `Image` import React Native:sta
- Päivitetty `renderTeacherCard` näyttämään profiilikuvat
- Placeholder jos kuvaa ei ole

**Ennen:**
```javascript
<View style={styles.avatarContainer}>
  <Ionicons name="person" size={40} color={colors.white} />
</View>
```

**Jälkeen:**
```javascript
<View style={styles.avatarContainer}>
  {item.photoURL ? (
    <Image 
      source={{ uri: item.photoURL }} 
      style={styles.avatarImage}
      resizeMode="cover"
    />
  ) : (
    <Ionicons name="person" size={40} color={colors.white} />
  )}
</View>
```

**Uusi tyyli:**
```javascript
avatarImage: {
  width: 60,
  height: 60,
  borderRadius: 30,
}
```

---

### 7. **TeacherMyProfileScreen Päivitykset**
📁 `src/screens/teacher/TeacherMyProfileScreen.js`

**Lisäykset:**
- ProfileImagePicker näyttää ja muokkaa profiilikuvaa
- State `profileImageUri` kuvan päivitykseen
- Profiilikuvan tallennuslogiikka `saveProfile()`-funktiossa
- Kuvan lataus Firestoresta

**Toiminta:**
- Näyttää nykyisen profiilikuvan
- Muokkaustilassa voi vaihtaa kuvan
- Tallennuksessa kuva ladataan ja URL päivitetään
- Ei-muokkaustilassa kuva näytetään vain

---

### 8. **ParentMyProfileScreen Päivitykset**
📁 `src/screens/parent/ParentMyProfileScreen.js`

**Lisäykset:**
- ProfileImagePicker profiilin headerissa
- Editable asetettu `false`:ksi (vain näyttö)
- Poistettu vanha avatarContainer-tyyli

**Huomio:**
- Tällä hetkellä vain lukutilassa
- Voidaan myöhemmin lisätä muokkaustoiminto

---

## 🔥 Firebase Storage Konfiguraatio

**Olemassa oleva:** `storage.rules`
```plaintext
match /profiles/{userId}/{filename} {
  // Luku: Kaikki kirjautuneet
  allow read: if isAuthenticated();
  
  // Kirjoitus: Vain omistaja
  allow write: if isOwner(userId) && isImage() && isValidSize();
  
  // Poisto: Vain omistaja
  allow delete: if isOwner(userId);
}
```

**Rajoitukset:**
- Max 5 MB tiedostokoko
- Vain kuvatiedostot (image/*)
- Käyttäjä voi muokata vain omia kuviaan

---

## 📦 Asennetut Paketit

```bash
npx expo install expo-image-picker
```

**expo-image-picker** tarjoaa:
- Kameran käyttöoikeudet
- Gallerian käyttöoikeudet
- Kuvan rajaustyökalu
- Kuvanlaadun säätö
- Cross-platform tuki (iOS, Android, Web)

---

## 🎨 UI/UX Parannukset

### ProfileImagePicker Komponentti
- **Placeholder:** Harmaa tausta + person-ikoni
- **Valittu kuva:** Pyöreä kuva + primary-kehys
- **Kamera-painike:** Primary-väri + kamera-ikoni
- **Poista-painike:** Punainen + rasti-ikoni
- **Latausanimaatio:** ActivityIndicator
- **Ohjeteksti:** "Lisää profiilikuva napauttamalla kamera-ikonia"

### Responsiivisuus
- Mukautettavissa koko (size prop)
- Toimii eri näyttöko'oilla
- Sopii sekä signup- että profile-näkymiin

---

## 🔒 Turvallisuus

1. **Firebase Storage Rules**
   - Vain kirjautuneet käyttäjät voivat lukea
   - Vain omistaja voi kirjoittaa/poistaa
   - Tiedostokoko rajoitettu 5 MB
   - Vain kuvatiedostot sallittu

2. **Client-Side Validointi**
   - Expo-image-picker rajoittaa tiedostotyypit
   - Kuvanlaadun optimointi (80%)
   - Automaattinen rajaus neliöön

3. **Error Handling**
   - Virheilmoitukset käyttäjälle
   - Ei estä rekisteröintiä jos kuva ei lataudu
   - Lokitus virheistä console.error

---

## 📱 Käyttöliittymä

### Signup (Rekisteröinti)
```
┌─────────────────────────┐
│                         │
│    [Profiilikuva]      │
│     [Kamera-ikoni]     │
│                         │
│  "Lisää profiilikuva"  │
│                         │
├─────────────────────────┤
│  Full Name *            │
│  Email Address *        │
│  ...                    │
└─────────────────────────┘
```

### Profile View (Profiili)
```
┌─────────────────────────┐
│                         │
│    [Profiilikuva]      │
│   (muokkaustilassa:    │
│    [Kamera] [Poista])  │
│                         │
│     Teacher Name        │
│     email@example.com   │
│                         │
├─────────────────────────┤
│  Profile Details...     │
└─────────────────────────┘
```

### Teacher Card (Opettajalista)
```
┌─────────────────────────┐
│ [Kuva]  Teacher Name    │
│         ★ 4.5 (23)      │
│         €25/hour        │
├─────────────────────────┤
│ Subjects: Math, ...     │
│ ...                     │
└─────────────────────────┘
```

---

## 🚀 Käyttöönotto

### 1. Kehitysympäristö
```bash
# Asenna riippuvuudet
cd ParentsTeachersApp
npx expo install expo-image-picker

# Käynnistä sovellus
npx expo start
```

### 2. Testaus
1. ✅ Rekisteröidy uutena opettajana/vanhempana
2. ✅ Valitse profiilikuva kameralla TAI galleriasta
3. ✅ Tallenna profiili
4. ✅ Tarkista että kuva näkyy:
   - Profiilissa
   - Opettajalistassa
   - Dashboardissa

### 3. Firebase Storage
- Varmista että Storage on aktivoitu Firebase Consolessa
- Tarkista että storage.rules on päivitetty
- Tarkista että CORS on konfiguroitu (web)

---

## 🐛 Tunnetut Rajoitukset

1. **ParentMyProfileScreen:**
   - Profiilikuvan muokkaus ei ole vielä toteutettu
   - Vain lukutila (editable=false)

2. **Web-tuki:**
   - Kamera ei toimi web-selaimessa
   - Vain tiedostojen valinta toimii

3. **Kuvankoko:**
   - Ei automaattista pakkaamista
   - 80% laatu saattaa olla liian suuri mobiilille

---

## 🔮 Tulevat Parannukset

1. **Kuvan pakkaus:**
   - Lisää `expo-image-manipulator` pienempään kokoon
   - Optimoi latausaika

2. **Kuvan cropping:**
   - Parempi rajaustyökalu
   - Vapaa muoto (ei vain neliö)

3. **Multiple images:**
   - Portfolio-galleria opettajille
   - Useampi profiilikuva

4. **Image cache:**
   - Lataa kuvat cachettuina
   - Parempi suorituskyky

5. **Parent profile editing:**
   - Lisää muokkaustoiminto ParentMyProfileScreeniin
   - Profiilikuvan päivitys

---

## 📚 Dokumentaatio

### ImagePickerService API

```javascript
import imagePickerService from './services/imagePickerService';

// Ota kuva kameralla
const photo = await imagePickerService.takePhoto();

// Valitse kuva galleriasta
const image = await imagePickerService.pickImage();

// Näytä valintalomake
const selected = await imagePickerService.showImagePickerOptions();

// Lataa kuva Firebase Storageen
const url = await imagePickerService.uploadImage(
  imageUri,
  userId,
  'profile.jpg'
);

// Poista kuva
await imagePickerService.deleteImage(userId, 'profile.jpg');
```

### AuthService API

```javascript
import { AuthService } from './services/authService';

// Päivitä profiilikuva
const photoURL = await AuthService.updateProfileImage(
  imageUri,
  userId,
  'teacher' // tai 'parent'
);

// Poista profiilikuva
await AuthService.deleteProfileImage(
  userId,
  'teacher' // tai 'parent'
);
```

### ProfileImagePicker Komponentti

```javascript
import ProfileImagePicker from './components/ProfileImagePicker';

<ProfileImagePicker
  imageUri={profileImageUri}
  onImageSelected={(uri) => setProfileImageUri(uri)}
  size={120}
  editable={true}
/>
```

---

## ✅ Tarkistuslista

- [x] ImagePickerService luotu
- [x] AuthService päivitetty
- [x] ProfileImagePicker komponentti luotu
- [x] TeacherSignupScreen integroitu
- [x] ParentSignupScreen integroitu
- [x] FindTeachersScreen päivitetty
- [x] TeacherMyProfileScreen päivitetty
- [x] ParentMyProfileScreen päivitetty
- [x] Firebase Storage rules tarkistettu
- [x] expo-image-picker asennettu

---

## 🎉 Yhteenveto

Profiilikuvien hallinta on nyt täysin toimiva ParentsTeachersApp-sovelluksessa!

**Käyttäjät voivat:**
- Valita profiilikuvan rekisteröityessä
- Muokata profiilikuviaan myöhemmin
- Nähdä muiden käyttäjien profiilikuvia
- Poistaa profiilikuviaan

**Tekninen toteutus:**
- Firebase Storage tallennusta
- Expo Image Picker integraatio
- Uudelleenkäytettävä ProfileImagePicker komponentti
- Turvallinen ja skaalautuva arkkitehtuuri
