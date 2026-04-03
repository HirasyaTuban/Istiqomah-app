import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getHijriMonthKey(month) {
  return `month-${month}`;
}

export async function getChallengeProgress(uid, hijriMonth) {

  const key = getHijriMonthKey(hijriMonth);

  const ref = doc(db, "users", uid, "challengeProgress", key);

  const snap = await getDoc(ref);

  return snap.exists() ? snap.data() : {};
}

export async function saveChallengeProgress(uid, hijriMonth, payload) {

  const key = getHijriMonthKey(hijriMonth);

  const ref = doc(db, "users", uid, "challengeProgress", key);

  await setDoc(ref, payload, { merge: true });
}