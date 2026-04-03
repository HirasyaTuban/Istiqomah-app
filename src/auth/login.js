import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
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
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Register Owner
export async function registerOwner(fullName, email, password, groupName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await sendEmailVerification(user);

  await setDoc(doc(db, "users", user.uid), {
    fullName,
    email,
    status: "active",
    emailVerified: false,
    createdAt: serverTimestamp()
  });

  const groupRef = await addDoc(collection(db, "groups"), {
    name: groupName,
    type: "private",
    ownerUid: user.uid,
    memberCount: 1,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "groups", groupRef.id, "members", user.uid), {
    uid: user.uid,
    fullName,
    roleInGroup: "owner",
    status: "active",
    joinedAt: serverTimestamp()
  });

  await setDoc(doc(db, "users", user.uid, "memberships", groupRef.id), {
    groupId: groupRef.id,
    groupName,
    roleInGroup: "owner",
    joinedAt: serverTimestamp(),
    isPrimary: true
  });

  return {
    uid: user.uid,
    groupId: groupRef.id
  };
}

// Login
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// Join Group with invite code
export async function joinGroup(fullName, email, password, inviteCode) {
  const inviteQuery = query(
    collection(db, "groupInvites"),
    where("inviteCode", "==", inviteCode),
    where("status", "==", "active")
  );

  const inviteSnapshot = await getDocs(inviteQuery);

  if (inviteSnapshot.empty) {
    throw new Error("Kode invite tidak valid.");
  }

  const inviteDoc = inviteSnapshot.docs[0];
  const inviteData = inviteDoc.data();
  const groupId = inviteData.groupId;

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await sendEmailVerification(user);

  await setDoc(doc(db, "users", user.uid), {
    fullName,
    email,
    status: "active",
    emailVerified: false,
    createdAt: serverTimestamp()
  });

  const groupSnap = await getDoc(doc(db, "groups", groupId));
  const groupData = groupSnap.data();

  await setDoc(doc(db, "groups", groupId, "members", user.uid), {
    uid: user.uid,
    fullName,
    roleInGroup: "member",
    status: "active",
    joinedAt: serverTimestamp()
  });

  await setDoc(doc(db, "users", user.uid, "memberships", groupId), {
    groupId,
    groupName: groupData?.name || "Group",
    roleInGroup: "member",
    joinedAt: serverTimestamp(),
    isPrimary: true
  });

  return {
    uid: user.uid,
    groupId
  };
}

export async function logoutUser() {
  await signOut(auth);
}