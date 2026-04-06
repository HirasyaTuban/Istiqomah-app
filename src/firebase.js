import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA7KlqqUwTw-RugkzEBx6AzdsvGsju0e2A",
  authDomain: "istiqomah-app-ef808.firebaseapp.com",
  projectId: "istiqomah-app-ef808",
  storageBucket: "istiqomah-app-ef808.firebasestorage.app",
  messagingSenderId: "858842977043",
  appId: "1:858842977043:web:3012e40f86ac166efc00e6",
  measurementId: "G-M1VX8E7DY4"
};

const app = initializeApp(firebaseConfig);

const DEBUG = false;

if (DEBUG) {
  console.log("FIREBASE PROJECT ID:", firebaseConfig.projectId);
  console.log("FIREBASE AUTH DOMAIN:", firebaseConfig.authDomain);
}

export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

if (DEBUG) {
  console.log("FIREBASE AUTH OBJECT:", auth);
}

export const db = getFirestore(app);