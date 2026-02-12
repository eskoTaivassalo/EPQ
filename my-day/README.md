# My Day - Monorepo

Täysi sovelluspaketti tehtävien hallintaan webissä ja mobiilissa.

## Rakenne

```
my-day/
├── web/              # Vite + TypeScript web-sovellus
├── mobile/           # Expo React Native -sovellus
├── backend/          # Express API + SQLite tietokanta
└── shared/           # Yhteisiä tyyppejä ja koodia
```

## Aloitus

### 1. Asenna riippuvuudet

```bash
npm install
```

Tämä asentaa kaikki riippuvuudet kaikkiin työtiloihin (workspaces).

### 2. Käynnistä backend

```bash
npm run dev:backend
```

Backend käynnistyy osoitteessa `http://localhost:3000`

### 3. Käynnistä web-sovellus

```bash
npm run dev:web
```

Web-sovellus käynnistyy osoitteessa (yleensä) `http://localhost:5173`

### 4. Käynnistä mobile-sovellus

```bash
npm run dev:mobile
```

Tämä avaa Expo Dev Tools:in. Voit skannata QR-koodin Expo Go -sovelluksella puhelimessasi.

## Tietokanta

Backend käyttää **PostgreSQL**-tietokantaa ja **Drizzle ORM**:ää.

### Asenna PostgreSQL

**Windows:**
1. Lataa PostgreSQL: https://www.postgresql.org/download/windows/
2. Asenna ja muista salasana
3. Luo tietokanta:
```bash
createdb myDay
```

**Tai käytä Dockeria:**
```bash
docker run --name myDay-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=myDay -p 5432:5432 -d postgres
```

### Konfiguroi .env

Luo `backend/.env` tiedosto:
```
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/myDay
```

### Migraatiot

```bash
cd backend
npx drizzle-kit push
```

## API Endpoints

- `GET /api/tasks` - Hae kaikki tehtävät
- `GET /api/tasks/:id` - Hae yksittäinen tehtävä
- `POST /api/tasks` - Luo uusi tehtävä
- `PUT /api/tasks/:id` - Päivitä tehtävä
- `DELETE /api/tasks/:id` - Poista tehtävä

## Teknologiat

### Backend
- Node.js
- Express
- SQLite
- Drizzle ORM
- TypeScript

### Web
- Vite
- TypeScript
- Vanilla TS (voi myöhemmin päivittää React/Vue/jne)

### Mobile
- Expo
- React Native
- TypeScript
- React Query

### Shared
- TypeScript (yhteisiä tyyppejä)

## Kehitystyö

### Käynnistä kaikki kerralla

```bash
npm run dev:all
```

Tämä käynnistää backendin ja webin samanaikaisesti.

### Build

```bash
npm run build:all
```

## Seuraavat askeleet

1. Päivitä web-sovellus käyttämään backendiä
2. Lisää autentikointi
3. Lisää enemmän ominaisuuksia (kategoriat, prioriteetit, jne.)
4. Deploy pilvipalveluun
