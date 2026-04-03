import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function calculatePoints(progress) {
  let points = 0;

  const checklist = [
    "subuh",
    "dzuhur",
    "ashar",
    "maghrib",
    "isya",
    "dzikirPagi",
    "dzikirPetang",
    "sedekah",
    "dhuha",
    "tahajud"
  ];

  checklist.forEach((key) => {
    if (progress[key]) points += 10;
  });

  points += (progress.tilawahPages || 0) * 2;

  return points;
}

function determineLevel(totalPoints) {
  if (totalPoints >= 2000) return "Mujahid Ibadah";
  if (totalPoints >= 1200) return "Ahli Amal";
  if (totalPoints >= 600) return "Pejuang Istiqomah";
  if (totalPoints >= 200) return "Penjaga Amal";
  return "Pemula";
}

function determineBadges(progress) {
  const badges = [];

  if (progress.subuh) badges.push("Penjaga Subuh");
  if ((progress.tilawahPages || 0) >= 5) badges.push("Ahli Tilawah");
  if (progress.tahajud) badges.push("Pejuang Tahajud");
  if (progress.sedekah) badges.push("Sahabat Sedekah");

  return badges;
}

function determineHijriBadge(hijriMonth, challengeProgress) {
  const totalChecked = Object.values(challengeProgress || {}).filter(
    (value) => value === true
  ).length;

  if (totalChecked === 0) return null;

  const badgeMap = {
    1: "Penjaga Muharram",
    2: "Sahabat Safar",
    3: "Pecinta Rasul",
    4: "Akhlaq Mulia",
    5: "Penjaga Dzikir",
    6: "Sahabat Sedekah",
    7: "Sahabat Rajab",
    8: "Pejuang Sya'ban",
    9: "Pejuang Ramadhan",
    10: "Penjaga Syawal",
    11: "Penjaga Konsistensi",
    12: "Musim Kebaikan"
  };

  return badgeMap[hijriMonth] || null;
}

export async function updateGamification(uid, todayProgress) {
  const pointsToday = calculatePoints(todayProgress);

  const userGamRef = doc(db, "users", uid, "gamification", "stats");
  const gamSnap = await getDoc(userGamRef);

  let totalPoints = pointsToday;

  if (gamSnap.exists()) {
    totalPoints += gamSnap.data().totalPoints || 0;
  }

  const level = determineLevel(totalPoints);
  const badges = determineBadges(todayProgress);

  await setDoc(
    userGamRef,
    {
      totalPoints,
      level,
      badges,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    totalPoints,
    level,
    badges
  };
}

export async function getGamification(uid) {
  const userGamRef = doc(db, "users", uid, "gamification", "stats");
  const gamSnap = await getDoc(userGamRef);

  if (!gamSnap.exists()) {
    return {
      totalPoints: 0,
      level: "Pemula",
      badges: []
    };
  }

  return gamSnap.data();
}

export async function updateHijriBadge(uid, hijriMonth, challengeProgress) {
  const userGamRef = doc(db, "users", uid, "gamification", "stats");
  const gamSnap = await getDoc(userGamRef);

  let currentData = {
    totalPoints: 0,
    level: "Pemula",
    badges: []
  };

  if (gamSnap.exists()) {
    currentData = {
      ...currentData,
      ...gamSnap.data()
    };
  }

  const hijriBadge = determineHijriBadge(hijriMonth, challengeProgress);

  let updatedBadges = currentData.badges || [];

  if (hijriBadge && !updatedBadges.includes(hijriBadge)) {
    updatedBadges = [...updatedBadges, hijriBadge];
  }

  await setDoc(
    userGamRef,
    {
      ...currentData,
      badges: updatedBadges,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );

  return {
    ...currentData,
    badges: updatedBadges
  };
}