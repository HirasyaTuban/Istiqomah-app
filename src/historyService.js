import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayLabel(date) {
  return date.toLocaleDateString("id-ID", { weekday: "short" });
}

function countCompletedAmal(progressData) {
  if (!progressData) return 0;

  const keysToCount = [
    "qobliyahSubuh",
    "subuh",
    "qobliyahDzuhur",
    "dzuhur",
    "badiyahDzuhur",
    "ashar",
    "maghrib",
    "badiyahMaghrib",
    "isya",
    "badiyahIsya",
    "tilawahDone",
    "dzikirPagi",
    "dzikirPetang",
    "sedekah",
    "tahajud",
    "dhuha"
  ];

  return keysToCount.reduce((total, key) => total + (progressData[key] ? 1 : 0), 0);
}

export async function getWeeklyHistory(uid) {
  const today = new Date();
  const history = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dateKey = toDateKey(date);
    const dayLabel = getDayLabel(date);

    const progressRef = doc(db, "users", uid, "dailyProgress", dateKey);
    const snap = await getDoc(progressRef);

    const progressData = snap.exists() ? snap.data() : null;
    const totalAmal = countCompletedAmal(progressData);

    history.push({
      dateKey,
      dayLabel,
      totalAmal
    });
  }

  return history;
}