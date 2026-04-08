import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

function parseTargetText(rawText = "") {
  const text = (rawText || "").trim().toLowerCase();

  if (!text) {
    throw new Error("Target tidak boleh kosong.");
  }

  const matchNumber = text.match(/\d+/);
  const targetValue = matchNumber ? Number(matchNumber[0]) : null;

  if (!targetValue || targetValue < 1) {
    throw new Error("Angka target wajib ada. Contoh: Dzikir pagi 5");
  }

  if (text.includes("dzikir pagi")) {
    return {
      text: rawText.trim(),
      type: "dzikirPagi",
      target: targetValue,
      unit: "hari"
    };
  }

  if (text.includes("dzikir petang")) {
    return {
      text: rawText.trim(),
      type: "dzikirPetang",
      target: targetValue,
      unit: "hari"
    };
  }

  if (text.includes("tilawah")) {
    return {
      text: rawText.trim(),
      type: "tilawah",
      target: targetValue,
      unit: "hari"
    };
  }

  if (text.includes("subuh")) {
    return {
      text: rawText.trim(),
      type: "subuh",
      target: targetValue,
      unit: "hari"
    };
  }

  if (text.includes("sedekah")) {
    return {
      text: rawText.trim(),
      type: "sedekah",
      target: targetValue,
      unit: "hari"
    };
  }

  if (text.includes("dhuha")) {
    return {
      text: rawText.trim(),
      type: "dhuha",
      target: targetValue,
      unit: "hari"
    };
  }

  throw new Error(
    "Format target belum didukung. Contoh: Dzikir pagi 5, Tilawah 7, Sedekah 3"
  );
}

export async function saveGroupTarget(groupId, rawTarget, createdBy) {
  try {
    const cleanGroupId = (groupId || "").trim();
    const cleanCreatedBy = (createdBy || "").trim();

    if (!cleanGroupId) throw new Error("groupId wajib diisi.");

    const parsed = parseTargetText(rawTarget);

    await setDoc(doc(db, "groups", cleanGroupId, "target", "weekly"), {
      ...parsed,
      createdBy: cleanCreatedBy || null,
      createdAt: serverTimestamp()
    });

    return {
      success: true,
      ...parsed
    };
  } catch (err) {
    console.error("SAVE GROUP TARGET ERROR:", err);
    throw err;
  }
}

export async function getGroupTarget(groupId) {
  try {
    const cleanGroupId = (groupId || "").trim();

    if (!cleanGroupId) {
      return {
        status: "invalid",
        data: null
      };
    }

    const snap = await getDoc(doc(db, "groups", cleanGroupId, "target", "weekly"));

    if (!snap.exists()) {
      return {
        status: "empty",
        data: null
      };
    }

    const data = snap.data() || {};

    if (!data.text || !data.createdAt) {
      return {
        status: "invalid-data",
        data: null
      };
    }

    const createdAtDate =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : null;

    if (!createdAtDate) {
      return {
        status: "invalid-date",
        data: null
      };
    }

    const now = new Date();
    const diffDays = (now - createdAtDate) / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return {
        status: "expired",
        data: null
      };
    }

    return {
      status: "ok",
      data: {
        id: snap.id,
        ...data
      }
    };
  } catch (err) {
    console.error("GET GROUP TARGET ERROR:", err);
    return {
      status: "error",
      data: null
    };
  }
}

export async function clearGroupTarget(groupId) {
  try {
    const cleanGroupId = (groupId || "").trim();
    if (!cleanGroupId) throw new Error("groupId wajib diisi.");

    await deleteDoc(doc(db, "groups", cleanGroupId, "target", "weekly"));

    return { success: true };
  } catch (err) {
    console.error("CLEAR GROUP TARGET ERROR:", err);
    throw err;
  }
}