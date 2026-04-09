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

function normalizeGroupId(groupId) {
  if (typeof groupId === "string") {
    return groupId.trim();
  }

  if (groupId && typeof groupId === "object") {
    return String(groupId.id || groupId.groupId || "").trim();
  }

  return "";
}

export async function getWeeklySummary(groupId) {
  try {
    const cleanGroupId = normalizeGroupId(groupId);

    if (!cleanGroupId) {
      console.warn("getWeeklySummary: groupId tidak valid:", groupId);
      return [];
    }

    if (!db) {
      console.error("getWeeklySummary: Firestore db belum tersedia");
      return [];
    }

    console.log("DEBUG groupId (summary):", cleanGroupId);

    const membersRef = collection(db, "groups", cleanGroupId, "members");
    const membersSnap = await getDocs(membersRef);

    const members = membersSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    if (!members.length) {
      return [];
    }

    const keys = getLast7DaysKeys();

    const result = await Promise.all(
      members.map(async (member) => {
        const memberUid = String(
          member?.uid || member?.userId || member?.id || ""
        ).trim();

        console.log("DEBUG member weekly summary:", member, "=>", memberUid);

        if (!memberUid) {
          console.warn("SKIP member tanpa uid/userId:", member);
          return null;
        }

        const progressRef = collection(db, "users", memberUid, "dailyProgress");
        const snap = await getDocs(progressRef);

        const docs = {};
        snap.docs.forEach((docSnap) => {
          docs[docSnap.id] = docSnap.data();
        });

        let activeDays = 0;
        let totalTilawah = 0;

        keys.forEach((key) => {
          const dayData = docs[key];
          if (!dayData) return;

          activeDays += 1;
          totalTilawah += Number(dayData?.tilawahPages || 0);
        });

        const score = activeDays * 10 + totalTilawah;

        return {
          uid: memberUid,
          name: member?.fullName || member?.email || "Tanpa Nama",
          activeDays,
          totalTilawah,
          score
        };
      })
    );

    return result
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("getWeeklySummary ERROR:", error, {
      groupId
    });
    return [];
  }
}