// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDOO7LlyJ6qv2TCxQ6B9Hn0sd8oSa4Wq_k",
  authDomain: "regionauth-16491.firebaseapp.com",
  projectId: "regionauth-16491",
  storageBucket: "regionauth-16491.appspot.com",
  messagingSenderId: "999341667907",
  appId: "1:999341667907:web:534b885ff4576db68d46f6",
  measurementId: "G-JHZNTHSF4B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


export { app, auth, db, storage };
export default app;