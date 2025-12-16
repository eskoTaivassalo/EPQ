# DevOps Testing Documentation

## Setup

Projekti käyttää seuraavia testaustyökaluja:

### Testing Framework
- **Jest** - Yksikkö- ja integraatiotestit
- **React Native Testing Library** - Component testit
- **Jest Expo** - Expo-specific testing preset

### Code Quality
- **ESLint** - Koodin laadun tarkistus
- **Prettier** - Koodin formatointi
- **TypeScript** - Tyypitys (optional)

### CI/CD
- **GitHub Actions** - Automaattinen testaus ja buildaus

## Komennot

```bash
# Asenna dev dependencies
npm install

# Aja testit
npm test

# Aja testit watch-tilassa (kehitys)
npm run test:watch

# Aja testit CI-ympäristössä
npm run test:ci

# Tarkista koodin laatu
npm run lint

# Korjaa lint-virheet automaattisesti
npm run lint:fix

# Formatoi koodi
npm run format
```

## Test Coverage

Testikattavuus kerätään automaattisesti `src/` kansiosta:
- Services (availabilityService, communicationService, etc.)
- Utils (dateUtils, etc.)
- Components (TagSelector, etc.)

Raportti generoituu `coverage/` kansioon.

## CI/CD Pipeline

### Workflow Triggerit
- **Push** main, tiedostot-ja-rakenne, development haaroihin
- **Pull Request** main-haaraan

### Pipeline Vaiheet

1. **Lint & Test**
   - ESLint tarkistus
   - Jest testit coverage raportoinnilla
   - Codecov upload

2. **Build Android** (vain main-haara)
   - EAS build Android APK
   - Preview profile

3. **Build iOS** (vain main-haara)
   - EAS build iOS
   - Preview profile

## GitHub Secrets

Lisää seuraavat secretit GitHub repositoryyn:

```
EXPO_TOKEN - Expo account token (eas login)
CODECOV_TOKEN - Codecov upload token (optional)
```

## Best Practices

### Testien kirjoittaminen

1. **Describe-blokit** - Ryhmittele testit loogisesti
2. **Mock Firebase** - Älä käytä oikeaa tietokantaa testeissä
3. **AAA Pattern** - Arrange, Act, Assert
4. **Descriptive names** - Selkeät testin nimet

Esimerkki:
```javascript
describe('availabilityService', () => {
  describe('generateAvailabilitySlots', () => {
    it('should prevent duplicate slot generation', async () => {
      // Arrange
      const template = { ... };
      
      // Act
      const result = await generateAvailabilitySlots(...);
      
      // Assert
      expect(result.skippedCount).toBeGreaterThan(0);
    });
  });
});
```

### Pre-commit Hooks (tuleva)

Harkitse `husky` + `lint-staged` lisäämistä:
- Automaattinen lint ennen committia
- Automaattinen format ennen committia
- Testien ajo ennen pushia

## Seuraavat askeleet

1. ✅ Jest + Testing Library setup
2. ✅ ESLint + Prettier konfiguraatio
3. ✅ GitHub Actions CI/CD
4. ✅ Esimerkkitestit (utils, services, components)
5. ⏳ Lisää testejä kriittisille komponenteille
6. ⏳ E2E testit (Detox?)
7. ⏳ Performance monitoring (Sentry?)
8. ⏳ Husky pre-commit hooks
