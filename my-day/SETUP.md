# Pikaopas My Day -projektin käynnistämiseen

## 1. Asenna PostgreSQL

### Vaihtoehto A: Docker (suositeltu)
```bash
docker run --name myDay-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=myDay -p 5432:5432 -d postgres
```

### Vaihtoehto B: Lataa ja asenna
1. Lataa: https://www.postgresql.org/download/windows/
2. Asenna ja muista salasana
3. Luo tietokanta:
```bash
createdb myDay
```

## 2. Konfiguroi backend

Luo `backend/.env` tiedosto:
```
PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/myDay
```

## 3. Luo tietokantataulut

```bash
cd backend
npx drizzle-kit push
cd ..
```

## 4. Käynnistä backend

```bash
npm run dev:backend
```

Backend käynnistyy osoitteessa `http://localhost:3000`

## 5. Käynnistä web-sovellus (toisessa terminaalissa)

```bash
npm run dev:web
```

## 6. Käynnistä mobile-sovellus (kolmannessa terminaalissa)

```bash
npm run dev:mobile
```

Skannaa QR-koodi Expo Go -sovelluksella puhelimessasi.

## Ongelmanratkaisu

### TypeScript-virheet VS Codessa

Jos näet virheitä kuten "Cannot find module 'express'", odota hetki että VS Code päivittää TypeScript-serverin tai sulje ja avaa projekti uudelleen.

### PostgreSQL-yhteysvirhe

Varmista että:
1. PostgreSQL on käynnissä
2. DATABASE_URL on oikein backend/.env -tiedostossa
3. Tietokanta on luotu

### Expo ei toimi

Varmista että:
1. Expo Go -sovellus on asennettu puhelimeesi
2. Puhelin ja tietokone ovat samassa verkossa
3. Backend on käynnissä
