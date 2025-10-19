# Parents & Teachers App

Globaali mobiilisovellus opettajille, oppilaille ja vanhemmille. Mahdollistaa opettajien löytämisen ja yhteydenpidon maailmanlaajuisesti.

## ✨ Ominaisuudet

### 🎓 Oppilaille
- **Arvosanat**: Tarkastele arvosanojasi reaaliajassa
- **Kotitehtävät**: Näe kaikki kotitehtäväsi ja niiden määräajat
- **Aikataulu**: Henkilökohtainen lukujärjestys
- **Viestit**: Keskustele opettajien kanssa
- **Profiili**: Omat tietosi ja asetukset

### 👨‍🏫 Opettajille
- **Opettajaprofiili**: Luo kattava profiili osaamisalueistasi
- **Globaali näkyvyys**: Tarjoa palveluitasi maailmanlaajuisesti
- **Oppilaat**: Hallinnoi oppilaita ja heidän tietojaan
- **Arviointi**: Anna arvosanoja ja palautetta
- **Tehtävät**: Luo ja hallinnoi kotitehtäviä
- **Hinnoittelu**: Aseta omat tuntihinnat
- **Saatavuus**: Määritä verkko- ja lähiopetuksen saatavuus

### 👨‍👩‍👧‍👦 Vanhemmille
- **Opettajien haku**: Löydä parhaita opettajia maailmanlaajuisesti
- **Suodattimet**: Hae aiheittain, hinnan mukaan tai sijainnin perusteella
- **Arvostelut**: Lue muiden vanhempien kokemuksia
- **Suosikit**: Tallenna parhaat opettajat
- **Varaukset**: Varaa tunteja ja hallinnoi aikatauluja
- **Viestit**: Keskustele opettajien kanssa suoraan

## 🚀 Teknologia

- **React Native** & **Expo** - Cross-platform mobiilisovellus
- **Firebase Authentication** - Turvallinen käyttäjien hallinta
- **Firestore Database** - Reaaliaikainen NoSQL tietokanta
- **Firebase Storage** - Tiedostojen tallennukseen
- **React Navigation** - Saumaton navigointi
- **AsyncStorage** - Paikallinen tallennustila

## 📱 Asennus ja käyttöönotto

1. **Kloonaa repositorio**
   ```bash
   git clone [repository-url]
   cd ParentsTeachersApp
   ```

2. **Asenna riippuvuudet**
   ```bash
   npm install
   ```

3. **Firebase Setup (Valinnainen)**
   - Luo Firebase-projekti [Firebase Console:ssa](https://console.firebase.google.com/)
   - Ota käyttöön Authentication ja Firestore
   - Päivitä `src/config/firebaseConfig.js` omilla tiedoillasi

4. **Käynnistä sovellus**
   ```bash
   npm start
   ```

5. **Testaa sovellusta**
   - **Mobiili**: Skannaa QR-koodi Expo Go -sovelluksella
   - **Web**: Paina `w` terminaalissa
   - **Android**: Paina `a` terminaalissa

## 🔐 Käyttö

### Roolin valinta ja kirjautuminen
1. Valitse roolisi: **Oppilas**, **Opettaja** tai **Vanhempi**
2. Syötä tietosi (demo toimii ilman oikeaa Firebasea)
3. Kirjaudu sisään automaattisella rekisteröinnillä

### Opettajaprofiili
1. Kirjaudu opettajana
2. Siirry "Profiili" -välilehdelle
3. Täytä tietosi:
   - Opetettavat aineet
   - Tuntihinta
   - Kokemus ja koulutus
   - Saatavuus
   - Kuvaus itsestäsi

### Opettajien haku
1. Kirjaudu vanhempana
2. Valitse "Etsi opettajia"
3. Käytä hakua ja suodattimia
4. Ota yhteyttä sopiviin opettajiin

## 📁 Tiedostorakenne

```
src/
├── components/          # Uudelleenkäytettävät komponentit
├── config/             # Firebase ja muut konfiguraatiot
│   └── firebaseConfig.js   # Firebase asetukset
├── context/            # React Context (AuthContext)
│   └── AuthContext.js      # Käyttäjien hallinta
├── screens/            # Sovelluksen näkymät
│   ├── WelcomeScreen.js        # Aloitusnäkymä
│   ├── LoginScreen.js          # Kirjautumisnäkymä
│   ├── StudentDashboard.js     # Oppilaan päävalikko
│   ├── TeacherDashboard.js     # Opettajan päävalikko
│   ├── ParentDashboard.js      # Vanhemman päävalikko
│   ├── TeacherProfileScreen.js # Opettajaprofiili
│   └── FindTeachersScreen.js   # Opettajien haku
└── styles/             # Tyylit ja värit
    └── commonStyles.js     # Yleiset tyylit
```

## 🎨 Värimaailma

- **Oppilas**: Vihreä (#4CAF50)
- **Opettaja**: Oranssi (#FF9800) 
- **Vanhempi**: Pinkki (#E91E63)
- **Tausta**: Vaaleanharmaa (#F5F5F5)
- **Teksti**: Tummanharmonaa (#333333)

## 🔥 Firebase-tietokannan rakenne

```
users/
  {userId}/
    - name: string
    - email: string
    - userType: 'student' | 'teacher' | 'parent'
    - createdAt: timestamp

teacherProfiles/
  {teacherId}/
    - teacherName: string
    - subjects: string
    - hourlyRate: string
    - location: string
    - experience: string
    - education: string
    - languages: string
    - description: string
    - availability: string
    - onlineTeaching: boolean
    - inPersonTeaching: boolean
    - isActive: boolean
    - createdAt: timestamp
    - updatedAt: timestamp
```

## 🌟 Demo-ominaisuudet

Sovellus toimii demo-tilassa ilman Firebase-yhteyttä:
- **Autentikointi**: Toimii paikallisesti AsyncStoragella
- **Demo-data**: Esimerkki opettajia hakutoimintoa varten
- **Offline-toiminta**: Kaikki perustoiminnot käytettävissä

## 🚀 Tulevaisuuden kehitysideat

- [ ] **Reaaliaikainen chat** - WebSocket-pohjaiset viestit
- [ ] **Video-puhelut** - Integrointi video-alustaan
- [ ] **Maksujen käsittely** - Stripe/PayPal integraatio
- [ ] **Kalenteritoiminnot** - Tuntien varaus ja aikataulutus
- [ ] **Push-notifikaatiot** - Ilmoitukset viesteistä ja varauksista
- [ ] **Arvostelujärjestelmä** - Opettajien arviointi
- [ ] **Suositusten AI** - Älykkäät opettajasuositukset
- [ ] **Monikielisyys** - Kansainvälinen käyttö
- [ ] **Tiedostojen jakaminen** - Materiaalien jakaminen
- [ ] **Ryhmätunnit** - Usean oppilaan tunnit

## 📄 Lisenssit

MIT License - Vapaasti käytettävissä kehitystarkoituksiin.