# RiffGenerator Backend

Python Flask API backend kitarariffien generointiin ja audio-MIDI muuntamiseen.

## 🚀 Käynnistys

### Vaatimukset
- Python 3.8+
- pip (Python package manager)

### Asennus

1. **Luo virtuaaliympäristö:**
```bash
python -m venv venv
```

2. **Aktivoi virtuaaliympäristö:**
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Asenna riippuvuudet:**
```bash
pip install -r requirements.txt
```

4. **Käynnistä server:**
```bash
python app.py
```

Server pyörii osoitteessa: `http://localhost:5000`

## 📁 Tiedostorakenne

- `app.py` - Pää Flask-server ja API endpoints
- `riffGenerator.py` - Musiikkigeneroinnin logiikka
- `wavToMidi.py` - Audio-tiedostojen MIDI-muunnos
- `requirements.txt` - Python-riippuvuudet

## 🔧 API Endpoints

### Health Check
```http
GET /health
```

### Generoi riffi
```http
POST /api/generate-riff
```

### Muunna audio
```http
POST /api/convert-audio
```

### Hae tyylit
```http
GET /api/styles
```

### Vie riffi
```http
POST /api/export/{format}
```

## 🧪 Testaus

```bash
# Asenna testriippuvuudet
pip install pytest pytest-flask

# Aja testit
python -m pytest
```

## 🐛 Vianetsintä

### ModuleNotFoundError
```bash
pip install -r requirements.txt
```

### Port already in use
Vaihda portti `app.py`:ssä tai lopeta toinen prosessi:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac  
lsof -ti:5000 | xargs kill
```