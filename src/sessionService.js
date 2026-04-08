import {
  getUserProfile,
  getUserMemberships
} from "./auth.js";

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./firebase.js";
import { getUserProfile, getUserMemberships, getPrimaryMembership } from "./auth.js";

/**
 * Factory session service untuk Istiqomah App
 *
 * Cara pakai di index.html:
 * const sessionService = createSessionService({...deps});
 * await sessionService.restoreDashboardSession(user);
 * await sessionService.setActiveGroup(user, groupId);
 */
export function createSessionService(deps = {}) {
  const {
    getCurrentSession,
    setCurrentSession,
    resetCurrentSession,
    getSavedActiveGroup,
    getActiveGroupStorageKey,
    showDashboard,
    showLandingState,
    showToast,
    bootLoading,
    onAfterSetActiveGroup
  } = deps;

  if (
    typeof getCurrentSession !== "function" ||
    typeof setCurrentSession !== "function" ||
    typeof resetCurrentSession !== "function" ||
    typeof getSavedActiveGroup !== "function" ||
    typeof getActiveGroupStorageKey !== "function" ||
    typeof showDashboard !== "function" ||
    typeof showLandingState !== "function" ||
    typeof showToast !== "function"
  ) {
    throw new Error("createSessionService: dependency belum lengkap.");
  }

  let isRestoringSession = false;

  function syncSavedActiveGroup(uid, groupId) {
    if (!uid) return;

    const storageKey = getActiveGroupStorageKey(uid);
    if (!storageKey) return;

    if (groupId) {
      localStorage.setItem(storageKey, groupId);
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  function clearCurrentSession() {
    resetCurrentSession();
  }

  function normalizeMembership(membership) {
    if (!membership) return null;

    return {
      ...membership,
      groupId: membership.groupId || null,
      groupName: membership.groupName || "-",
      roleInGroup: membership.roleInGroup || membership.role || "member",
      ownerId: membership.ownerId || null,
      isPrimary: Boolean(membership.isPrimary),
      status: membership.status || "active"
    };
  }

  function resolveActiveMembership(memberships = [], savedGroupId = null) {
    const validMemberships = (memberships || [])
      .map(normalizeMembership)
      .filter(
        (m) =>
          m &&
          m.groupId &&
          (m.status ? m.status === "active" : true)
      );

    if (!validMemberships.length) {
      return {
        membership: null,
        source: "none",
        memberships: []
      };
    }

    const savedMatch = savedGroupId
      ? validMemberships.find((m) => m.groupId === savedGroupId)
      : null;

    if (savedMatch) {
      return {
        membership: savedMatch,
        source: "saved",
        memberships: validMemberships
      };
    }

    const primaryMatch = validMemberships.find((m) => m.isPrimary);

    if (primaryMatch) {
      return {
        membership: primaryMatch,
        source: "primary",
        memberships: validMemberships
      };
    }

    return {
      membership: validMemberships[0],
      source: "first",
      memberships: validMemberships
    };
  }

  function buildDashboardSession(user, profile, selectedMembership, memberships) {
    const safeMembership = normalizeMembership(selectedMembership);

    return {
      uid: user.uid,
      fullName: profile?.fullName || user?.displayName || "-",
      email: profile?.email || user?.email || "-",
      role: profile?.role || "member",
      globalRole: profile?.role || "member",
      activeGroupRole: safeMembership?.roleInGroup || "member",
      ownerId: safeMembership?.ownerId || null,
      groupName: safeMembership?.groupName || "-",
      groupId: safeMembership?.groupId || null,
      allGroups: (memberships || []).map(normalizeMembership).filter(Boolean)
    };
  }

  function renderDashboardSession(session) {
    if (!session) return;

    showDashboard({
      uid: session.uid,
      fullName: session.fullName,
      email: session.email,
      role: session.role,
      globalRole: session.globalRole,
      activeGroupRole: session.activeGroupRole,
      ownerId: session.ownerId,
      groupName: session.groupName,
      groupId: session.groupId,
      allGroups: session.allGroups
    });
  }

async function filterValidMemberships(memberships = []) {
  const checked = await Promise.all(
    memberships.map(async (item) => {
      const groupId = item?.groupId || "";
      if (!groupId) return null;

      try {
        const snap = await getDoc(doc(db, "groups", groupId));
        if (!snap.exists()) return null;

        return {
          ...item,
          roleInGroup: (item.roleInGroup || "member").toLowerCase()
        };
      } catch (error) {
        console.error("VALIDATE GROUP ERROR:", groupId, error);
        return null;
      }
    })
  );

  return checked.filter(Boolean);
}

async function resolveActiveMembership(user) {
  const uid = user?.uid;
  if (!uid) return null;

  const savedGroupId = deps.getSavedActiveGroup(uid);

  const memberships = await getUserMemberships(uid);
  const validMemberships = await filterValidMemberships(memberships);

  if (!validMemberships.length) {
    return {
      activeMembership: null,
      allGroups: []
    };
  }

  let activeMembership = null;

  if (savedGroupId) {
    activeMembership = validMemberships.find(
      (item) => item.groupId === savedGroupId
    ) || null;
  }

  if (!activeMembership) {
    activeMembership =
      validMemberships.find((item) => item.isPrimary) ||
      validMemberships[0];
  }

  return {
    activeMembership,
    allGroups: validMemberships.map((item) => ({
      groupId: item.groupId,
      groupName: item.groupName || "Group",
      ownerId: item.ownerId || null,
      roleInGroup: (item.roleInGroup || "member").toLowerCase(),
      isPrimary: !!item.isPrimary
    }))
  };
}

async function restoreDashboardSession(user) {
  try {
    if (!user?.uid) {
      deps.showLandingState?.();
      return;
    }

    const uid = user.uid;
    const profile = await getUserProfile(uid);

    if (!profile) {
      throw new Error("Profil user tidak ditemukan.");
    }

    const globalRole = (profile.role || "").toLowerCase();

    if (globalRole === "superadmin") {
      deps.showDashboard?.({
        uid,
        fullName: profile.fullName || user.displayName || "User",
        email: profile.email || user.email || "",
        role: profile.role || "superadmin",
        globalRole: profile.role || "superadmin",
        activeGroupRole: null,
        ownerId: profile.ownerId || uid,
        groupName: null,
        groupId: null,
        allGroups: []
      });

      return;
    }

    const { activeMembership, allGroups } = await resolveActiveMembership(user);

    if (!activeMembership) {
      deps.showDashboard?.({
        uid,
        fullName: profile.fullName || user.displayName || "User",
        email: profile.email || user.email || "",
        role: profile.role || "member",
        globalRole: profile.role || "member",
        activeGroupRole: null,
        ownerId: profile.ownerId || null,
        groupName: null,
        groupId: null,
        allGroups: []
      });

      deps.showToast?.("Belum ada group aktif yang valid.", "warning");
      return;
    }

    localStorage.setItem(
      deps.getActiveGroupStorageKey(uid),
      activeMembership.groupId
    );

    const nextSession = {
      uid,
      fullName: profile.fullName || user.displayName || "User",
      email: profile.email || user.email || "",
      role: profile.role || activeMembership.roleInGroup || "member",
      globalRole: profile.role || "member",
      activeGroupRole: activeMembership.roleInGroup || "member",
      ownerId: activeMembership.ownerId || profile.ownerId || null,
      groupName: activeMembership.groupName || "Group",
      groupId: activeMembership.groupId,
      allGroups
    };

    deps.setCurrentSession?.(nextSession);
    deps.showDashboard?.(nextSession);

    if (typeof deps.onAfterSetActiveGroup === "function") {
      await deps.onAfterSetActiveGroup({ session: nextSession, reason: "restore-session" });
    }
  } catch (error) {
    console.error("RESTORE DASHBOARD SESSION ERROR:", error);
    deps.showToast?.(error.message || "Gagal memulihkan dashboard.", "error");
    deps.showLandingState?.();
  } finally {
    deps.bootLoading?.classList.add("hidden");
  }
}

async function setActiveGroup(user, groupId, options = {}) {
  const uid = user?.uid;
  if (!uid || !groupId) {
    throw new Error("User atau groupId tidak valid.");
  }

  const profile = await getUserProfile(uid);
  const { allGroups } = await resolveActiveMembership(user);

  const picked = allGroups.find((item) => item.groupId === groupId);
  if (!picked) {
    throw new Error("Group tidak ditemukan atau sudah tidak valid.");
  }

  localStorage.setItem(deps.getActiveGroupStorageKey(uid), picked.groupId);

  const nextSession = {
    ...deps.getCurrentSession(),
    uid,
    fullName: profile?.fullName || user.displayName || "User",
    email: profile?.email || user.email || "",
    role: profile?.role || picked.roleInGroup || "member",
    globalRole: profile?.role || "member",
    activeGroupRole: picked.roleInGroup || "member",
    ownerId: picked.ownerId || null,
    groupName: picked.groupName || "Group",
    groupId: picked.groupId,
    allGroups
  };

  deps.setCurrentSession?.(nextSession);
  deps.showDashboard?.(nextSession);

  if (typeof deps.onAfterSetActiveGroup === "function") {
    await deps.onAfterSetActiveGroup({
      session: nextSession,
      reason: options.reason || "manual-switch"
    });
  }
}

  return {
    resolveActiveMembership,
    restoreDashboardSession,
    setActiveGroup,
    syncSavedActiveGroup,
    clearCurrentSession
  };
}