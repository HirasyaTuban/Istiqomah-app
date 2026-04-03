import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
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

  return keysToCount.reduce((total, key) => {
    return total + (progressData[key] ? 1 : 0);
  }, 0);
}

export async function getMemberDailyActivity(groupId) {
  const membersRef = collection(db, "groups", groupId, "members");
  const membersSnap = await getDocs(membersRef);

  if (membersSnap.empty) return [];

  const todayKey = getTodayKey();

  const members = await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const memberData = memberDoc.data();
      const uid = memberDoc.id;

      const progressRef = doc(db, "users", uid, "dailyProgress", todayKey);
      const progressSnap = await getDoc(progressRef);

      const progressData = progressSnap.exists() ? progressSnap.data() : null;
      const totalAmal = countCompletedAmal(progressData);

      return {
        uid,
        fullName: memberData.fullName || "Tanpa Nama",
        roleInGroup: memberData.roleInGroup || "member",
        totalAmal,
        hasFilledToday: totalAmal > 0
      };
    })
  );

  return members.sort((a, b) => b.totalAmal - a.totalAmal);
}