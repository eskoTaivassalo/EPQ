# Ilmoitusjärjestelmä - Toteutus ja käyttöohje

## Yleiskatsaus

Sovellukseen on lisätty kattava ilmoitusjärjestelmä, joka näyttää käyttäjille ilmoituksia ajanvarauksista ja muista tapahtumista.

## Komponentit

### 1. Redux Store (`notificationsSlice.js`)

**Sijainti:** `src/store/slices/notificationsSlice.js`

**State:**
- `notifications`: Lista kaikista käyttäjän ilmoituksista
- `unreadCount`: Lukemattomien ilmoitusten määrä
- `loading`: Latausstatuksen indikaattori
- `error`: Virhetilan tallentaminen

**Async Thunks:**
- `fetchNotifications(userId)`: Hakee kaikki käyttäjän ilmoitukset Firestoresta
- `createNotification(notificationData)`: Luo uuden ilmoituksen
- `markAsRead(notificationId)`: Merkitsee yksittäisen ilmoituksen luetuksi
- `markAllAsRead(userId)`: Merkitsee kaikki käyttäjän ilmoitukset luetuiksi

**Actions:**
- `clearNotifications`: Tyhjentää ilmoituslistan (esim. uloskirjautumisen yhteydessä)

### 2. NotificationBell-komponentti

**Sijainti:** `src/components/NotificationBell.js`

Uudelleenkäytettävä kello-ikoni, joka näyttää:
- Kello-ikoni (Ionicons: notifications-outline)
- Punainen badge lukemattomien ilmoitusten määrällä
- Navigoi NotificationsScreen-näkymään klikatessa

**Käyttö:**
```jsx
import NotificationBell from './src/components/NotificationBell';

// Navigaation headerissa
<Stack.Screen 
  name="Dashboard" 
  component={Dashboard}
  options={{
    headerRight: () => <NotificationBell />
  }}
/>
```

### 3. NotificationsScreen

**Sijainti:** `src/screens/shared/NotificationsScreen.js`

Näyttää listan kaikista ilmoituksista:
- **Ikoni**: Eri väriset ikonit ilmoitustyypeille
- **Otsikko ja viesti**: Ilmoituksen sisältö
- **Aikaleira**: Suhteellinen aika (esim. "2 h sitten")
- **Lukematon-indikaattori**: Sininen piste ja korostettu teksti
- **Mark all as read**: Merkitse kaikki kerralla luetuiksi
- **Pull to refresh**: Vedä alas päivittääksesi

**Ilmoitustyypit:**
- `booking_request`: Uusi ajanvaraus (keltainen)
- `booking_accepted`: Varaus hyväksytty (vihreä)
- `booking_declined`: Varaus hylätty (punainen)
- `message`: Uusi viesti (sininen)

### 4. Firestore Security Rules

**Sijainti:** `firestore.rules`

```plaintext
match /notifications/{notificationId} {
  // Luku: Vain ilmoituksen vastaanottaja
  allow read: if request.auth.uid == resource.data.userId;
  
  // Kirjoitus: Kuka tahansa kirjautunut voi luoda
  allow create: if isAuthenticated();
  
  // Päivitys ja poisto: Vain vastaanottaja
  allow update, delete: if request.auth.uid == resource.data.userId;
}
```

## Ilmoitusten Luominen

### Varausilmoitukset

**1. Uusi varaus (vanhempi varaa ajan)**

Sijainti: `src/store/slices/bookingsSlice.js` → `createBooking`

```javascript
dispatch(createNotification({
  userId: teacherId,
  type: 'booking_request',
  title: 'Uusi ajanvaraus',
  message: `Sinulle on tehty uusi ajanvaraus ${date}`,
  navigationTarget: 'TeacherBookings',
  navigationParams: { bookingId: ref.id }
}));
```

**2. Varaus hyväksytty (opettaja hyväksyy)**

Sijainti: `src/store/slices/bookingsSlice.js` → `updateBookingStatus`

```javascript
dispatch(createNotification({
  userId: parentId,
  type: 'booking_accepted',
  title: 'Varaus hyväksytty',
  message: `${teacherName} hyväksyi varauksesi`,
  navigationTarget: 'ParentBookings',
  navigationParams: { bookingId }
}));
```

**3. Varaus hylätty (opettaja hylkää)**

```javascript
dispatch(createNotification({
  userId: parentId,
  type: 'booking_declined',
  title: 'Varaus hylätty',
  message: `${teacherName} hylkäsi varauksesi`,
  navigationTarget: 'ParentBookings',
  navigationParams: { bookingId }
}));
```

## Integraatio

### App.js Muutokset

1. **Importit:**
```javascript
import NotificationBell from './src/components/NotificationBell';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import { fetchNotifications } from './src/store/slices/notificationsSlice';
```

2. **Ilmoitusten lataus kirjautumisen yhteydessä:**
```javascript
useEffect(() => {
  if (isAuthenticated && user?.uid) {
    dispatch(fetchNotifications(user.uid));
  }
}, [isAuthenticated, user?.uid, dispatch]);
```

3. **Header-konfiguraatio dashboardeille:**
```javascript
<Stack.Screen 
  name="ParentDashboard" 
  component={ParentDashboard}
  options={{
    headerShown: true,
    headerRight: () => <NotificationBell />,
    headerStyle: { backgroundColor: colors.secondary },
    headerTintColor: colors.white,
    title: 'Dashboard'
  }}
/>
```

4. **Notifications-reitti:**
```javascript
<Stack.Screen name="Notifications" component={NotificationsScreen} />
```

### Redux Store Konfiguraatio

**Sijainti:** `src/store/index.js`

```javascript
import notificationsSlice from './slices/notificationsSlice';

const rootReducer = combineReducers({
  auth: authSlice,
  security: securitySlice,
  appData: appDataSlice,
  bookings: bookingsSlice,
  notifications: notificationsSlice, // ✅ Lisätty
});
```

## Firestore-tietorakenne

### notifications-kokoelma

```javascript
{
  userId: string,           // Vastaanottajan käyttäjätunnus
  type: string,             // 'booking_request' | 'booking_accepted' | 'booking_declined' | 'message'
  title: string,            // Ilmoituksen otsikko
  message: string,          // Ilmoituksen sisältö
  read: boolean,            // Onko luettu
  createdAt: Timestamp,     // Luontiaika
  navigationTarget: string, // Mihin näkymään navigoidaan (valinnainen)
  navigationParams: object  // Navigoinnin parametrit (valinnainen)
}
```

## Käyttöönotto

### 1. Päivitä Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Testaa sovelluksessa

1. **Kirjaudu vanhempana:**
   - Avaa Find Teachers
   - Varaa aika opettajalle
   - Tarkista että opettajalle tuli ilmoitus

2. **Kirjaudu opettajana:**
   - Näe ilmoitus ylhäällä (punainen badge)
   - Avaa ilmoitukset klikkaamalla kelloa
   - Hyväksy tai hylkää varaus
   - Tarkista että vanhemmalle tuli ilmoitus

3. **Testaa "Mark all as read":**
   - Avaa ilmoitukset
   - Paina "Lue kaikki"
   - Badge häviää

## Jatkokehitys

### Tulossa:

1. **Push-ilmoitukset:**
   - Expo Notifications API
   - FCM (Firebase Cloud Messaging)
   - Ilmoitukset myös kun sovellus ei ole auki

2. **Viesti-ilmoitukset:**
   - Kun chat-ominaisuus lisätään
   - Luo ilmoitus kun viesti saapuu

3. **Ilmoitusten asetukset:**
   - Käyttäjä voi valita mitä ilmoituksia haluaa
   - Tallennetaan käyttäjäasetuksiin

4. **Ilmoitusten poistaminen:**
   - Swipe-to-delete toiminto
   - Automaattinen vanhojen ilmoitusten poisto

## Tärkeät Huomiot

### Serialization

Firestore Timestamp-objektit konvertoidaan ISO-stringeiksi ennen Redux-storen tallennusta:

```javascript
createdAt: doc.data().createdAt?.toDate().toISOString()
```

### Suorituskyky

- Ilmoitukset haetaan kerran kirjautumisen yhteydessä
- Pull-to-refresh päivittää listan
- Firestore kuuntelee muutoksia reaaliajassa (tulevaisuudessa)

### Turvallisuus

- Käyttäjä näkee vain omat ilmoituksensa (Firestore rules)
- Ilmoitusten luonti vaatii autentikoinnin
- Parametrien validointi backendissä

## Tuki ja Ongelmatilanteet

### Ilmoitukset eivät näy:

1. Tarkista että käyttäjä on kirjautunut: `user?.uid`
2. Tarkista Redux state: `useSelector(state => state.notifications)`
3. Tarkista Firestore säännöt: Firebase Consolesta
4. Tarkista console.log -viestit

### Badge ei päivity:

1. Varmista että `unreadCount` lasketaan oikein
2. Tarkista että `markAsRead` toimii
3. Päivitä ilmoitukset pull-to-refresh toiminnolla

### Navigointi ei toimi:

1. Tarkista että `navigationTarget` on oikein
2. Varmista että reitti on määritelty `App.js`:ssä
3. Tarkista että `navigationParams` on oikein muotoiltu

---

**Versio:** 1.0  
**Päivitetty:** 14.11.2025  
**Tekijä:** AI Assistant
