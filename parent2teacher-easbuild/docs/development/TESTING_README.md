# Parent2Teacher - Testing & DevOps

## 🎯 DevOps Setup Completed

Projekti on nyt varustettu täydellä DevOps-testausympäristöllä:

### ✅ Installed Tools
- **Jest** - Unit & Integration Testing Framework
- **React Native Testing Library** - Component Testing
- **ESLint** - Code Quality & Linting
- **Prettier** - Code Formatting
- **GitHub Actions** - CI/CD Pipeline
- **TypeScript** - Type Checking (optional)

### 📊 Test Results

```
Test Suites: 3 passed, 3 total
Tests:       14 passed, 14 total
Coverage:    Available in coverage/ folder
Time:        ~8s
```

#### Test Coverage by Area:
- ✅ **Utils** (dateUtils) - 72.41% coverage
- ✅ **Services** (availabilityService) - 29.05% coverage  
- ✅ **Components** (TagSelector) - 80% coverage
- 📝 **Screens** - Tests needed
- 📝 **Redux Slices** - Tests needed

## 🚀 Quick Start

### Run Tests
```bash
npm test              # Run all tests with coverage
npm run test:watch    # Watch mode for development
npm run test:ci       # CI mode (for GitHub Actions)
```

### Code Quality
```bash
npm run lint          # Check code quality
npm run lint:fix      # Auto-fix linting issues
npm run format        # Format code with Prettier
```

### Type Checking
```bash
npm run type-check    # TypeScript type checking (no emit)
```

## 🔧 CI/CD Pipeline

### GitHub Actions Workflow (.github/workflows/ci.yml)

**Triggers:**
- Push to `main`, `tiedostot-ja-rakenne`, `development`
- Pull requests to `main`

**Jobs:**

1. **lint-and-test** (Every push/PR)
   - ✅ Checkout code
   - ✅ Install dependencies
   - ✅ Run ESLint
   - ✅ Run Jest tests with coverage
   - ✅ Upload coverage to Codecov

2. **build-android** (main branch only)
   - ✅ EAS build for Android (preview profile)

3. **build-ios** (main branch only)
   - ✅ EAS build for iOS (preview profile)

### Required GitHub Secrets

Add these to repository settings:
```
EXPO_TOKEN     - Get from: npx eas login
CODECOV_TOKEN  - Optional: codecov.io
```

## 📁 Project Structure

```
parent2teacher-easbuild/
├── src/
│   ├── components/
│   │   └── __tests__/           # Component tests
│   ├── services/
│   │   └── __tests__/           # Service tests
│   ├── utils/
│   │   └── __tests__/           # Utility tests
│   └── ...
├── coverage/                    # Test coverage reports (gitignored)
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline
├── jest.setup.js               # Jest configuration
├── .eslintrc.js                # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── tsconfig.json               # TypeScript configuration
└── DEVOPS_TESTING.md          # Detailed documentation
```

## 🧪 Writing Tests

### Example: Service Test
```javascript
describe('availabilityService', () => {
  it('should prevent duplicate slot generation', async () => {
    // Arrange
    const template = { daysOfWeek: [1,3,5], startTime: '09:00' };
    
    // Act
    const result = await generateAvailabilitySlots(...);
    
    // Assert
    expect(result.skippedCount).toBeGreaterThan(0);
  });
});
```

### Example: Component Test
```javascript
it('should call onTagPress when tag is pressed', () => {
  const { getByText } = render(
    <TagSelector tags={['Math']} onTagPress={mockFn} />
  );
  
  fireEvent.press(getByText('Math'));
  
  expect(mockFn).toHaveBeenCalled();
});
```

## 📈 Next Steps

### Priority Tasks:
1. ⏳ Add tests for critical services (authService, communicationService)
2. ⏳ Add tests for Redux slices (authSlice, bookingsSlice)
3. ⏳ Add screen tests (LoginScreen, BookingsScreen)
4. ⏳ Setup Husky pre-commit hooks
5. ⏳ E2E tests with Detox (optional)
6. ⏳ Performance monitoring with Sentry

### Recommended Test Coverage Goals:
- **Services**: 80%+
- **Components**: 70%+
- **Utils**: 90%+
- **Redux Slices**: 70%+

## 🐛 Debugging Tests

### Common Issues:

**Firebase mocking:**
```javascript
// jest.setup.js already mocks Firebase
// No additional config needed
```

**Expo modules:**
```javascript
// jest.setup.js already mocks:
// - expo-notifications
// - expo-device
// - @expo/vector-icons
```

**React Navigation:**
```javascript
// jest.setup.js provides mock useNavigation & useRoute
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

**Last Updated:** December 11, 2025  
**Test Status:** ✅ All tests passing
