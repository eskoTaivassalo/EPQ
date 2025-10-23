import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase konfiguraatio
// Arvot haettu google-services.json tiedostosta
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Alusta Firebase
let app;
let auth;
let db;
let storage;
let analytics;

try {
  app = initializeApp(firebaseConfig);
  
  // React Native specific Auth initialization with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  // Alusta Firestore
  db = getFirestore(app);
  
  // Alusta Storage
  storage = getStorage(app);
  
  // Alusta Analytics (vain webissä)
  try {
    const { getAnalytics } = require('firebase/analytics');
    analytics = getAnalytics(app);
    console.log('Firebase Analytics initialized');
  } catch (e) {
    console.log('Firebase Analytics not available (native build)');
  }
  
  console.log('Firebase initialized successfully with AsyncStorage persistence');
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Fallback jos Firebase ei ole konfiguroitu
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage, analytics };
export default app;