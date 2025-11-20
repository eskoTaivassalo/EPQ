// Push notification helpers (Expo Push + Firestore token storage)
// Safe to import even if you haven't installed expo-notifications yet, as long as you don't call register* on web/build.

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Platform } from 'react-native';

// Minimal REST call to Expo Push API. Works without expo-notifications package on the sender side.
export async function sendExpoPushNotification(to, title, body, data = {}) {
  if (!to) throw new Error('Missing target push token');
  
  console.log('[pushService] 📤 Sending push notification...');
  console.log('[pushService]   To:', to);
  console.log('[pushService]   Title:', title);
  console.log('[pushService]   Body:', body);
  
  const payload = {
    to,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
    badge: 1, // Increment badge by 1 (not set to absolute value)
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
    console.error('[pushService] ❌ Expo push send failed:', res.status, json);
    throw new Error('Push send failed');
  }
  
  console.log('[pushService] ✅ Push notification sent successfully:', json);
  console.log('[pushService]   Response data:', JSON.stringify(json.data, null, 2));
  return json;
}

// Store a user's Expo push token for later use
export async function saveUserPushToken(userId, expoPushToken) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !expoPushToken) return;
  
  console.log('[pushService] 💾 Saving push token to Firestore...');
  console.log('[pushService]   User ID:', userId);
  console.log('[pushService]   Token:', expoPushToken);
  
  const ref = doc(db, 'users', userId);
  await setDoc(ref, {
    push: {
      expo: {
        token: expoPushToken,
        updatedAt: new Date().toISOString(),
      },
    },
  }, { merge: true });
  
  console.log('[pushService] ✅ Push token saved to Firestore');
}

// Register for push notifications, request permissions, and save token
// Note: Requires expo-notifications and expo-device to be installed.
export async function registerAndSaveExpoPushToken(userId) {
  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    console.log('[pushService] 🔍 Checking device type...');
    if (!Device.isDevice) {
      console.log('[pushService] ⚠️ Not a physical device; skipping token registration');
      return null;
    }
    console.log('[pushService] ✅ Physical device detected');

    console.log('[pushService] 🔐 Checking notification permissions...');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[pushService]   Existing status:', existingStatus);
    
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      console.log('[pushService] 📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[pushService]   New status:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[pushService] ❌ Notification permissions not granted');
      return null;
    }
    console.log('[pushService] ✅ Notification permissions granted');

    // On Android, set channel for importance
    if (Platform.OS === 'android') {
      console.log('[pushService] 📱 Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('[pushService] ✅ Android notification channel configured');
    }

    console.log('[pushService] 🎫 Getting Expo push token...');
    const projectId = Notifications?.getExpoPushTokenAsync
      ? undefined // SDK 49+: auto-detect via app.json extra.eas.projectId
      : undefined;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse?.data || tokenResponse;
    console.log('[pushService]   Token response:', token);
    
    if (token) {
      await saveUserPushToken(userId, token);
      return token;
    }
    
    console.warn('[pushService] ⚠️ No token received from Expo');
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
