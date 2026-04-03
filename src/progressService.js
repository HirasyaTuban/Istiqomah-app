import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getTodayInfo } from "./calendarEngine.js";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultProgress(dateKey, todayInfo = null) {
  return {
    date: dateKey,
    hijriMonth: todayInfo?.hijriMonth || "",
    hijriDay: todayInfo?.hijriDay || 0,
    hijriDate: todayInfo?.hijriDate || "",
    qobliyahSubuh: false,
    subuh: false,
    qobliyahDzuhur: false,
    dzuhur: false,
    badiyahDzuhur: false,
    ashar: false,
    maghrib: false,
    badiyahMaghrib: false,
    isya: false,
    badiyahIsya: false,
    tilawahDone: false,
    tilawahPages: 0,
    dzikirPagi: false,
    dzikirPetang: false,
    sedekah: false,
    tahajud: false,
    dhuha: false,
    syukur: ""
  };
}

export async function getTodayProgress(uid) {
  const dateKey = getTodayKey();
  const todayInfo = getTodayInfo();
  const progressRef = doc(db, "users", uid, "dailyProgress", dateKey);
  const snap = await getDoc(progressRef);

  if (!snap.exists()) {
    return getDefaultProgress(dateKey, todayInfo);
  }

  return {
    ...getDefaultProgress(dateKey, todayInfo),
    ...snap.data(),
    date: dateKey
  };
}

export async function saveTodayProgress(uid, payload) {
  const dateKey = getTodayKey();
  const todayInfo = getTodayInfo();
  const progressRef = doc(db, "users", uid, "dailyProgress", dateKey);

  await setDoc(
    progressRef,
    {
      ...payload,
      date: dateKey,
      hijriMonth: todayInfo.hijriMonth || "",
      hijriDay: Number(todayInfo.hijriDay || 0),
      hijriDate: todayInfo.hijriDate || "",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return true;
}

export function getProgressItems() {
  return [
    { key: "qobliyahSubuh", label: "Qobliyah Subuh", type: "checkbox" },
    { key: "subuh", label: "Subuh", type: "checkbox" },
    { key: "qobliyahDzuhur", label: "Qobliyah Dzuhur", type: "checkbox" },
    { key: "dzuhur", label: "Dzuhur", type: "checkbox" },
    { key: "badiyahDzuhur", label: "Ba'diyah Dzuhur", type: "checkbox" },
    { key: "ashar", label: "Ashar", type: "checkbox" },
    { key: "maghrib", label: "Maghrib", type: "checkbox" },
    { key: "badiyahMaghrib", label: "Ba'diyah Maghrib", type: "checkbox" },
    { key: "isya", label: "Isya", type: "checkbox" },
    { key: "badiyahIsya", label: "Ba'diyah Isya", type: "checkbox" },
    { key: "tilawahDone", label: "Tilawah", type: "checkbox" },
    { key: "dzikirPagi", label: "Dzikir pagi", type: "checkbox" },
    { key: "dzikirPetang", label: "Dzikir petang", type: "checkbox" },
    { key: "sedekah", label: "Sedekah", type: "checkbox" },
    { key: "tahajud", label: "Tahajud", type: "checkbox" },
    { key: "dhuha", label: "Dhuha", type: "checkbox" }
  ];
}