import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLast7DayKeys() {
  const today = new Date();
  const keys = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    keys.push(`${y}-${m}-${day}`);
  }

  return keys;
}

function countDailyAmal(progress = {}) {
  const keys = [
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

  return keys.reduce((total, key) => total + (progress[key] ? 1 : 0), 0);
}

export async function getMemberDailyActivity(groupId) {
  if (!groupId) return [];

  try {
    const membersRef = collection(db, "groups", groupId, "members");
    const membersSnap = await getDocs(membersRef);

    const members = membersSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    const todayKey = getTodayKey();
    const weeklyKeys = getLast7DayKeys();

    const result = await Promise.all(
      members.map(async (member) => {
        const memberUid = String(
          member?.uid || member?.userId || member?.id || member?.["userId:"] || ""
        ).trim();

        if (!memberUid) return null;

        const progressRef = collection(db, "users", memberUid, "dailyProgress");
        const progressSnap = await getDocs(progressRef);

        const progressDocs = {};
        progressSnap.docs.forEach((docSnap) => {
          progressDocs[docSnap.id] = docSnap.data();
        });

        const todayProgress = progressDocs[todayKey] || null;
        const todayTotalAmal = todayProgress ? countDailyAmal(todayProgress) : 0;

        const weeklyHistory = {};
        weeklyKeys.forEach((key) => {
          const dayData = progressDocs[key];
          weeklyHistory[key] = {
            totalAmal: dayData ? countDailyAmal(dayData) : 0,
            tilawahPages: Number(dayData?.tilawahPages || 0)
          };
        });

        return {
          uid: memberUid,
          fullName: member?.fullName || member?.email || "Tanpa Nama",
          email: member?.email || "-",
          roleInGroup: member?.roleInGroup || "member",
          hasFilledToday: !!todayProgress,
          totalAmal: todayTotalAmal,
          weeklyHistory
        };
      })
    );

    return result.filter(Boolean);
  } catch (error) {
    console.error("GET MEMBER DAILY ACTIVITY ERROR:", error);
    return [];
  }
}