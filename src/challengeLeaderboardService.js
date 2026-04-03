import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function getHijriMonthKey(month) {
  return `month-${month}`;
}

function countChallengeChecked(data) {
  if (!data) return 0;

  return Object.values(data).reduce((total, value) => {
    return total + (value === true ? 1 : 0);
  }, 0);
}

export async function getChallengeLeaderboard(groupId, hijriMonth) {
  const membersRef = collection(db, "groups", groupId, "members");
  const membersSnap = await getDocs(membersRef);

  if (membersSnap.empty) return [];

  const monthKey = getHijriMonthKey(hijriMonth);

  const members = await Promise.all(
    membersSnap.docs.map(async (memberDoc) => {
      const memberData = memberDoc.data();
      const uid = memberDoc.id;

      const challengeRef = doc(db, "users", uid, "challengeProgress", monthKey);
      const challengeSnap = await getDoc(challengeRef);

      const challengeData = challengeSnap.exists() ? challengeSnap.data() : null;
      const totalProgress = countChallengeChecked(challengeData);

      return {
        uid,
        fullName: memberData.fullName || "Tanpa Nama",
        roleInGroup: memberData.roleInGroup || "member",
        totalProgress
      };
    })
  );

  return members.sort((a, b) => b.totalProgress - a.totalProgress);
}