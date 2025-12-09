# RiffGenerator Frontend

React Native/Expo TypeScript sovellus kitarariffien generointiin.

## 🚀 Käynnistys

### Vaatimukset
- Node.js 16+
- npm tai yarn
- Expo Go -sovellus puhelimessa

### Asennus

1. **Asenna riippuvuudet:**
```bash
npm install
```

2. **Käynnistä Expo-server:**
```bash
npx expo start
```

3. **Avaa sovellus:**
   - **Android**: Skannaa QR-koodi Expo Go -sovelluksella
   - **iOS**: Skannaa QR-koodi kameralla

## 📁 Tiedostorakenne

- `app/` - Sovelluksen sivut (Expo Router)
  - `index.tsx` - Pääsivu
  - `_layout.tsx` - Layout-komponentti
- `assets/` - Kuvat ja resurssit
- `package.json` - Frontend riippuvuudet
- `app.json` - Expo-konfiguraatio

## 🔗 Backend-yhteys

Sovellus yhdistää Python-backendiin:
- **Development**: `http://localhost:5000`
- **Production**: Määritetään `shared/api.ts`:ssä

### API-yhteyden testaus
Sovellus näyttää yhteystilan header-palkissa:
- 🟢 **Connected** - Backend tavoitettavissa
- 🔴 **Disconnected** - Backend ei tavoitettavissa

## 🎨 UI-komponentit

### Pääsivu (`app/index.tsx`)
- Riffien generointi-kontrollit
- Tyylivalitsin (Rock, Blues, Metal, jne.)
- Tempo-säätö
- Generoidun riffin näyttö

### Kontrollit
- **Style Selector**: Vaakasuunnassa vieritettävä tyylivalitsin
- **Tempo Controls**: +/- napit tempon säätöön (60-200 BPM)
- **Generate Button**: Riffin generointi (deaktivoituu jos ei yhteyttä)

## 🔧 Kehitys

### Uuden komponentin lisääminen
```typescript
// components/NewComponent.tsx
import React from 'react';
import { View, Text } from 'react-native';

export const NewComponent = () => {
  return (
    <View>
      <Text>Uusi komponentti</Text>
    </View>
  );
};
```

### Uuden sivun lisääminen
```typescript
// app/newpage.tsx  
import React from 'react';
import { View, Text } from 'react-native';

export default function NewPage() {
  return (
    <View>
      <Text>Uusi sivu</Text>
    </View>
  );
}
```

## 📱 Expo-komennot

```bash
# Käynnistä development server
npx expo start

# Käynnistä Android-emulaattorissa
npx expo start --android

# Käynnistä iOS-simulaattorissa  
npx expo start --ios

# Käynnistä web-selaimessa
npx expo start --web

# Puhdista cache
npx expo start --clear
```

## 🐛 Vianetsintä

### Sovellus ei käynnisty
```bash
# Puhdista node_modules ja asenna uudelleen
rm -rf node_modules package-lock.json
npm install

# Puhdista Expo cache
npx expo start --clear
```

### Ei yhteyttä backendiin
1. Varmista että backend pyörii (`http://localhost:5000/health`)
2. Tarkista että laitteet ovat samassa WiFi-verkossa
3. Tarkista IP-osoite `shared/api.ts`:ssä

### Metro bundler virheet
```bash
# Sammuta kaikki Metro-prosessit
npx expo r -c

# Uudelleenkäynnistä puhtaalta pöydältä
npx expo start --clear --reset-cache
```

## 📦 Riippuvuudet

Tärkeimmät riippuvuudet:
- **expo**: Expo platform
- **react-native**: Mobile framework  
- **expo-router**: File-based navigation
- **typescript**: Type safety

## 🎯 Ominaisuudet

### Toteutettu
- ✅ Backend-yhteys
- ✅ Riffien generointi
- ✅ Tyylivalinta
- ✅ Tempo-kontrollit
- ✅ Real-time tilakuvat

### Tulossa
- 🔄 Audio-tiedostojen lataus
- 🔄 MIDI-soitin
- 🔄 Riffien tallennus
- 🔄 Jaetut riffipankit