import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase konfiguraatio
// Arvot haettu google-services.json tiedostosta
const firebaseConfig = {
  apiKey: "AIzaSyA4n1pMKZS2givuFmoS2PbwnvzqYNhCSiM",
  authDomain: "parents2teachers-1d8a3.firebaseapp.com",
  projectId: "parents2teachers-1d8a3",
  storageBucket: "parents2teachers-1d8a3.firebasestorage.app",
  messagingSenderId: "892513281177",
  appId: "1:892513281177:android:63a652effb07a0b68c4408"
};

// Alusta Firebase
let app;
let auth;
let db;
let storage;

try {
  app = initializeApp(firebaseConfig);
  
  // Alusta Auth - käytä getAuth web-yhteensopivuudelle
  try {
    auth = getAuth(app);
  } catch (authError) {
    // Fallback React Native Auth:lle
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
  
  // Alusta Firestore
  db = getFirestore(app);
  
  // Alusta Storage
  storage = getStorage(app);
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  
  // Fallback jos Firebase ei ole konfiguroitu
  auth = null;
  db = null;
  storage = null;
}

export { auth, db, storage };
export default app;