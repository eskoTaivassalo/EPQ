# iOS Development Checklist - Parents&Teachers App

## 🍎 iOS KEHITYS TARKISTUS

### 📋 PRE-DEVELOPMENT SETUP

#### Apple Developer Account
- [ ] **Apple Developer Program** membership ($99/year)
- [ ] **Team ID** kirjattu ylös
- [ ] **Bundle Identifier** varattu: `com.parentsteachers.app`
- [ ] **App Name** tarkistettu saatavuus App Storessa

#### Development Environment
- [ ] **Xcode** asennettu (latest version)
- [ ] **iOS Simulator** toiminnassa
- [ ] **Physical iOS device** testing setup
- [ ] **EAS CLI** asennettu ja konfiguroitu
- [ ] **Expo Development Build** iOS:lle

---

## 📱 iOS-SPESIFINEN KEHITYS

### Week 1-2: Core iOS Features
- [ ] **iOS SafeAreaView** korvattu react-native-safe-area-context
- [ ] **iOS StatusBar** konfigurointi
- [ ] **iOS Navigation** patterns (swipe back)
- [ ] **iOS Keyboard** behavior handling
- [ ] **iOS Permissions** setup (Camera, Notifications, Location)

### Week 3: iOS UI/UX
- [ ] **iOS Human Interface Guidelines** compliance
- [ ] **iOS Dynamic Type** support
- [ ] **iOS VoiceOver** accessibility
- [ ] **iOS haptic feedback** integration
- [ ] **iOS-specific fonts** (San Francisco)
- [ ] **iOS Dark Mode** support

### Week 4: iOS Testing
- [ ] **iOS Simulator testing** (iPhone 15, 14, SE)
- [ ] **iPad compatibility** testing
- [ ] **iOS device testing** (multiple devices)
- [ ] **iOS performance profiling**
- [ ] **iOS memory usage** optimization

---

## 🔨 iOS BUILD & DEPLOY

### EAS Build Configuration
```json
// eas.json - iOS configuration
{
  "build": {
    "preview": {
      "ios": {
        "simulator": true,
        "buildType": "development"
      }
    },
    "production": {
      "ios": {
        "bundleIdentifier": "com.parentsteachers.app",
        "buildType": "release"
      }
    }
  }
}
```

### iOS Certificates & Profiles
- [ ] **iOS Distribution Certificate** luotu
- [ ] **Development Provisioning Profile** luotu
- [ ] **Distribution Provisioning Profile** luotu
- [ ] **Push Notification Certificate** luotu
- [ ] **Certificates** ladattu ja asennettu

### iOS Build Process
- [ ] **Development build** - `eas build --platform ios --profile preview`
- [ ] **Production build** - `eas build --platform ios --profile production`
- [ ] **Build success** varmistettu
- [ ] **IPA file** ladattu ja testattu

---

## 📦 APP STORE CONNECT

### App Information
- [ ] **App Name**: "Parents&Teachers"
- [ ] **Bundle ID**: com.parentsteachers.app
- [ ] **SKU**: PT-APP-2025
- [ ] **Primary Language**: Finnish
- [ ] **Category**: Education
- [ ] **Content Rights**: Original content

### App Store Assets
- [ ] **App Icon** 1024x1024 (PNG, no transparency)
- [ ] **Screenshots** iPhone 6.7" (3 required)
- [ ] **Screenshots** iPhone 6.5" (3 required)  
- [ ] **Screenshots** iPhone 5.5" (3 required)
- [ ] **Screenshots** iPad 12.9" (3 required)
- [ ] **App Preview Videos** (optional, max 30s)

### Metadata
- [ ] **App Description** (max 4000 characters)
- [ ] **Keywords** (max 100 characters)
- [ ] **Support URL**: https://parentsteachers.app/support
- [ ] **Marketing URL**: https://parentsteachers.app
- [ ] **Privacy Policy URL**: https://parentsteachers.app/privacy
- [ ] **Copyright**: 2025 ParentsTeachers Ltd

### App Review Information
- [ ] **Demo Account** credentials
- [ ] **Review Notes** (special instructions)
- [ ] **App Review Guidelines** compliance check
- [ ] **Content Guidelines** compliance check

### Pricing & Availability
- [ ] **Price**: Free
- [ ] **Availability**: All territories
- [ ] **Release**: Manual release after approval

---

## 🧪 iOS TESTING CHECKLIST

### Device Testing Matrix
| Device | iOS Version | Screen Size | Status |
|--------|-------------|-------------|---------|
| iPhone 15 Pro | iOS 17.x | 6.1" | [ ] |
| iPhone 14 | iOS 16.x | 6.1" | [ ] |
| iPhone SE 3rd | iOS 15.x | 4.7" | [ ] |
| iPad Air | iPadOS 17.x | 10.9" | [ ] |
| iPad Pro | iPadOS 17.x | 12.9" | [ ] |

### iOS Feature Testing
- [ ] **Authentication** (Sign up/Login)
- [ ] **Profile Management** (Teacher/Parent)
- [ ] **Search & Filtering** functionality
- [ ] **Push Notifications** delivery
- [ ] **Deep Linking** navigation
- [ ] **Offline Mode** handling
- [ ] **Camera Permissions** for profile pics
- [ ] **Location Permissions** for search
- [ ] **Background App Refresh**

### iOS Performance Testing
- [ ] **App Launch Time** <3 seconds
- [ ] **Memory Usage** <200MB average
- [ ] **Battery Usage** optimized
- [ ] **Network Efficiency** 
- [ ] **Crash Rate** <1%

---

## 🚀 iOS DEPLOYMENT

### TestFlight Beta
- [ ] **TestFlight** build uploaded
- [ ] **Beta Testing Information** filled
- [ ] **Internal Testers** added (max 100)
- [ ] **External Testers** added (max 10,000)
- [ ] **Beta feedback** collection system

### App Store Submission
- [ ] **Build** selected for release
- [ ] **Version** set (1.0.0)
- [ ] **Release Notes** written
- [ ] **Submit for Review** clicked
- [ ] **Review Status** monitoring
- [ ] **Review Response** if needed

### Post-Submission
- [ ] **Review Timeline** 24-48 hours typical
- [ ] **Rejection Handling** plan ready
- [ ] **Approval Notification** monitoring
- [ ] **Release Control** (manual/automatic)

---

## ⚠️ iOS-SPECIFIC ISSUES TO WATCH

### Common iOS Problems
- [ ] **SafeAreaView deprecation** warnings
- [ ] **iOS simulator** vs real device differences
- [ ] **iOS 14+ privacy** permission popups
- [ ] **iOS keyboard** covering inputs
- [ ] **iOS status bar** color issues
- [ ] **iOS navigation** gesture conflicts

### App Store Rejection Reasons
- [ ] **Privacy Policy** missing or incomplete
- [ ] **App functionality** not clear from description
- [ ] **Broken links** in app or metadata
- [ ] **Inappropriate content** for category
- [ ] **Performance issues** or crashes
- [ ] **Design guidelines** violations

### iOS Monitoring
- [ ] **Crashlytics** iOS crash reporting
- [ ] **Firebase Analytics** iOS events
- [ ] **App Store Connect** analytics
- [ ] **TestFlight** feedback monitoring
- [ ] **App Store Reviews** response plan

---

## 📊 iOS SUCCESS METRICS

### Technical Metrics
- **iOS App Size**: <50MB
- **iOS Launch Time**: <3s
- **iOS Memory Usage**: <200MB
- **iOS Crash Rate**: <1%
- **iOS ANR Rate**: <0.5%

### Store Metrics
- **App Store Rating**: 4.0+ stars
- **iOS Downloads Week 1**: 50+
- **iOS Retention Day 1**: 60%+
- **iOS Retention Day 7**: 30%+
- **TestFlight Feedback**: 80%+ positive

---

*Tämä checklist tulee päivittää projektin edetessä ja iOS-kehityksen realiteettien mukaan.*