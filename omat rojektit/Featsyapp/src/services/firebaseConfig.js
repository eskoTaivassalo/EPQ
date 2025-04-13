import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD8YfGV7trIHV9J8Ii4IFjaHFmZ_N5NO9s",
  authDomain: "featsyapp-d8eeb.firebaseapp.com",
  projectId: "featsyapp-d8eeb",
  storageBucket: "featsyapp-d8eeb.appspot.com",
  messagingSenderId: "830848532227",
  appId: "1:830848532227:android:6696eb61d0c2ff3e39b336",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Käytä `getAuth`-funktiota ilman ReactNativeAsyncStoragea
const auth = getAuth(app);

export { db, auth };
