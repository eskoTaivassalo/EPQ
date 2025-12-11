// Push notification helpers (Expo Push + Firestore token storage)
// Safe to import even if you haven't installed expo-notifications yet, as long as you don't call register* on web/build.

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Platform } from 'react-native';

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
    badge: 1,
  };
  
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const json = await res.json().catch(() => ({}));
    
    // Check for FCM credential error
    if (json.data?.details?.error === 'InvalidCredentials') {
      // Try to send local notification as fallback
      return await sendLocalNotification(title, body);
    }
    
    if (!res.ok) {
      throw new Error('Push send failed');
    }
    
    return json;
  } catch (error) {
    // Fallback to local notification
    return await sendLocalNotification(title, body);
  }
}

// Fallback: Send local notification when remote push fails
export async function sendLocalNotification(title, body) {
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
      },
      trigger: null, // Send immediately
    });
    return { status: 'success', local: true };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Store a user's Expo push token for later use
export async function saveUserPushToken(userId, expoPushToken, userRole = null) {
  if (!db) throw new Error('Firestore not initialized');
  if (!userId || !expoPushToken) return;
  
  // Try to save to the correct collection based on role
  // First try teachers, then parents, then users as fallback
  const collections = userRole === 'teacher' ? ['teachers', 'parents'] : 
                     userRole === 'parent' ? ['parents', 'teachers'] :
                     userRole === 'admin' ? ['teachers', 'parents'] :
                     ['teachers', 'parents'];
  
  let saved = false;
  for (const collectionName of collections) {
    try {
      const { getDoc } = await import('firebase/firestore');
      const userDocRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        await setDoc(userDocRef, {
          pushToken: expoPushToken,
          push: {
            expo: {
              token: expoPushToken,
              updatedAt: new Date().toISOString(),
            },
          },
        }, { merge: true });
        saved = true;
        break;
      }
    } catch (error) {
    }
  }
}

// Register for push notifications, request permissions, and save token
// Note: Requires expo-notifications and expo-device to be installed.
export async function registerAndSaveExpoPushToken(userId, userRole = null) {
  try {
    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');

    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
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
      await saveUserPushToken(userId, token, userRole);
      return token;
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

export default {
  sendExpoPushNotification,
  sendLocalNotification,
  saveUserPushToken,
  registerAndSaveExpoPushToken,
};
