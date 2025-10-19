// Firebase Configuration Template
// Kopioi tämä tiedosto nimellä firebaseConfig.js ja täytä omat Firebase-tietosi

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sinun Firebase-projektin konfiguraatio
// Löydät nämä tiedot Firebase Consolesta: Project Settings > Your apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID_HERE"
};

// Alusta Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  
  // React Native specific Auth initialization with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  
  console.log('Firebase initialized successfully with AsyncStorage persistence');
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Alusta Firestore
try {
  db = getFirestore(app);
} catch (error) {
  console.error('Error initializing Firestore:', error);
}

// Alusta Storage
try {
  storage = getStorage(app);
} catch (error) {
  console.error('Error initializing Storage:', error);
}

export { app, auth, db, storage };
