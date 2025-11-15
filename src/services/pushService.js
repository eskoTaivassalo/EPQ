// Push notification helpers (Expo Push + Firestore token storage)
// Safe to import even if you haven't installed expo-notifications yet, as long as you don't call register* on web/build.

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Minimal REST call to Expo Push API. Works without expo-notifications package on the sender side.
export async function sendExpoPushNotification(to, title, body, data = {}) {
  if (!to) throw new Error('Missing target push token');
  const payload = {
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('Expo push send failed', res.status, json);
    throw new Error('Push send failed');
  }
  return json;
}

// Store a user's Expo push token for later use
export async function saveUserPushToken(userId, expoPushToken) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !expoPushToken) return;
  const ref = doc(db, 'users', userId);
  await setDoc(ref, {
    push: {
      expo: {
        token: expoPushToken,
        updatedAt: new Date().toISOString(),
      },
    },
  }, { merge: true });
}

// Register for push notifications, request permissions, and save token
// Note: Requires expo-notifications and expo-device to be installed.
export async function registerAndSaveExpoPushToken(userId) {
  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.isDevice) {
      console.log('[push] Not a physical device; skipping token registration');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[push] Notification permissions not granted');
      return null;
    }

    // On Android, set channel for importance
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const projectId = Notifications?.getExpoPushTokenAsync
      ? undefined // SDK 49+: auto-detect via app.json extra.eas.projectId
      : undefined;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse?.data || tokenResponse;
    if (token) {
      await saveUserPushToken(userId, token);
      return token;
    }
    return null;
  } catch (e) {
    console.warn('[push] Token registration failed', e);
    return null;
  }
}

export default {
  sendExpoPushNotification,
  saveUserPushToken,
  registerAndSaveExpoPushToken,
};
