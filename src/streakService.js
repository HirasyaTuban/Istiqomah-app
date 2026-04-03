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

async function getProgressByDate(uid, dateKey) {
  const progressRef = doc(db, "users", uid, "dailyProgress", dateKey);
  const snap = await getDoc(progressRef);
  return snap.exists() ? snap.data() : null;
}

export async function getIstiqomahStreak(uid) {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateKey = toDateKey(date);

    const progress = await getProgressByDate(uid, dateKey);
    const totalAmal = countCompletedAmal(progress);

    if (totalAmal > 0) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export function getStreakLabel(streak) {
  if (streak >= 100) return "Legenda Istiqomah";
  if (streak >= 40) return "Pejuang Konsisten";
  if (streak >= 14) return "Penjaga Ritme";
  if (streak >= 7) return "Tumbuh Istiqomah";
  if (streak >= 1) return "Memulai Konsisten";
  return "Belum mulai";
}