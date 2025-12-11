# Tyylin yhtenäistämissuunnitelma

## Tavoite
Luoda yhtenäinen visuaalinen ilme koko sovellukseen käyttäen `commonStyles.js` tyylisysteemiä.

## Yhteinen tyylisysteemi

### Värit (colors)
- **Primary**: #667EEA (sinipurppura)
- **Secondary**: #764BA2 (purppura)
- **Background**: #F8F9FA (vaalea harmaa)
- **Surface**: #FFFFFF (valkoinen)
- **Text**: #2C3E50 (tumma)
- **Success**: #28A745
- **Warning**: #FFC107
- **Error**: #DC3545
- **Info**: #17A2B8

### Komponentit
1. **Kortit**: `commonStyles.card`
2. **Painikkeet**: `commonStyles.button`, `buttonOutline`, `buttonSecondary`
3. **Lomakkeet**: `commonStyles.input`, `formGroup`, `label`
4. **Listat**: `commonStyles.listItem`
5. **Badget**: `commonStyles.badge`, `badgePending`, `badgeSuccess`
6. **Modaalit**: `commonStyles.modalContainer`, `modalOverlay`

## Näkymät ja niiden tila

### ✅ Prioriteetti 1 - Kriittiset käyttäjänäkymät (PÄIVITETTÄVÄ ENSIN)
- [ ] **RoleDashboard.js** - Päänäkymä (kaikki roolit)
- [ ] **BookingsScreen.js** - Varaukset
- [ ] **ProfileScreen.js** - Profiili
- [ ] **FindProvidersScreen.js** - Opettajien haku
- [ ] **ProviderWeeklyAvailabilityScreen.js** - Ajan varaus

### 🔶 Prioriteetti 2 - Tärkeät toiminnallisuudet
- [ ] **NotificationsScreen.js** - Ilmoitukset
- [ ] **ConversationsScreen.js** - Viestit
- [ ] **ConversationThreadScreen.js** - Keskusteluketju
- [ ] **ProviderAvailabilityScreen.js** - Opettajan aikataulun asetus
- [ ] **ManageSlotsScreen.js** - Aikaslottien hallinta

### 🔷 Prioriteetti 3 - Tukitoiminnot
- [ ] **SettingsScreen.js** - Asetukset
- [ ] **HelpCenterScreen.js** - Ohje
- [ ] **ContactUsScreen.js** - Ota yhteyttä
- [ ] **ChangeEmailScreen.js** - Sähköpostin vaihto
- [ ] **ChangePasswordScreen.js** - Salasanan vaihto
- [ ] **FavoriteProvidersScreen.js** - Suosikit
- [ ] **ClientsScreen.js** - Asiakkaat
- [ ] **CalendarScreen.js** - Kalenteri

### 🟣 Prioriteetti 4 - Auth-näkymät (jo hyvät)
- [ ] **WelcomeScreen.js** - Tervetulosivu
- [ ] **LoginScreen.js** - Kirjautuminen
- [ ] **UniversalSignupScreen.js** - Rekisteröityminen
- [ ] **RoleSelectionScreen.js** - Roolin valinta

### 🔴 Prioriteetti 5 - Admin (myöhemmin)
- [ ] **AdminDashboard.js**
- [ ] **AdminBookings.js**
- [ ] **AdminReports.js**
- [ ] **AdminStatistics.js**
- [ ] **UserManagement.js**

## Yhtenäistämisen vaiheet

### Vaihe 1: Komponenttirakenne
```jsx
<SafeAreaView style={commonStyles.safeArea}>
  <WatercolorBackground>
    <ScrollView style={commonStyles.scrollContainer}>
      {/* Sisältö */}
    </ScrollView>
  </WatercolorBackground>
</SafeAreaView>
```

### Vaihe 2: Kortit
```jsx
<View style={commonStyles.card}>
  {/* Kortin sisältö */}
</View>
```

### Vaihe 3: Painikkeet
```jsx
<TouchableOpacity style={commonStyles.button}>
  <Text style={commonStyles.buttonText}>Teksti</Text>
</TouchableOpacity>
```

### Vaihe 4: Badget/Tilaindik aattorit
```jsx
<View style={[commonStyles.badge, commonStyles.badgeSuccess]}>
  <Text style={commonStyles.badgeText}>Vahvistettu</Text>
</View>
```

### Vaihe 5: Tyhjät tilat
```jsx
<View style={commonStyles.emptyState}>
  <Ionicons name="document-outline" size={64} style={commonStyles.emptyStateIcon} />
  <Text style={commonStyles.emptyStateTitle}>Ei varauksia</Text>
  <Text style={commonStyles.emptyStateText}>Varaa ensimmäinen aika</Text>
</View>
```

## Seuraavat toimenpiteet
1. Päivitä RoleDashboard yhtenäiseen tyyliin
2. Päivitä BookingsScreen
3. Päivitä muut prioriteetti 1 näkymät
4. Testaa visuaalinen yhtenäisyys
5. Jatka prioriteetti 2 näkymiin
