# FCM (Firebase Cloud Messaging) Setup for Push Notifications

## Ongelma
Push-notifikaatiot palauttavat virheen:
```
"Unable to retrieve the FCM server key for the recipient's app. 
Make sure you have provided a server key as directed by the Expo FCM documentation."
```

## Ratkaisu: FCM Credentials Upload Expo:hon

### Vaihtoehto 1: EAS CLI (Suositeltu)

1. **Asenna EAS CLI:**
```bash
npm install -g eas-cli
```

2. **Kirjaudu Expo-tilillesi:**
```bash
eas login
```

3. **Lataa FCM credentials:**
```bash
eas credentials
```
- Valitse Android
- Valitse "Push Notifications: Manage your FCM API Key"
- Valitse "google-services.json"
- Osoita tiedostoon: `./google-services.json`

### Vaihtoehto 2: Expo Dashboard (Web UI)

1. Mene osoitteeseen: https://expo.dev/accounts/eskotaivassalo/projects/ParentsTeachersApp/credentials
2. Valitse Android
3. Lataa `google-services.json` FCM credentials -osioon
4. Tallenna

### Vaihtoehto 3: Firebase Console - Hanki FCM Server Key

1. Mene Firebase Consoleen: https://console.firebase.google.com/project/edproquo2/settings/cloudmessaging
2. Cloud Messaging API (Legacy) -osiossa:
   - Ota käyttöön "Cloud Messaging API (Legacy)" jos ei ole päällä
   - Kopioi "Server key"
3. Lisää se Expo Dashboardiin manuaalisesti

## Väliaikainen Ratkaisu: Local Push Service

Jos et halua konfiguroida FCM:ää vielä, voit käyttää local notification -palvelua kehityksessä:

### Päivitä `pushService.js`:

```javascript
// Käytä local notificationeja jos FCM ei ole konfiguroitu
export async function sendLocalNotification(title, body) {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null, // Lähetä heti
    });
    console.log('[pushService] ✅ Local notification sent');
    return { status: 'success' };
  } catch (error) {
    console.error('[pushService] ❌ Local notification failed:', error);
    return { status: 'error', message: error.message };
  }
}
```

## Testaus

Kun FCM on konfiguroitu:

1. Käynnistä app uudelleen:
```bash
npx expo start -c
```

2. Testaa push-notifikaatiota lähettämällä viesti toiselle käyttäjälle

3. Tarkista että notifikaatio saapuu ilman virheitä

## Dokumentaatio

- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- FCM Setup: https://docs.expo.dev/push-notifications/fcm/
- EAS Credentials: https://docs.expo.dev/app-signing/local-credentials/
