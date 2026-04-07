import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";

export async function saveGroupMessage(groupId, message, createdBy) {
  try {
    const cleanGroupId = (groupId || "").trim();
    const cleanMessage = (message || "").trim();
    const cleanCreatedBy = (createdBy || "").trim();

    if (!cleanGroupId) throw new Error("groupId wajib diisi.");
    if (!cleanMessage) throw new Error("Pesan wajib diisi.");

    await setDoc(doc(db, "groups", cleanGroupId, "message", "today"), {
      message: cleanMessage,
      createdBy: cleanCreatedBy || null,
      createdAt: serverTimestamp()
    });

    return { success: true };
  } catch (err) {
    console.error("SAVE GROUP MESSAGE ERROR:", err);
    throw err;
  }
}

export async function getGroupMessage(groupId) {
  console.log("DEBUG groupId (message):", groupId);
  try {
    const cleanGroupId = (groupId || "").trim();
    if (!cleanGroupId) return null;

    const snap = await getDoc(doc(db, "groups", cleanGroupId, "message", "today"));
    if (!snap.exists()) return null;

    const data = snap.data() || {};
    if (!data.message || !data.createdAt) return null;

    const createdAtDate =
      typeof data.createdAt?.toDate === "function"
        ? data.createdAt.toDate()
        : null;

    if (!createdAtDate) return null;

    const now = new Date();
    const diffHours = (now - createdAtDate) / (1000 * 60 * 60);

    if (diffHours > 24) return null;

    return {
      id: snap.id,
      ...data
    };
  } catch (err) {
    console.error("GET GROUP MESSAGE ERROR:", err);
    return null;
  }
}

export async function clearGroupMessage(groupId) {
  try {
    const cleanGroupId = (groupId || "").trim();
    if (!cleanGroupId) throw new Error("groupId wajib diisi.");

    await deleteDoc(doc(db, "groups", cleanGroupId, "message", "today"));

    return { success: true };
  } catch (err) {
    console.error("CLEAR GROUP MESSAGE ERROR:", err);
    throw err;
  }
}