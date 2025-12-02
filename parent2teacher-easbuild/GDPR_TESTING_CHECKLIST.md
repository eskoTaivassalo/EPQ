# GDPR Integration - Testing Checklist

## ✅ Integration valmis!

### Tehdyt muutokset App.js:ään:

1. ✅ Importattu `CookieConsentBanner` komponentti
2. ✅ Importattu `GDPRService`
3. ✅ Lisätty `showConsentBanner` state
4. ✅ Lisätty `useEffect` consent-tarkistukseen
5. ✅ Lisätty `handleConsentGiven` callback
6. ✅ Lisätty `CookieConsentBanner` renderöintiin

---

## 🧪 Testausohje

### 1. Tyhjennä AsyncStorage (pakota banner näkyviin)

Avaa React Native Debugger tai lisää väliaikaisesti App.js:ään:

```javascript
// TESTAUS: Lisää AppNavigator komponentin alkuun
useEffect(() => {
  const clearConsent = async () => {
    await AsyncStorage.removeItem('gdpr_consent');
    console.log('🗑️ Cleared GDPR consent for testing');
  };
  // clearConsent(); // Uncomment tätä testataksesi banneria
}, []);
```

### 2. Käynnistä sovellus

```bash
# Terminaalissa
npm start
```

Tai jos Metro bundler on jo käynnissä, reload sovellus:
- iOS: Cmd + R
- Android: R + R
- Expo Go: Ravista laitetta > Reload

### 3. Tarkista konsoli

Etsi konsolista:
```
📋 Should show GDPR banner: true/false
```

Jos `true`, banner pitäisi näkyä.

### 4. Testaa Banner UI

#### A) Ensimmäinen lataus (ei tallennettuja asetuksia):
- [ ] Banner näkyy ruudun alaosassa
- [ ] Näkyy shield-ikoni ja otsikko "Tietosuoja & Evästeet"
- [ ] Näkyy 3 nappia: "Hyväksy kaikki", "Hylkää valinnaiset", "Muokkaa asetuksia"

#### B) "Hyväksy kaikki" -nappi:
- [ ] Nappi sulkee bannerin
- [ ] Konsoli näyttää: `✅ User consents saved:`
- [ ] Konsoli näyttää: `📊 Analytics consent given`
- [ ] Konsoli näyttää: `📢 Marketing consent given`
- [ ] Banner ei näy uudelleen seuraavalla latauskerralla

#### C) "Hylkää valinnaiset" -nappi:
- [ ] Nappi sulkee bannerin
- [ ] Konsoli näyttää saved consents (vain necessary: true)
- [ ] Banner ei näy uudelleen

#### D) "Muokkaa asetuksia" -nappi:
- [ ] Avaa full-screen modal
- [ ] Modal näyttää kaikki 4 consent-tyyppiä:
  - Välttämättömät evästeet (PAKOLLINEN badge, toggle disabled)
  - Analytiikka (toggle toimii)
  - Markkinointi (toggle toimii)
  - Henkilökohtaistaminen (toggle toimii)
- [ ] Jokainen tyyppi näyttää kuvauksen
- [ ] "Tallenna asetukset" nappi toimii
- [ ] Modal sulkeutuu tallennuksen jälkeen
- [ ] Konsoli näyttää tallennetut asetukset

### 5. Testaa AsyncStorage tallennus

#### Avaa React Native Debugger:

```javascript
// Konsolissa:
AsyncStorage.getItem('gdpr_consent').then(data => console.log(JSON.parse(data)))
```

Pitäisi näyttää:
```json
{
  "necessary": true,
  "analytics": true/false,
  "marketing": true/false,
  "personalization": true/false,
  "timestamp": "2025-10-20T...",
  "version": "1.0"
}
```

### 6. Testaa 365 päivän logiikka

#### Muokkaa GDPRService.js väliaikaisesti (rivi ~116):

```javascript
// Vaihda 365 -> 0 testausta varten
if (daysSinceConsent > 0) {  // Oli: > 365
  return true;
}
```

- [ ] Banner näkyy joka kerta vaikka on tallennettu
- [ ] Palauta takaisin 365 kun testaus valmis

### 7. Testaa eri skenaarioita

#### Skenaario A: Uusi käyttäjä
1. Poista AsyncStorage consent
2. Avaa app
3. Pitäisi nähdä banner ✅

#### Skenaario B: Vanhat asetukset
1. Tallenna consent
2. Sulje app
3. Avaa app uudelleen
4. Ei pitäisi näkyä banneria ✅

#### Skenaario C: Vanhentuneet asetukset
1. Tallenna consent vanhalla timestampilla
2. Avaa app
3. Pitäisi nähdä banner uudelleen ✅

---

## 🐛 Troubleshooting

### Banner ei näy vaikka pitäisi:

**1. Tarkista AsyncStorage:**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// App.js useEffect:ssä
const debug = async () => {
  const consent = await AsyncStorage.getItem('gdpr_consent');
  console.log('Current consent:', consent);
};
debug();
```

**2. Tarkista state:**
```javascript
// Lisää AppNavigator:iin
console.log('showConsentBanner state:', showConsentBanner);
```

**3. Tarkista GDPRService:**
```javascript
// useEffect:ssä
const shouldShow = await GDPRService.shouldShowConsentBanner();
console.log('shouldShowConsentBanner returned:', shouldShow);
```

### Banner ei sulkeudu:

**1. Tarkista callback:**
```javascript
const handleConsentGiven = async (consents) => {
  console.log('Callback called with:', consents);
  setShowConsentBanner(false);  // Varmista että tämä suoritetaan
};
```

**2. Tarkista save toiminto:**
```javascript
// CookieConsentBanner.js
await GDPRService.saveConsentSettings(allConsents);
console.log('Consents saved successfully');
onConsentGiven?.(allConsents);  // Tarkista että callback kutsutaan
```

### Styling-ongelmat:

**Banner liian korkealla/matalalla:**
```javascript
// CookieConsentBanner.js styles
banner: {
  position: 'absolute',
  bottom: 0,  // Muuta tätä tarvittaessa
  left: 0,
  right: 0,
  // ...
}
```

### Import-virheet:

**Jos tulee `GDPRService default export` virhe:**

Tarkista että `gdprService.js` lopussa on:
```javascript
export default GDPRService;
```

Ja että import on:
```javascript
import GDPRService from '../services/gdprService';
```

---

## ✅ Onnistuneen testin tarkistuslista

- [ ] Banner näkyy ensimmäisellä avauksella
- [ ] "Hyväksy kaikki" toimii ja tallentaa
- [ ] "Hylkää valinnaiset" toimii ja tallentaa
- [ ] "Muokkaa asetuksia" avaa modalin
- [ ] Modal togglet toimivat
- [ ] "Tallenna asetukset" sulkee modalin
- [ ] Konsoli näyttää oikeat viestit
- [ ] AsyncStorage sisältää oikean datan
- [ ] Banner ei näy uudelleen kun tallennettu
- [ ] Ei ole error-viestejä konsolissa
- [ ] App toimii normaalisti bannerin jälkeen

---

## 🎉 Seuraavat askeleet

Kun perus-toiminnallisuus on testattu ja toimii:

1. **Privacy Settings -sivu** (valinnainen)
   - Katso `GDPR_INTEGRATION_GUIDE.md`
   - Lisää profiiliasetuksiin
   - Data export & Account deletion

2. **Analytics integration**
   - Tarkista consent ennen trackaamista
   - `if (await GDPRService.hasConsent('analytics')) { trackEvent(); }`

3. **Marketing integration**
   - Tarkista consent ennen kohdennusta
   - Email marketing vaatii explicit consent

4. **Privacy Policy -sivu**
   - Luo markdown tai webview sivu
   - Linkitä bannerista ja asetuksista

5. **Production audit logging**
   - Tallenna GDPR events tietokantaan
   - Compliance dokumentaatio

---

**Muista:** Palauta kaikki testauksessa tehdyt väliaikaiset muutokset (esim. 365 -> 0) takaisin normaaliksi!

