# RiffGenerator 🎸

Full-stack sovellus kitarariffien generointiin ja äänitiedostojen MIDI-muuntamiseen.

## 📋 Projektin rakenne

```
riffgenerator/
├── frontend/          # React Native/Expo TypeScript sovellus
│   ├── app/           # Sovelluksen sivut (Expo Router)
│   ├── assets/        # Kuvat ja resurssit
│   ├── package.json   # Frontend riippuvuudet
│   └── ...
├── backend/           # Python Flask API
│   ├── app.py         # Pää-API server
│   ├── riffGenerator.py     # Riffien generointi
│   ├── wavToMidi.py   # Audio -> MIDI muunnos
│   └── requirements.txt     # Python riippuvuudet
├── shared/            # Jaetut tyypit ja utilities
│   ├── types.ts       # TypeScript tyypit
│   └── api.ts         # API client
└── README.md
```

## 🚀 Ominaisuudet

### Backend (Python)
- **Riffien generointi**: Algoritminen musiikkigenerointijärjestelmä
  - Eri tyylit: Rock, Blues, Metal, Funk, Jazz, Acoustic
  - Säädettävä tempo, sävellaji ja pituus
  - Kitaranauha ja nauhan asema -tiedot
- **Audio -> MIDI muunnos**: Äänitiedostojen automaattinen nuottien tunnistus
  - Tue äänitiedostoja: WAV, MP3, FLAC, AIFF
  - Sävelkorkeuden tunnistus ja rytmin analyysi
  - Luottamuspisteet ja tilastot
- **RESTful API**: Flask-pohjainen API frontend-yhteyttä varten

### Frontend (React Native/TypeScript)
- **Cross-platform**: Toimii iOS:lla ja Androidilla (Expo Go)
- **Moderni UI**: Intuitiivinen käyttöliittymä riffien generointiin
- **Real-time yhteys**: Live-yhteys Python backendiin
- **Tyyppiturvallisuus**: TypeScript-pohjainen kehitys

## 🛠️ Asennus ja käyttö

### Backend (Python)

1. **Siirry backend-kansioon:**
```bash
cd backend
```

2. **Luo virtuaaliympäristö:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# TAI
venv\Scripts\activate     # Windows
```

3. **Asenna riippuvuudet:**
```bash
pip install -r requirements.txt
```

4. **Käynnistä server:**
```bash
python app.py
```

Backend pyörii osoitteessa `http://localhost:5000`

### Frontend (React Native)

1. **Siirry frontend-kansioon:**
```bash
cd frontend
```

2. **Asenna riippuvuudet:**
```bash
npm install
```

3. **Käynnistä Expo-serveri:**
```bash
npx expo start
```

4. **Avaa sovellus:**
   - Skannaa QR-koodi Expo Go -sovelluksella (Android)
   - Skannaa QR-koodi kameralla (iOS)

## 🔧 API Endpoints

### Health Check
```http
GET /health
```

### Generoi riffi
```http
POST /api/generate-riff
Content-Type: application/json

{
  "style": "rock",
  "tempo": 120,
  "key": "C",
  "duration": 8
}
```

### Muunna audio MIDI:ksi
```http
POST /api/convert-audio
Content-Type: multipart/form-data

audio: [audio file]
```

### Hae saatavilla olevat tyylit
```http
GET /api/styles
```

### Vie riffi
```http
POST /api/export/{format}
Content-Type: application/json

{
  "riff": {riff_data}
}
```

## 📦 Teknologiat

### Backend
- **Python 3.8+**
- **Flask** - Web framework
- **librosa** - Äänianalyysi
- **numpy/scipy** - Matemaattiset operaatiot
- **music21** - Musiikkiteoria
- **mido** - MIDI-käsittely

### Frontend
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **Expo Router** - Navigation

## 🎵 Riffien generointi

Sovellus käyttää algoritmista komposition järjestelmää:

1. **Sävellaji ja asteikko**: Valitaan sopivia asteikkoja tyyliin perustuen
2. **Rytmipatterns**: Ennalta määritellyt rytmipohjat eri tyyleille
3. **Harmonia**: Sointukulut ja melodiset linjat
4. **Kitaranauhat**: Automaattinen kitaransormituksen optimointi

## 🔊 Audio-analyysi

MIDI-muunnos käyttää kehittyneitä signaalinkäsittelymenetelmiä:

1. **Pitch tracking**: Sävelkorkeuden seuranta librosa-kirjastolla
2. **Onset detection**: Nuottien alkukohtien tunnistus
3. **Note segmentation**: Peräkkäisten sävelten ryhmittely
4. **Confidence scoring**: Luotettavuuspisteytys tuloksille

## 🐛 Vianetsintä

### Backend ei käynnisty
- Varmista että Python 3.8+ on asennettu
- Tarkista että kaikki riippuvuudet on asennettu
- Katso `pip install -r requirements.txt` tuloste virheiden varalta

### Frontend ei yhdistä backendiin
- Varmista että backend pyörii portissa 5000
- Tarkista että laitteet ovat samassa WiFi-verkossa
- iOS: Varmista että kamera-appilla skannaat QR-koodin

### Audio-muunnos epäonnistuu
- Tuetut formaatit: WAV, MP3, FLAC, AIFF
- Maksimi tiedostokoko: 16MB
- Varmista että äänitiedosto sisältää melodista sisältöä

## 🤝 Kehitys

### Uusien ominaisuuksien lisääminen

1. **Uusi riffi-tyyli**:
   - Lisää `RiffStyle` enumiin (`shared/types.ts`)
   - Määrittele rytmipatternit (`riffGenerator.py`)
   - Lisää asteikot ja sointukulut

2. **Uusi audio-formaatti**:
   - Päivitä `ALLOWED_EXTENSIONS` (`app.py`)
   - Testaa librosa-yhteensopivuus

3. **UI-parannukset**:
   - Muokkaa `frontend/app/index.tsx`
   - Päivitä shared-tyypit tarpeen mukaan

### Testaaminen

```bash
# Backend testit
cd backend
python -m pytest

# Frontend testit  
cd frontend
npm test
```

## 📄 Lisenssi

MIT License - katso LICENSE-tiedosto

## 🙋‍♂️ Tuki

Ongelmien kanssa:
1. Tarkista että kaikki riippuvuudet on asennettu
2. Varmista että backend ja frontend pyörivät
3. Katso console/terminal-virheilmoitukset
4. Testaa yhteys `/health` endpointilla

---

*Rakennettu ❤️:lla TypeScriptillä ja Pythonilla*