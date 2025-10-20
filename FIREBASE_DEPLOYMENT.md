# 🚀 Firebase Security Rules Deployment Guide

## Yleiskatsaus

Tämä ohje neuvoo miten deploy Firebase Security Rules tuotantoon.

**⚠️ TÄRKEÄÄ:** Älä koskaan deploy tyhjää tai liian sallivaa Security Rules tuotantoon!

---

## 📋 Edellytykset

1. **Firebase CLI** asennettu
2. **Firebase Project** luotu (parents2teachers-1d8a3)
3. **Kirjautuminen** Firebase:en

---

## 🔧 Asennus ja Konfigurointi

### 1. Asenna Firebase CLI (jos ei ole vielä asennettu)

```bash
npm install -g firebase-tools
```

### 2. Kirjaudu Firebase:en

```bash
firebase login
```

Tämä avaa selaimen ja pyytää kirjautumaan Google-tilillä.

### 3. Yhdistä projekti Firebase:en

```bash
# Projektin juuressa
cd ParentsTeachersApp

# Alusta Firebase
firebase init

# Vastaa kysymyksiin:
# ? Which Firebase features do you want to set up?
#   → Valitse: Firestore, Storage (välilyönnillä)
#
# ? Please select an option:
#   → Use an existing project
#
# ? Select a default Firebase project:
#   → parents2teachers-1d8a3
#
# ? What file should be used for Firestore Rules?
#   → firestore.rules (ENTER - käytä olemassa olevaa)
#
# ? What file should be used for Firestore indexes?
#   → firestore.indexes.json (ENTER - käytä olemassa olevaa)
#
# ? What file should be used for Storage Rules?
#   → storage.rules (ENTER - käytä olemassa olevaa)
```

---

## 📤 Deployment

### Deploy kaikki Security Rules

```bash
# Deployaa sekä Firestore että Storage rules
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

### Deploy erikseen

```bash
# Vain Firestore rules
firebase deploy --only firestore:rules

# Vain Storage rules
firebase deploy --only storage:rules

# Vain indeksit
firebase deploy --only firestore:indexes
```

---

## ✅ Varmista deployment

### 1. Firebase Console

Mene: https://console.firebase.google.com/project/parents2teachers-1d8a3

**Firestore Rules:**
- Firestore Database → Rules
- Tarkista että rules näkyvät oikein
- Klikkaa "Publish" jos tarvitaan

**Storage Rules:**
- Storage → Rules
- Tarkista että rules näkyvät oikein

**Indexes:**
- Firestore Database → Indexes
- Tarkista että kaikki 7 composite indexiä ovat "Enabled"

### 2. Testaa sovelluksella

```bash
# Käynnistä sovellus
npm start

# Testaa:
# 1. Kirjautuminen
# 2. Profiilin luonti
# 3. Opettajien haku
# 4. Profiilin muokkaus
```

Jos saat "Permission denied" virheitä, tarkista:
1. Onko käyttäjä kirjautunut?
2. Onko rules deployttu oikein?
3. Onko userId sama kuin Firebase Auth uid?

---

## 🧪 Testaus emulatorilla (Kehitystyö)

### 1. Käynnistä emulator

```bash
firebase emulators:start
```

### 2. Käytä emulaattoria sovelluksessa

**firebaseConfig.js** päivitys (VAIN DEVELOPMENT):

```javascript
// Lisää jos haluat käyttää emulaattoria
if (__DEV__) {
  const { connectAuthEmulator } = require('firebase/auth');
  const { connectFirestoreEmulator } = require('firebase/firestore');
  const { connectStorageEmulator } = require('firebase/storage');
  
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

### 3. Emulator UI

Avaa selaimessa: http://localhost:4000

Täältä näet:
- Authentication users
- Firestore data
- Storage files
- Security rules validation

---

## 🔍 Rules Validation

### Testaa rules Firebase Console:ssa

1. Mene: Firestore → Rules
2. Klikkaa "Rules Playground"
3. Testaa eri skenaarioita:

**Esimerkki: Lue opettajan profiili**
```
Location: /teachers/abc123
Operation: get
Authenticated: Yes
Auth UID: abc123
```

**Tulos:** ✅ Allow (koska on kirjautunut)

**Esimerkki: Muokkaa toisen opettajan profiilia**
```
Location: /teachers/xyz789
Operation: update
Authenticated: Yes
Auth UID: abc123
```

**Tulos:** ❌ Deny (koska ei ole omistaja)

---

## 📊 Monitoring

### Firebase Console Metrics

Mene: Firestore → Usage

Seuraa:
- **Reads/Writes per day** - Maksimi quotat
- **Storage size** - Tietokannan koko
- **Network egress** - Datan siirto

### Logs

Mene: Firestore → Logs (Cloud Logging)

Etsi:
- `denied` - Permission denied virheet
- `security.rules` - Rules evaluations

---

## 🚨 Troubleshooting

### ❌ "Permission denied" virheet

**Ongelma:** Käyttäjä ei pääse lukemaan/kirjoittamaan dataa

**Ratkaisu:**
1. Tarkista että käyttäjä on kirjautunut (`auth.currentUser`)
2. Tarkista että `userId` matchaa `auth.uid`
3. Tarkista että rules on deployttu
4. Tarkista Firebase Console → Firestore → Rules

### ❌ "Missing index" virheet

**Ongelma:** Composite index puuttuu querylle

**Ratkaisu:**
1. Klikkaa virheilmoituksen linkki → luo index automaattisesti
2. TAI deployaa indeksit: `firebase deploy --only firestore:indexes`

### ❌ "Resource exhausted" virheet

**Ongelma:** Liikaa lukuja/kirjoituksia

**Ratkaisu:**
1. Tarkista Firebase Console → Firestore → Usage
2. Optimoi kyselyt (käytä cachea, limitoi tuloksia)
3. Harkitse Firebase Blaze -plania

---

## 📝 Deployment Checklist

- [ ] Firebase CLI asennettu
- [ ] Kirjauduttu Firebase:en (`firebase login`)
- [ ] Projekti alustettu (`firebase init`)
- [ ] Rules tiedostot luotu:
  - [ ] `firestore.rules`
  - [ ] `storage.rules`
  - [ ] `firestore.indexes.json`
  - [ ] `firebase.json`
- [ ] Rules deployttu: `firebase deploy --only firestore:rules,storage:rules,firestore:indexes`
- [ ] Firebase Console tarkistettu
- [ ] Emulator-testaus tehty (optional)
- [ ] Production-testaus test-accounteilla
- [ ] Monitoring konfiguroitu

---

## 🔐 Turvallisuussuositukset

1. ✅ **Älä koskaan deploy ilman validointia**
2. ✅ **Testaa emulatorilla ensin**
3. ✅ **Käytä tuotanto-accounttia testaukseen ennen julkaisua**
4. ✅ **Seuraa Firebase Console logs**
5. ✅ **Päivitä rules säännöllisesti kun sovellus kehittyy**
6. ✅ **Dokumentoi kaikki muutokset**

---

## 📞 Support

**Firebase Documentation:** https://firebase.google.com/docs/rules  
**Firebase Console:** https://console.firebase.google.com  
**Stack Overflow:** `firebase-security-rules` tag

---

**Viimeksi päivitetty:** 2025-10-20
