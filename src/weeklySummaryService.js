import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getLast7DaysKeys() {
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

export async function getWeeklySummary(groupId) {
  if (!groupId) return [];

  console.log("DEBUG groupId (summary):", groupId);

  const membersRef = collection(db, "groups", groupId, "members");
  const membersSnap = await getDocs(membersRef);

  const members = membersSnap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));

  //console.log("DEBUG weekly members:", members);

  const keys = getLast7DaysKeys();
  const result = [];

  for (const m of members) {
    const memberUid = String(m.uid || m.userId || m.id || "").trim();

    console.log("DEBUG member weekly summary:", m, "=>", memberUid);

    if (!memberUid) {
      console.warn("SKIP member tanpa uid/userId:", m);
      continue;
    }

    const progressRef = collection(db, "users", memberUid, "dailyProgress");
    const snap = await getDocs(progressRef);

    let activeDays = 0;
    let totalTilawah = 0;

    const docs = {};
    snap.docs.forEach((d) => {
      docs[d.id] = d.data();
    });

    keys.forEach((k) => {
      if (docs[k]) {
        activeDays += 1;
        totalTilawah += Number(docs[k]?.tilawahPages || 0);
      }
    });

    const score = activeDays * 10 + totalTilawah;

    result.push({
      uid: memberUid,
      name: m.fullName || m.email || "Tanpa Nama",
      activeDays,
      totalTilawah,
      score
    });
  }

  return result;
}