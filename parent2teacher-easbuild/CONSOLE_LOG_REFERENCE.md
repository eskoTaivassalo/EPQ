# 📝 Console Log Reference Guide

Tämä dokumentti selittää kaikkia DevOps Performance Monitoring logtyyppejä ja niiden merkityksiä.

## 🎯 Log Format

Kaikki logit noudattavat tätä standardimuotoa:

```
[EMOJI] [KOMPONENTTI] Viesti | Arvo | Värikoodi
[EMOJI] [MODUULI] Kuvaus | Mitta | Status
```

---

## 🔴 Navigation Logit

### Navigation Start
```
🎯 [Navigation] bookings_focus marked
```
**Merkitys**: Näkymä on saanut focus, navigaatio alkaa
**Huomio**: Tarkista että tämä kutsutaan välittömästi navigaatiolla

### Navigation Complete
```
✅ [Performance] Bookings Screen Focused
```
**Merkitys**: Navigaatio on valmis
**Odotettava**: < 300ms navigaation alusta

---

## 📤 Redux Action Logit

### Async Thunk Start
```
📤 [REDUX] Dispatching: bookings/fetchParentBookings/pending
```
**Merkitys**: Redux action alkaa (fetch aloitetaan)
**Huomio**: Redux middleware logittaa kaikki dispatchit

### Async Thunk Success
```
📤 [REDUX] Dispatching: bookings/fetchParentBookings/fulfilled
```
**Merkitys**: Fetch valmis, data saatu
**Odotettava**: pending → fulfilled kestää 500-2000ms

### Async Thunk Error
```
📤 [REDUX] Dispatching: bookings/fetchParentBookings/rejected
```
**Merkitys**: Fetch epäonnistui
**Huomio**: Tarkista error viesti consolesta

---

## ⏳ Data Loading Logit

### Loading Started
```
⏳ [Bookings] Loading bookings...
📊 [Performance] load_bookings_start marked
```
**Merkitys**: Data fetch aloitettu
**Samalla**: Redux pending action dispatched

### Fetching
```
✅ [BookingsService] Fetching bookings for user: user123
```
**Merkitys**: Firestore query suoritetaan
**Huomio**: Saattaa kestää 1000-3000ms datamäärästä riippuen

### Loaded Data
```
✅ [Bookings] Loaded 5 bookings
```
**Merkitys**: Data saatu Firebastesta
**Sisältää**: Varattujen varausten lukumäärä

### Load Complete Marked
```
📊 [Performance] load_bookings_end marked
📊 [Performance] load_bookings_duration = 523ms 🟡 MEDIUM
```
**Merkitys**: Fetch kokonaan valmis
**Analysoi**: Onko aika liian pitkä?

---

## 🔄 Render Logit

### Initial Render
```
🔄 [BookingsScreen] Render #1 | +0ms since mount | deps: [1]
```
**Merkitys**: Komponentti on renderöity ensimmäistä kertaa
**Details**:
- `Render #1` = Ensimmäinen render
- `+0ms` = Aika komponentin mount jälkeen
- `deps: [1]` = Dependency array pituus

### Subsequent Renders
```
🔄 [BookingsScreen] Render #2 | +523ms since mount | deps: [1]
```
**Merkitys**: Komponentti on renderöity uudelleen
**Ongelma**: Jos renders #2, #3, jne liian pian → renderöinti liian usein

### Unmount
```
🔴 [BookingsScreen] Unmounted after 2 renders
```
**Merkitys**: Komponentti on poistettu
**Huomio**: Varmista cleanup tapahtunut oikein

---

## 📊 Performance Metrics Logit

### Mark Creation
```
📊 [Performance] mark 'component_mount' created
📊 [Performance] mark 'data_load_complete' created
```
**Merkitys**: Aika-piste on merkitty
**Käyttö**: Mittaukseen käytetään startia ja stopppia

### Measurement
```
📊 [Performance] Measuring: component_mount → data_load_complete
📊 [Performance] Result: 523ms
```
**Merkitys**: Kahden pisteen väliset millisekunnit
**Analyysi**:
- < 500ms = 🟢 FAST
- 500-1000ms = 🟡 MEDIUM  
- > 1000ms = 🔴 SLOW

### Metric Logging
```
📊 [Performance] metric: 'load_bookings_duration' = 523ms 🟡
```
**Merkitys**: Tallennettu mittaus
**Huomio**: Nämä näkyvät DevOps Dashboardissa

---

## 🔗 Fetch Logit

### Fetch Start
```
📡 [Fetch] Starting: fetchParentBookings
```
**Merkitys**: HTTP/Firestore fetch alkaa
**Samalla**: Redux pending dispatched

### Fetch Status
```
📡 [Fetch] Status: Firestore query executing
```
**Merkitys**: Fetch on aktiivinen
**Huomio**: Tarkista onko query optimoitu

### Fetch Success
```
✅ [Fetch] Success: fetchParentBookings | Duration: 523ms
```
**Merkitys**: Fetch valmis, data saatu
**Analyysi**: Onko 523ms hyväksyttävä?

### Fetch Error
```
❌ [Fetch] Error: fetchParentBookings | Error: Permission denied
```
**Merkitys**: Fetch epäonnistui
**Tutkiminen**: Tarkista error viesti

---

## 📋 Redux State Change Logit

### State Update
```
📋 [Redux] State updated: bookings.loading = false
📋 [Redux] State updated: bookings.bookings = [5 items]
```
**Merkitys**: Redux state on päivitetty
**Seuraava**: React komponentti renderöidään uudelleen

### Slice Logging
```
📋 [bookingsSlice] fetchParentBookings fulfilled
```
**Merkitys**: Redux slice käsitteli actionin
**Huomio**: Action type näkyy

---

## 🎨 Värikoodaus Selitys

### 🟢 FAST - Vihreä (< 500ms)
```
Aika: 234ms 🟢
Merkitys: Optimaalinen, ei ongelmia
Toimenpide: Ei vaadita, hyvä!
```

### 🟡 MEDIUM - Keltainen (500-1000ms)
```
Aika: 756ms 🟡
Merkitys: Hyväksyttävä, mutta melko hidas
Toimenpide: Optimoinnille on potentiaalia
```

### 🔴 SLOW - Punainen (> 1000ms)
```
Aika: 1234ms 🔴
Merkitys: Liian hidas, käyttäjä huomaa
Toimenpide: Tarvitsee optimointia
```

---

## 📍 Log Locations ja Merkitykset

### Navigation Event
```
Location: RoleDashboard.js, ProfileScreen.js
Log: 🎯 [Navigation] screen_name_focus marked
Merkitys: Näyttö muuttui
```

### Redux Dispatch
```
Location: performanceLoggingMiddleware.js
Log: 📤 [REDUX] Dispatching: action/type
Merkitys: Redux action kutsuttiin
```

### Data Fetch
```
Location: BookingsScreen.js, serviceLayer
Log: 📡 [Fetch] Starting: endpoint
Merkitys: Palvelinkutsu alkaa
```

### Component Render
```
Location: useRenderTracking hook
Log: 🔄 [ComponentName] Render #N | +Xms
Merkitys: Komponentti renderöidään
```

### Performance Mark
```
Location: performanceTracker.js
Log: 📊 [Performance] mark created
Merkitys: Mittaus piste on asetettu
```

---

## 🔍 Lukemisen Opas

### Normaalin flow:
```
Navigation starts:
  🎯 [Navigation] bookings_focus marked

Redux dispatch:
  📤 [REDUX] Dispatching: bookings/fetchParentBookings/pending

Data loading:
  ⏳ [Bookings] Loading bookings...
  📡 [Fetch] Starting: fetchParentBookings

Data received:
  ✅ [Bookings] Loaded 5 bookings
  📊 [Performance] load_bookings_duration = 523ms 🟡

Rendering:
  🔄 [BookingsScreen] Render #1 | +523ms
  ✅ Screen ready
```

### Hidas flow (> 1000ms):
```
Navigation starts: ✅ Quick
Redux dispatch: ✅ Quick  
Data fetch: 🔴 SLOW (1234ms) ← ONGELMA
Rendering: ✅ Valmis (100ms)
Total: 1334ms 🔴
```

---

## 💡 Vianmääritys Logien Perusteella

### Jos navigaatio on hidas:
```
Etsi: Navigation → Redux dispatch aika > 300ms
Lähde: Navigation transition animation
Ratkaisu: Tarkista cardStyleInterpolator
```

### Jos Redux dispatch on hidas:
```
Etsi: Dispatching → fulfilled aika > 500ms
Lähde: Redux middleware tai thunk
Ratkaisu: Tarkista async thunk logiikka
```

### Jos data fetch on hidas:
```
Etsi: Fetch start → Fetch success aika > 1500ms
Lähde: Firestore query
Ratkaisu: Tarkista query, indices, filters
```

### Jos rendering on hidas:
```
Etsi: Load complete → Render start aika > 100ms
Lähde: React render cycle
Ratkaisu: Tarkista useMemo, React.memo
```

---

## 📈 Mittaustiedot Tallentaminen

### Kuvakaappaus ottaminen:
```
1. Avaa Expo DevTools (q-key)
2. Siirry "Debugger" tai "Console" välilehteen
3. Ota kuvakaappaus koko konsoli-ulostulon
4. Tallenna tiedostoon (YYYY-MM-DD_screen_name.txt)
```

### Data exportointi:
```
1. Avaa DevOps Dashboard
2. Napauta "📤 Export"
3. Kopioi console output
4. Liitä dokumenttiin
```

### Dokumentointi:
```
Timestamp: 2024-01-15 14:30
Screen: BookingsScreen
Metrics:
  - Navigation: 234ms 🟢
  - Redux: 156ms 🟢
  - Fetch: 1234ms 🔴
  - Total: 1624ms 🔴
Finding: Firestore query liian hidas
```

---

**Viimeksi päivitetty**: 2024
**Versio**: 1.0
