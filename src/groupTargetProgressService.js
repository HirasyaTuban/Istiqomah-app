import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

function getStartOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() + diffToMonday);

  return start;
}

function normalizeDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "string") return new Date(value);
  if (value instanceof Date) return value;

  return null;
}

function isAfterWeekStart(date) {
  if (!date) return false;
  return date >= getStartOfCurrentWeek();
}

function countCheckedDays(progressDocs, key) {
  return progressDocs.filter((item) => !!item[key]).length;
}

function countTilawahDays(progressDocs) {
  return progressDocs.filter((item) => {
    return !!item.tilawahDone || Number(item.tilawahPages || 0) > 0;
  }).length;
}

export async function getGroupTargetProgress(uid, targetData) {
  try {
    if (!uid || !targetData) {
      return {
        supported: false,
        label: "Target tidak ditemukan."
      };
    }

    if (!targetData.type || !targetData.target) {
      return {
        supported: false,
        label: "Target belum terstruktur"
      };
    }

    const progressRef = collection(db, "users", uid, "dailyProgress");
    const progressQuery = query(progressRef, orderBy("date", "desc"));
    const snapshot = await getDocs(progressQuery);

    const docs = snapshot.docs
      .map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      .filter((item) => {
        const dateObj =
          normalizeDate(item.createdAt) ||
          normalizeDate(item.updatedAt) ||
          normalizeDate(item.date);

        return isAfterWeekStart(dateObj);
      });

    let current = 0;

    if (targetData.type === "dzikirPagi") {
      current = countCheckedDays(docs, "dzikirPagi");
    } else if (targetData.type === "dzikirPetang") {
      current = countCheckedDays(docs, "dzikirPetang");
    } else if (targetData.type === "tilawah") {
      current = countTilawahDays(docs);
    } else if (targetData.type === "subuh") {
      current = countCheckedDays(docs, "subuh");
    } else if (targetData.type === "sedekah") {
      current = countCheckedDays(docs, "sedekah");
    } else if (targetData.type === "dhuha") {
      current = countCheckedDays(docs, "dhuha");
    } else {
      return {
        supported: false,
        label: "Jenis target belum didukung"
      };
    }

    const target = Number(targetData.target || 0);
    const percent =
      target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

    return {
      supported: true,
      current,
      target,
      percent
    };
  } catch (err) {
    console.error("GET GROUP TARGET PROGRESS ERROR:", err);
    return {
      supported: false,
      label: "Gagal membaca progress target"
    };
  }
}