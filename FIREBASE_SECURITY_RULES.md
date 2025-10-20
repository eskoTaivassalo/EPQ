# Firebase Security Rules - Dokumentaatio

## 📋 Yleiskatsaus

Tämä dokumentti kuvaa Parents&Teachers -sovelluksen Firebase Security Rules -konfiguraation.

**Luotu:** 20.10.2025  
**Versio:** 1.0  
**Status:** ✅ Tuotantovalmis

---

## 🔐 Turvallisuusperiaatteet

### Perusturvallisuus
1. **Autentikointi pakollinen** - Kaikki toiminnot vaativat kirjautumisen
2. **Omistajuusvalidointi** - Käyttäjät voivat muokata vain omia tietojaan
3. **Email-verifiointi** - Tietyt toiminnot vaativat vahvistetun sähköpostin
4. **Datavalidointi** - Kaikki kentät validoidaan ennen tallennusta
5. **Tyyppiturvallisuus** - Kentille on määritelty tietotyypit ja rajoitukset

---

## 📁 Firestore Security Rules

### Tiedosto: `firestore.rules`

#### 🔧 Helper-funktiot

```javascript
isAuthenticated()      // Tarkistaa onko käyttäjä kirjautunut
isOwner(userId)        // Tarkistaa onko käyttäjä dokumentin omistaja
isEmailVerified()      // Tarkistaa onko email verifioitu
hasField(field)        // Validoi että kenttä on olemassa
isValidString(field)   // Validoi että kenttä on ei-tyhjä string
isValidEmail(email)    // Validoi email-formaatti regex:llä
```

---

### 📚 Kokoelmat (Collections)

#### 1. `/users/{userId}`

**Käyttötarkoitus:** Yleinen käyttäjädata kaikille käyttäjille

**Käyttöoikeudet:**
- **Read:** ✅ Kaikki kirjautuneet käyttäjät
- **Create:** ✅ Vain oma profiili (userId match)
- **Update:** ✅ Vain oma profiili
- **Delete:** ✅ Vain oma profiili

**Pakolliset kentät:**
- `email` (string, email-formaatti)
- `userType` (string: 'teacher' | 'parent')
- `createdAt` (timestamp)

---

#### 2. `/teachers/{teacherId}`

**Käyttötarkoitus:** Opettajien profiilit ja julkinen data

**Käyttöoikeudet:**
- **Read:** ✅ Kaikki kirjautuneet käyttäjät (opettajahaku)
- **Create:** ✅ Vain oma profiili (teacherId == auth.uid)
- **Update:** ✅ Vain oma profiili (ei voi muuttaa userType:a)
- **Delete:** ✅ Vain oma profiili

**Pakolliset kentät:**
- `name` (string, ei-tyhjä)
- `email` (string, email-formaatti)
- `userType` (string, pakko olla 'teacher')
- `createdAt` (timestamp)

**Lisäkentät (valinnaisia):**
- `subjects` (array)
- `location` (array)
- `languages` (array)
- `teachingMethods` (array)
- `experience` (string)
- `priceRange` (object)
- `bio` (string)
- `phone` (string)

---

#### 3. `/parents/{parentId}`

**Käyttötarkoitus:** Vanhempien profiilit

**Käyttöoikeudet:**
- **Read:** ✅ Kaikki kirjautuneet käyttäjät
- **Create:** ✅ Vain oma profiili (parentId == auth.uid)
- **Update:** ✅ Vain oma profiili (ei voi muuttaa userType:a)
- **Delete:** ✅ Vain oma profiili

**Pakolliset kentät:**
- `name` (string, ei-tyhjä)
- `email` (string, email-formaatti)
- `userType` (string, pakko olla 'parent')
- `createdAt` (timestamp)

**Lisäkentät (valinnaisia):**
- `phoneNumber` (string)
- `location` (array)
- `childrenAges` (string)
- `specificNeeds` (string)
- `lookingFor` (array)

---

#### 4. `/messages/{messageId}` 🔮 (Tuleva ominaisuus)

**Käyttötarkoitus:** Viestit opettajien ja vanhempien välillä

**Käyttöoikeudet:**
- **Read:** ✅ Vain lähettäjä tai vastaanottaja
- **Create:** ✅ Vain kirjautunut käyttäjä (senderId match)
- **Update:** ✅ Lähettäjä tai vastaanottaja (esim. "luettu" status)
- **Delete:** ✅ Vain lähettäjä

**Pakolliset kentät:**
- `senderId` (string)
- `receiverId` (string)
- `content` (string, ei-tyhjä)
- `timestamp` (timestamp)

---

#### 5. `/conversations/{conversationId}` 🔮 (Tuleva ominaisuus)

**Käyttötarkoitus:** Keskusteluketjut

**Käyttöoikeudet:**
- **Read:** ✅ Vain keskustelun osapuolet
- **Create/Update:** ✅ Vain osallistujat
- **Delete:** ❌ Ei kukaan (vaatii Admin SDK:n)

**Pakolliset kentät:**
- `participants` (array of userIds)

---

#### 6. `/reviews/{reviewId}` 🔮 (Tuleva ominaisuus)

**Käyttötarkoitus:** Opettajien arvostelut

**Käyttöoikeudet:**
- **Read:** ✅ Kaikki kirjautuneet käyttäjät
- **Create:** ✅ Vain vanhemmat + email verifioitu
- **Update:** ✅ Vain kirjoittaja (24h sisällä luomisesta)
- **Delete:** ✅ Vain kirjoittaja

**Pakolliset kentät:**
- `teacherId` (string)
- `parentId` (string, must match auth.uid)
- `rating` (number, 1-5)
- `timestamp` (timestamp)

**Validointi:**
- Rating: 1 ≤ rating ≤ 5
- Update deadline: 24h luomisesta

---

#### 7. `/bookings/{bookingId}` 🔮 (Tuleva ominaisuus)

**Käyttötarkoitus:** Tuntivaraukset

**Käyttöoikeudet:**
- **Read:** ✅ Vain varauksen osapuolet (teacher tai parent)
- **Create:** ✅ Vain vanhempi
- **Update:** ✅ Sekä opettaja että vanhempi
- **Delete:** ✅ Kumpikin osapuoli voi peruuttaa

**Pakolliset kentät:**
- `teacherId` (string)
- `parentId` (string, must match auth.uid when creating)
- `date` (timestamp)
- `status` (string, must be 'pending' when creating)

---

## 📦 Firebase Storage Rules

### Tiedosto: `storage.rules`

#### 🖼️ Profiilikuvat

**Polku:** `/profiles/{userId}/{filename}`

**Käyttöoikeudet:**
- **Read:** ✅ Kaikki kirjautuneet käyttäjät
- **Write:** ✅ Vain oma kansio (userId match)
- **Delete:** ✅ Vain oma kansio

**Rajoitukset:**
- Max koko: 5MB
- Sallitut tyypit: `image/*` (jpg, png, gif, webp, etc.)

---

#### 📎 Viestin liitteet 🔮 (Tuleva ominaisuus)

**Polku:** `/messages/{senderId}/{messageId}/{filename}`

**Käyttöoikeudet:**
- **Read:** ✅ Kirjautuneet (vaatii Firestore-validoinnin)
- **Write:** ✅ Vain lähettäjä (senderId match)
- **Delete:** ✅ Vain lähettäjä

**Rajoitukset:**
- Max koko: 5MB
- Sallitut tyypit: 
  - Kuvat: `image/*`
  - PDF: `application/pdf`
  - Word: `application/msword`, `application/vnd.openxmlformats-officedocument.*`

---

#### 📄 Opettajan dokumentit 🔮 (Tuleva ominaisuus)

**Polku:** `/teachers/{teacherId}/documents/{filename}`

**Käyttötarkoitus:** CV, todistukset, sertifikaatit

**Käyttöoikeudet:**
- **Read:** ✅ Vain opettaja itse
- **Write:** ✅ Vain opettaja itse
- **Delete:** ✅ Vain opettaja itse

**Rajoitukset:**
- Max koko: 5MB
- Sallitut tyypit: `image/*`, `application/pdf`

---

## 🚀 Deployment-ohjeet

### 1. Firebase CLI Asennus

```bash
npm install -g firebase-tools
firebase login
```

### 2. Firebase Projektin Alustus

```bash
firebase init
```

Valitse:
- ✅ Firestore
- ✅ Storage
- Käytä olemassa olevia tiedostoja: `firestore.rules`, `storage.rules`

### 3. Security Rules Deployment

```bash
# Deploy kaikki säännöt
firebase deploy --only firestore:rules,storage:rules

# Tai erikseen
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 4. Indeksien Deployment

```bash
firebase deploy --only firestore:indexes
```

---

## 🧪 Testaus

### Local Emulator

```bash
# Käynnistä emulator
firebase emulators:start

# UI: http://localhost:4000
# Firestore: http://localhost:8080
# Auth: http://localhost:9099
# Storage: http://localhost:9199
```

### Testausskriptit (Tulevaisuudessa)

```bash
npm run test:security:rules
```

---

## ⚠️ Turvallisuushuomiot

### ✅ Toteutettu

1. ✅ Autentikointi pakollinen kaikissa kokoelmissa
2. ✅ Omistajuusvalidointi kaikissa CRUD-operaatioissa
3. ✅ Email-verifiointi arvosteluissa
4. ✅ Datavalidointi (pakolliset kentät, tietotyypit)
5. ✅ UserType immutability (ei voi vaihtaa teacher ↔ parent)
6. ✅ Tiedostokoko- ja tyyppivalidointi
7. ✅ Aikaperusteinen päivitysvalidointi (arvostelut 24h)

### 🔮 Tulevaisuudessa

1. 🔮 Rate limiting (esim. max 10 viestiä/minuutti)
2. 🔮 Profanity filter viesteissä
3. 🔮 Advanced validation custom functions
4. 🔮 Admin-rooli erityisoikeuksilla
5. 🔮 Audit logging

---

## 📊 Suorituskyky

### Indeksit

Firestore vaatii composite indeksejä seuraaviin queryihin:

1. **Opettajahaku aineilla + järjestys**
   - `teachers` → `subjects` (CONTAINS) + `createdAt` (DESC)

2. **Opettajahaku sijainnilla + järjestys**
   - `teachers` → `location` (CONTAINS) + `createdAt` (DESC)

3. **Viestit vastaanottajalle + aikajärjestys**
   - `messages` → `receiverId` (ASC) + `timestamp` (DESC)

4. **Viestit lähettäjältä + aikajärjestys**
   - `messages` → `senderId` (ASC) + `timestamp` (DESC)

5. **Arvostelut opettajalle + aikajärjestys**
   - `reviews` → `teacherId` (ASC) + `timestamp` (DESC)

6. **Varaukset opettajalle + päivämäärä**
   - `bookings` → `teacherId` (ASC) + `date` (ASC)

7. **Varaukset vanhemmalle + päivämäärä**
   - `bookings` → `parentId` (ASC) + `date` (ASC)

---

## 🔄 Päivityshistoria

| Päivä | Versio | Muutokset |
|-------|--------|-----------|
| 2025-10-20 | 1.0 | Ensimmäinen tuotantoversio - kaikki peruskokoelmat |

---

## 📞 Yhteystiedot & Tuki

**Kehittäjä:** ParentsTeachers Team  
**Firebase Project:** parents2teachers-1d8a3  
**Support:** Firebase Console → Security Rules

---

## ✅ Checklist ennen tuotantoa

- [x] `firestore.rules` luotu
- [x] `storage.rules` luotu
- [x] `firebase.json` konfiguroitu
- [x] `firestore.indexes.json` luotu
- [ ] Security rules deployed Firebase:en
- [ ] Indeksit deployed Firebase:en
- [ ] Emulator-testaus suoritettu
- [ ] Production-testaus tehty test-accounteilla
- [ ] Security audit suoritettu

---

**🔐 MUISTA:** Älä koskaan deploy tyhjää tai liian salliva Security Rules tuotantoon!
