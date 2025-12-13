# 🔧 DevOps Performance Debugging Guide

## Yleiskatsaus

Tämä opas auttaa sinua käyttämään DevOps-menetelmiä tutkimaan ja korjaamaan sovelluksen performanssia, erityisesti näyttöjen siirtymisen hitautta.

## 🚀 Quick Start

### 1. Avaa DevOps Dashboard

```
1. Kirjaudu sovellukseen
2. Mene Dashboard näkymään
3. Napauta 🔧 -ikonia oikean yläkulman nurkassa
4. Näet "DevOps Performance Dashboard" -näkymän
```

### 2. Testaa BookingsScreen siirtymää

```
1. DevOps Dashboard on avoin
2. Navigoi BookingsScreen:iin
3. Tarkista "Redux State" ja "Performance Metrics" osiot
4. Katso Console logit (Expo DevTools)
```

### 3. Lukitse Performance Metrics

```
1. Tapaa "Export" -nappia
2. Tarkista Expo DevTools Consolen väritettyjä logeja
3. Identifioi hitaaksi merkityt operaatiot (🔴 SLOW > 1000ms)
```

## 📊 Dashboard Komponentit

### Redux State Sektiossa näet:

**Auth:**
- ✅ Logged In - Onko käyttäjä kirjautunut
- Role - Käyttäjän rooli (service_provider tai parent)

**Bookings:**
- Loading - Onko varaukset haussa (⏳ = haku käynnissä)
- Count - Varausten lukumäärä
- Error - Onko virhe sattunut

**Notifications:**
- Loading - Onko ilmoitukset haussa
- Count - Ilmoitusten lukumäärä
- Cache Valid - Onko cache vielä kelvollinen

### Performance Metrics Sektiossa näet:

Kaikki aika-mittaukset millisekunteina:
- component_mount - Komponentin latautumisaika
- bookings_focus - Aika kun näkymä sai focus
- load_bookings_duration - Varausten hakemiseen kuluva aika

## 🔍 Kuinka lukea Console Logeja

### Värikoodaus:

```
🟢 FAST    = <500ms     ✅ Hyvä
🟡 MEDIUM  = 500-1000ms ⚠️  Hyväksyttävä
🔴 SLOW    = >1000ms    ❌ Ongelma
```

### Esimerkki logit:

```
📤 [REDUX] Dispatching: bookings/fetchParentBookings/pending
⏳ [Bookings] Loading...
🔄 [BookingsScreen] Render #1 | +0ms since mount | deps: [1]
📊 [Performance] Measuring: load_bookings_duration = 1234ms 🔴 SLOW
✅ [Bookings] Bookings loaded successfully
```

## 🎯 Debugging Strategies

### Strategia 1: Identifioi Hitain Operaatio

```
1. Avaa DevOps Dashboard
2. Navigoi BookingsScreen
3. Export metrics → Tarkista console
4. Etsi kaikki 🔴 SLOW -merkityt logit
5. Identifioi hitain operaatio
   - Redux dispatch?
   - Firestore query?
   - Rendering?
```

### Strategia 2: Vertaile Ennen & Jälkeen

```
# ENNEN optimointia:
1. Ota kuvakaappaus metrics
2. Export & kopioi console output

# TEE MUUTOKSIA

# JÄLKEEN optimointia:
1. Ota uusi kuvakaappaus
2. Vertaa numeroja → Parannusta?
```

### Strategia 3: Erota Komponentit

```
# Esimerkki: BookingsScreen on hidas

1. Lisää useRenderTracking hook
   ```javascript
   import { useRenderTracking } from '../../utils/useRenderTracking';
   
   export const BookingsScreen = () => {
     const renders = useRenderTracking('BookingsScreen', []);
   ```

2. Tarkista kuinka monta kertaa renderöidään
3. Jos renderöidään liikaa, käytä:
   - React.memo() komponenteille
   - useMemo() kalliille laskelmille
   - useCallback() funktioille
```

## 📝 Mittaustulokset & Analysointi

### Odotetut aika-arvot:

```
Component Mount:     < 500ms   ✅
Redux Dispatch:      < 100ms   ✅
Firestore Query:     500-2000ms ✅ (riippuu datamäärästä)
Render Update:       < 300ms   ✅
Näytön siirtymä:     < 1000ms  ✅
```

### Jos hidas (> 1000ms):

```
1. Redux dispatch hidas?
   → Tarkista notificationsSlice cache
   → Tarkista bookingsSlice deduplicaatio
   
2. Firestore query hidas?
   → Tarkista collection indices
   → Tarkista query filters
   
3. Rendering hidas?
   → Käytä React DevTools Profiler
   → Tarkista renderöinnin välttämättömyys
   
4. Navigation hidas?
   → Tarkista navigation transition animation
   → Tarkista loading overlay
```

## 🛠️ Kehittyneet Tekniikat

### Omien Performance Markkerien Lisääminen

```javascript
import performanceTracker from '../../utils/performanceTracker';

// Merkitse operaation alkaminen
performanceTracker.mark('my_operation_start');

// ... suorita operaatio ...

// Merkitse operaation loppu
performanceTracker.mark('my_operation_end');

// Mittaa kesto
performanceTracker.measure(
  'my_operation_duration',
  'my_operation_start',
  'my_operation_end'
);
```

### Redux Logit

Redux actions logitetaan automaattisesti `performanceLoggingMiddleware`:n kautta.

```
📤 [REDUX] Dispatching: bookings/fetchParentBookings/pending
📤 [REDUX] Dispatching: bookings/fetchParentBookings/fulfilled
```

### Render Tracking

```javascript
import { useRenderTracking } from '../../utils/useRenderTracking';

const MyComponent = () => {
  const renderCount = useRenderTracking('MyComponent', []);
  
  return <Text>{renderCount} renders</Text>;
};
```

## 🚨 Yleiset Ongelmat & Ratkaisut

### Ongelma: BookingsScreen välähtää mustaksi

**Tutkiminen:**
```
1. Export metrics → tarkista load_bookings_duration
2. Jos > 1000ms → Firestore query ongelma
3. Jos < 300ms → Navigation animation ongelma
```

**Ratkaisut:**
```
✅ Lisää background color SafeAreaViewiin
✅ Käytä loading overlay eikä early return
✅ Optimoi Firestore queries (indices, filters)
✅ Käytä cache first -strategiaa
```

### Ongelma: Notifications lataa hitaasti

**Tutkiminen:**
```
1. Tarkista "Notifications - Loading" Redux Statessa
2. Export metrics → tarkista fetch duration
```

**Ratkaisut:**
```
✅ notificationsSlice:n 30-second cache toimii
✅ Redux role-based routing eliminoi DB keyrätykset
✅ useMemo kaikille groupBy/filter operaatioille
```

### Ongelma: UI "jäätää" kun data latautuu

**Tutkiminen:**
```
1. Tarkista load_bookings_duration
2. Jos hidas → siirry background processing:iin
```

**Ratkaisut:**
```
✅ Käytä Redux async thunks (generateSlotsAsync)
✅ Näytä toast notification heti
✅ Laita operaatio background loopiin
✅ Päivitä UI kun valmis
```

## 📊 Mittausalusta

### Console Output Esimerkki

```
✅ DevOps Performance Dashboard Initialized
📊 Redux State Monitoring Active
⏱️ Performance Tracking Ready

--- Navigation Event ---
🎯 [Navigation] bookings_focus marked
✅ [Performance] Bookings Screen Focused

--- Data Loading ---
📤 [REDUX] Dispatching: bookings/fetchParentBookings/pending
⏳ [Bookings] Loading bookings...
📊 [Performance] load_bookings_start marked

--- Data Received ---
✅ [Bookings] Loaded 5 bookings
📊 [Performance] load_bookings_end marked
📊 [Performance] load_bookings_duration = 523ms 🟡 MEDIUM

--- Complete ---
✅ BookingsScreen Ready
```

## 🎓 Oppitunnit

### Oppitunti 1: Perustiedot

DevOps = Kehittäminen + Operaatiot
- **Kehittäminen**: Koodi & ominaisuudet
- **Operaatiot**: Monitorointi & debugging

**Mittaus**: Millä tahansa ei voi parantaa
→ Mittaa ensin, optimoi sitten

### Oppitunti 2: Root Cause Analysis

Älä oletä → **Mittaa**
```
X: "Loading on hidas"
Mittaus → "Firestore query kestää 2000ms"
Ratkaisu: Lisää query index
```

### Oppitunti 3: Optimization Cycle

```
1. Mittaa (performanceTracker)
2. Analysoi (console logit)
3. Identifioi (hitzastest operation)
4. Optimoi (cache, memoization jne)
5. Mittaa uudelleen (edistystä?)
6. Toista kunnes hyvä
```

## 🚀 Next Steps

1. **Testaa nyt**: Avaa DevOps Dashboard ja navigoi BookingsScreen
2. **Etsi bottlenecks**: Katso mitä on > 1000ms
3. **Dokumentoi**: Kirjoita ylös mitä löydät
4. **Optimoi**: Käytä tämän dokumentin ratkaisuja
5. **Mittaa uudelleen**: Osoita että parani
6. **Integroi**: Lisää tracking muihin näkymiin

## 📞 Apua

Katso myös:
- [performanceTracker.js](../src/utils/performanceTracker.js) - Tracking utiliity
- [useRenderTracking.js](../src/utils/useRenderTracking.js) - React hook tracking
- [performanceLoggingMiddleware.js](../src/store/middleware/performanceLoggingMiddleware.js) - Redux logging
- [DevOpsPerformanceDashboard.js](../src/screens/debug/DevOpsPerformanceDashboard.js) - Dashboard UI

---

**Muista**: Hyvä koodi on mitattua koodia! 📊✅
