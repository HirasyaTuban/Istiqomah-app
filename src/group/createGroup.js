import { db } from "../firebase/firebaseConfig.js";

import {
  doc,
  setDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function createGroup(uid, groupName) {

  const groupRef = doc(collection(db, "groups"));

  await setDoc(groupRef, {
    name: groupName,
    ownerUid: uid,
    createdAt: new Date()
  });

}