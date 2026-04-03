console.log("[NEW APP] src/app.js loaded");

import { auth as firebaseAuth } from "./firebase/firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

onAuthStateChanged(firebaseAuth, (user) => {
  if (user) {
    console.log("[NEW APP] Firebase user:", user.uid);
  } else {
    console.log("[NEW APP] Belum login");
  }
});