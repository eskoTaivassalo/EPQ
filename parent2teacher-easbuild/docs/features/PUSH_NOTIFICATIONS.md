# Push Notifications (Expo) - Plan and MVP

This app already has an in-app notifications bell backed by Firestore (`notifications` collection). To alert teachers immediately when a booking is made, we will add push notifications using Expo.

## MVP scope

1. Register device push tokens
   - Use `expo-notifications` to request permission and get Expo push token
   - Save token into Firestore under `users/{uid}.push.expo.token`
2. Send push on booking
   - After a booking is created, send a push to the teacher’s token via Expo Push API
   - Continue writing an in-app notification document so the bell shows a badge as fallback

## Files added

- `src/services/pushService.js`
  - `registerAndSaveExpoPushToken(userId)` – ask permission, get Expo token, store it
  - `sendExpoPushNotification(to, title, body, data)` – REST call to Expo
  - `saveUserPushToken(userId, token)` – Firestore helper

- availability booking flow now writes an in-app notification doc to `notifications` for the teacher.

## Wiring instructions

1) Install native libs (Expo SDK 54)

Use Expo installer to get the correct versions:

```powershell
# from project root
npx expo install expo-notifications expo-device
```

2) Register token on app start (after user signs in)

Add to `App.js` (pseudo):

```js
import { registerAndSaveExpoPushToken } from './src/services/pushService';

useEffect(() => {
  if (user?.uid) {
    registerAndSaveExpoPushToken(user.uid);
  }
}, [user?.uid]);
```

3) Send push when booking is made (serverless MVP)

- Already in place to create Firestore notification docs after booking.
- Next: look up teacher’s token and call `sendExpoPushNotification`.
  - Option A: Do this on the client right after booking succeeds (simple, MVP)
  - Option B: Use a Cloud Function trigger on `bookings` create (robust, secure)

4) Android/iOS setup notes

- Android
  - Ensure you have a Notification channel:
    - `expo-notifications` code in `pushService` sets a default channel
  - FCM: when moving off the Expo push service in the future, configure FCM API key
- iOS
  - Push requires real device and proper Apple push entitlements via EAS build
  - Users must grant permission; consider a soft prompt explaining the value first

## Security & privacy

- Tokens are stored under the authenticated user’s doc; only the owner can update their token per security rules
- Do not expose tokens in public data; send pushes from trusted surfaces only

## Future improvements

- Cloud Functions trigger: send push on `bookings` document creation
- Notification preferences per user (mute, types)
- Deep links from push to booking detail
- Real-time listener for notifications to update the bell without manual refresh

## Testing

- Use Expo Go or development build on a physical device
- After logging in, check Firestore `users/{uid}` for `push.expo.token`
- Trigger a booking from a parent account; teacher device should receive a push (after Step 3 is completed)
