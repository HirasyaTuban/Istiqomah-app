import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const actionCodeSettings = {
  url: "https://hirasyatuban.github.io/Istiqomah-app/",
  handleCodeInApp: false
};

// REGISTER OWNER
export async function registerOwner(fullName, email, password, groupName) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanFullName = (fullName || "").trim();
    const cleanGroupName = (groupName || "").trim();

    if (!cleanFullName) throw new Error("Nama lengkap wajib diisi.");
    if (!cleanEmail) throw new Error("Email wajib diisi.");
    if (!password || password.length < 6) throw new Error("Password minimal 6 karakter.");
    if (!cleanGroupName) throw new Error("Nama group wajib diisi.");

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: cleanFullName
    });

    const groupRef = doc(collection(db, "groups"));
    const batch = writeBatch(db);

    batch.set(doc(db, "users", user.uid), {
      fullName: cleanFullName,
      email: cleanEmail,
      status: "pending",
      role: "owner",
      ownerId: user.uid,
      createdAt: serverTimestamp()
    });

    batch.set(groupRef, {
      name: cleanGroupName,
      type: "private",
      ownerUid: user.uid,
      memberCount: 1,
      createdAt: serverTimestamp()
    });

    batch.set(doc(db, "groups", groupRef.id, "members", user.uid), {
      uid: user.uid,
      userId: user.uid,
      fullName: cleanFullName,
      email: cleanEmail,
      roleInGroup: "owner",
      status: "active",
      joinedAt: serverTimestamp()
    });

    batch.set(doc(db, "users", user.uid, "memberships", groupRef.id), {
      groupId: groupRef.id,
      groupName: cleanGroupName,
      ownerId: user.uid,
      roleInGroup: "owner",
      joinedAt: serverTimestamp(),
      isPrimary: true
    });

    await batch.commit();

    await sendEmailVerification(user, actionCodeSettings);
    await signOut(auth);

    return {
      uid: user.uid,
      groupId: groupRef.id,
      needsEmailVerification: true,
      message: "Registrasi berhasil. Silakan cek email terbaru untuk verifikasi sebelum login."
    };
  } catch (err) {
    console.error("REGISTER OWNER ERROR:", err);

    if (err.code === "auth/email-already-in-use") {
      throw new Error("Email sudah terdaftar. Silakan login atau gunakan fitur lupa password.");
    }

    if (err.code === "auth/invalid-email") {
      throw new Error("Format email tidak valid.");
    }

    if (err.code === "auth/weak-password") {
      throw new Error("Password terlalu lemah. Gunakan minimal 6 karakter.");
    }

    throw err;
  }
}

// LOGIN
export async function loginUser(email, password) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) throw new Error("Email wajib diisi.");
    if (!password) throw new Error("Password wajib diisi.");

    console.log("LOGIN START:", { email: cleanEmail });

    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    console.log("LOGIN SUCCESS FIREBASE:", {
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified
    });

    await user.reload();

    console.log("LOGIN AFTER RELOAD:", {
      uid: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified
    });

    if (!user.emailVerified) {
      const err = new Error(
        "Email belum diverifikasi. Klik 'Kirim ulang verifikasi', lalu buka email terbaru."
      );
      err.code = "auth/email-not-verified";
      throw err;
    }

    return user;
  } catch (err) {
    console.error("LOGIN ERROR FULL:", {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
      raw: err
    });

    if (err.code === "auth/invalid-credential") {
      throw new Error("Email atau password salah.");
    }

    if (err.code === "auth/user-disabled") {
      throw new Error("Akun ini dinonaktifkan.");
    }

    if (err.code === "auth/too-many-requests") {
      throw new Error("Terlalu banyak percobaan login. Coba lagi beberapa saat.");
    }

    if (err.code === "auth/network-request-failed") {
      throw new Error("Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.");
    }

    throw err;
  }
}

export async function resendEmailVerificationManually(email, password) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error("Email wajib diisi.");
    }

    if (!password) {
      throw new Error("Password wajib diisi untuk kirim ulang verifikasi.");
    }

    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    await user.reload();

    if (user.emailVerified) {
      await signOut(auth);
      return {
        success: true,
        alreadyVerified: true,
        message: "Email ini sudah terverifikasi. Silakan langsung login."
      };
    }

    await sendEmailVerification(user, actionCodeSettings);
    await signOut(auth);

    return {
      success: true,
      alreadyVerified: false,
      message: "Link verifikasi terbaru berhasil dikirim. Buka email yang paling baru, jangan gunakan link lama."
    };
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR:", err);

    if (err.code === "auth/invalid-credential") {
      throw new Error("Email atau password salah.");
    }

    if (err.code === "auth/user-disabled") {
      throw new Error("Akun ini dinonaktifkan.");
    }

    throw err;
  }
}

// JOIN GROUP DENGAN BUAT AKUN BARU
export async function joinGroup(fullName, email, password, inviteCode) {
  try {
    const cleanFullName = (fullName || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const normalizedInviteCode = (inviteCode || "").trim().toUpperCase();

    if (!cleanFullName) throw new Error("Nama lengkap wajib diisi.");
    if (!cleanEmail) throw new Error("Email wajib diisi.");
    if (!password || password.length < 6) throw new Error("Password minimal 6 karakter.");
    if (!normalizedInviteCode) throw new Error("Kode invite wajib diisi.");

    const inviteQuery = query(
      collection(db, "groupInvites"),
      where("inviteCode", "==", normalizedInviteCode),
      where("status", "==", "active")
    );

    const inviteSnapshot = await getDocs(inviteQuery);

    if (inviteSnapshot.empty) {
      throw new Error("Kode invite tidak valid.");
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const inviteData = inviteDoc.data();
    const groupId = inviteData.groupId;
    const groupName = inviteData.groupName || "Group";
    const groupOwnerUid = inviteData.ownerUid || null;

    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    await updateProfile(user, {
      displayName: cleanFullName
    });

    await sendEmailVerification(user, actionCodeSettings);

    await setDoc(doc(db, "users", user.uid), {
      fullName: cleanFullName,
      email: cleanEmail,
      status: "active",
      role: "member",
      ownerId: groupOwnerUid,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "groups", groupId, "members", user.uid), {
      uid: user.uid,
      userId: user.uid,
      fullName: cleanFullName,
      email: cleanEmail,
      roleInGroup: "member",
      status: "active",
      joinedAt: serverTimestamp()
    });

    await setDoc(doc(db, "users", user.uid, "memberships", groupId), {
      groupId,
      groupName,
      ownerId: groupOwnerUid,
      roleInGroup: "member",
      joinedAt: serverTimestamp(),
      isPrimary: true
    });

    return {
      uid: user.uid,
      groupId
    };
  } catch (err) {
    console.error("JOIN GROUP ERROR:", err);
    throw err;
  }
}

// PROFILE USER
export async function getUserProfile(uid) {
  try {
    if (!uid) {
      throw new Error("UID user tidak valid.");
    }

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return null;

    return {
      id: userSnap.id,
      ...userSnap.data()
    };
  } catch (err) {
    console.error("GET USER PROFILE ERROR:", err);
    throw err;
  }
}

// PRIMARY MEMBERSHIP
export async function getPrimaryMembership(uid) {
  try {
    if (!auth.currentUser) {
      throw new Error("Session login tidak tersedia.");
    }

    if (auth.currentUser.uid !== uid) {
      throw new Error("Akses membership ditolak.");
    }

    const membershipRef = collection(db, "users", uid, "memberships");
    const membershipSnap = await getDocs(membershipRef);

    if (membershipSnap.empty) return null;

    const memberships = membershipSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));

    const primary = memberships.find((item) => item.isPrimary);
    return primary || memberships[0];
  } catch (err) {
    console.error("GET PRIMARY MEMBERSHIP ERROR:", err);
    throw err;
  }
}

// BUAT GROUP TAMBAHAN
export async function createAdditionalGroup(ownerUid, ownerName, ownerEmail, groupName) {
  try {
    const cleanName = (groupName || "").trim();
    const cleanOwnerName = (ownerName || "").trim();
    const cleanOwnerEmail = (ownerEmail || "").trim().toLowerCase();

    if (!cleanName) throw new Error("Nama group wajib diisi.");

    const groupRef = await addDoc(collection(db, "groups"), {
      name: cleanName,
      type: "private",
      ownerUid,
      memberCount: 1,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "groups", groupRef.id, "members", ownerUid), {
      uid: ownerUid,
      userId: ownerUid,
      fullName: cleanOwnerName,
      email: cleanOwnerEmail,
      roleInGroup: "owner",
      status: "active",
      joinedAt: serverTimestamp()
    });

    await setDoc(doc(db, "users", ownerUid, "memberships", groupRef.id), {
      groupId: groupRef.id,
      groupName: cleanName,
      ownerId: ownerUid,
      roleInGroup: "owner",
      joinedAt: serverTimestamp(),
      isPrimary: false
    });

    return {
      groupId: groupRef.id,
      groupName: cleanName,
      ownerId: ownerUid
    };
  } catch (err) {
    console.error("CREATE GROUP ERROR:", err);
    throw err;
  }
}

// MEMBERSHIP USER
export async function getUserMemberships(uid) {
  try {
    if (!uid) {
      throw new Error("UID membership tidak valid.");
    }

    const membershipRef = collection(db, "users", uid, "memberships");
    const membershipSnap = await getDocs(membershipRef);

    if (membershipSnap.empty) return [];

    return membershipSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));
  } catch (err) {
    console.error("GET USER MEMBERSHIPS ERROR:", err);
    throw err;
  }
}

// LOGOUT
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    throw err;
  }
}

// FORGOT PASSWORD
export async function sendResetPassword(email) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail) {
      throw new Error("Email wajib diisi.");
    }

    await sendPasswordResetEmail(auth, cleanEmail);

    return {
      success: true,
      email: cleanEmail
    };
  } catch (err) {
    console.error("SEND RESET PASSWORD ERROR:", err);
    throw err;
  }
}

// CHANGE PASSWORD
export async function changeCurrentPassword(newPassword) {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("User belum login.");
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error("Password baru minimal 6 karakter.");
    }

    await updatePassword(user, newPassword);

    return {
      success: true
    };
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    throw err;
  }
}

// BUAT INVITE CODE
export async function createInviteCode(groupId, ownerUid, groupName) {
  try {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const inviteCode = `GRP-${randomPart}`;

    const inviteRef = await addDoc(collection(db, "groupInvites"), {
      inviteCode,
      groupId,
      groupName,
      ownerUid,
      status: "active",
      createdAt: serverTimestamp()
    });

    return {
      id: inviteRef.id,
      inviteCode
    };
  } catch (err) {
    console.error("CREATE INVITE CODE ERROR:", err);
    throw err;
  }
}

// GET GROUP MEMBERS
export async function getGroupMembers(groupId) {
  try {
    const membersRef = collection(db, "groups", groupId, "members");
    const membersSnap = await getDocs(membersRef);

    if (membersSnap.empty) return [];

    return membersSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));
  } catch (err) {
    console.error("GET GROUP MEMBERS ERROR:", err);
    throw err;
  }
}

// PENDING OWNERS
export async function getPendingOwners() {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "owner"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));
  } catch (err) {
    console.error("GET PENDING OWNERS ERROR:", err);
    throw err;
  }
}

export async function getApprovedOwners() {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "owner"),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));
  } catch (err) {
    console.error("GET APPROVED OWNERS ERROR:", err);
    throw err;
  }
}

export async function getRejectedOwners() {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "owner"),
      where("status", "==", "rejected")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return [];

    return snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data()
    }));
  } catch (err) {
    console.error("GET REJECTED OWNERS ERROR:", err);
    throw err;
  }
}

// APPROVE OWNER
export async function approveOwner(userId) {
  try {
    await updateDoc(doc(db, "users", userId), {
      status: "active"
    });

    return {
      success: true,
      userId
    };
  } catch (err) {
    console.error("APPROVE OWNER ERROR:", err);
    throw err;
  }
}

// REJECT OWNER
export async function rejectOwner(userId) {
  try {
    await updateDoc(doc(db, "users", userId), {
      status: "rejected"
    });

    return {
      success: true,
      userId
    };
  } catch (err) {
    console.error("REJECT OWNER ERROR:", err);
    throw err;
  }
}

// JOIN GROUP DENGAN USER YANG SUDAH LOGIN
export async function joinGroupWithCurrentUser(uid, fullName, email, inviteCode) {
  try {
    const cleanInviteCode = (inviteCode || "").trim().toUpperCase();
    const cleanFullName = (fullName || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!uid) throw new Error("User belum login.");
    if (!cleanFullName) throw new Error("Nama lengkap wajib diisi.");
    if (!cleanEmail) throw new Error("Email wajib diisi.");
    if (!cleanInviteCode) throw new Error("Kode invite wajib diisi.");

    const inviteQuery = query(
      collection(db, "groupInvites"),
      where("inviteCode", "==", cleanInviteCode),
      where("status", "==", "active")
    );

    const inviteSnapshot = await getDocs(inviteQuery);

    if (inviteSnapshot.empty) {
      throw new Error("Kode invite tidak valid.");
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const inviteData = inviteDoc.data();

    const groupId = inviteData.groupId;
    const groupName = inviteData.groupName || "Group";
    const groupOwnerUid = inviteData.ownerUid || null;

    const membershipRef = doc(db, "users", uid, "memberships", groupId);
    const membershipSnap = await getDoc(membershipRef);

    if (membershipSnap.exists()) {
      throw new Error("Anda sudah tergabung di group ini.");
    }

    await setDoc(membershipRef, {
      groupId,
      groupName,
      ownerId: groupOwnerUid,
      roleInGroup: "member",
      joinedAt: serverTimestamp(),
      isPrimary: false
    });

    await setDoc(doc(db, "groups", groupId, "members", uid), {
      uid,
      userId: uid,
      fullName: cleanFullName,
      email: cleanEmail,
      roleInGroup: "member",
      status: "active",
      joinedAt: serverTimestamp()
    });

    await updateDoc(doc(db, "groups", groupId), {
      memberCount: increment(1)
    });

    return {
      groupId,
      groupName,
      roleInGroup: "member",
      ownerId: groupOwnerUid
    };
  } catch (error) {
    console.error("JOIN GROUP ERROR:", error);
    throw error;
  }
}

export async function applyAsOwnerWithCurrentUser(uid, fullName, email, groupName) {
  try {
    const cleanUid = (uid || "").trim();
    const cleanFullName = (fullName || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanGroupName = (groupName || "").trim();

    if (!cleanUid) throw new Error("User belum login.");
    if (!cleanFullName) throw new Error("Nama lengkap wajib diisi.");
    if (!cleanEmail) throw new Error("Email wajib diisi.");
    if (!cleanGroupName) throw new Error("Nama group wajib diisi.");

    const userRef = doc(db, "users", cleanUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error("Profil user tidak ditemukan.");
    }

    const userData = userSnap.data() || {};
    const currentRole = (userData.role || "").toLowerCase();
    const currentStatus = (userData.status || "").toLowerCase();

    if (currentRole === "owner" && currentStatus === "active") {
      throw new Error("Akun ini sudah menjadi owner aktif.");
    }

    if (currentRole === "owner" && currentStatus === "pending") {
      throw new Error("Pengajuan owner untuk akun ini masih menunggu approval admin.");
    }

    const groupRef = await addDoc(collection(db, "groups"), {
      name: cleanGroupName,
      type: "private",
      ownerUid: cleanUid,
      memberCount: 1,
      createdAt: serverTimestamp()
    });

    await updateDoc(userRef, {
      fullName: cleanFullName,
      email: cleanEmail,
      role: "owner",
      status: "pending",
      ownerId: cleanUid
    });

    await setDoc(doc(db, "groups", groupRef.id, "members", cleanUid), {
      uid: cleanUid,
      userId: cleanUid,
      fullName: cleanFullName,
      email: cleanEmail,
      roleInGroup: "owner",
      status: "active",
      joinedAt: serverTimestamp()
    });

    await setDoc(doc(db, "users", cleanUid, "memberships", groupRef.id), {
      groupId: groupRef.id,
      groupName: cleanGroupName,
      ownerId: cleanUid,
      roleInGroup: "owner",
      joinedAt: serverTimestamp(),
      isPrimary: false
    });

    return {
      uid: cleanUid,
      groupId: groupRef.id,
      groupName: cleanGroupName,
      status: "pending"
    };
  } catch (err) {
    console.error("APPLY OWNER WITH CURRENT USER ERROR:", err);
    throw err;
  }
}

export async function getUserProfileByEmail(email) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return null;

    const q = query(
      collection(db, "users"),
      where("email", "==", cleanEmail)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docItem = snapshot.docs[0];

    return {
      id: docItem.id,
      ...docItem.data()
    };
  } catch (err) {
    console.error("GET USER PROFILE BY EMAIL ERROR:", err);
    throw err;
  }
}