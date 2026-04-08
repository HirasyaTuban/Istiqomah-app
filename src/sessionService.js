import {
  getUserProfile,
  getUserMemberships
} from "./auth.js";

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

  async function restoreDashboardSession(user) {
  try {
    console.log("RESTORE DASHBOARD SESSION START:", {
      uid: user?.uid,
      email: user?.email
    });

    if (!user?.uid) {
      deps.showLandingState?.();
      return;
    }

    const uid = user.uid;
    const profile = await getUserProfile(uid);

    console.log("PROFILE RESULT:", profile);

    if (!profile) {
      throw new Error("Profil user tidak ditemukan di Firestore.");
    }

    const globalRole = (profile.role || "").toLowerCase();

    if (globalRole === "superadmin") {
      const adminSession = {
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
      };

      deps.setCurrentSession?.(adminSession);
      deps.showDashboard?.(adminSession);
      return;
    }

    const { activeMembership, allGroups } = await resolveActiveMembership(user);

    console.log("MEMBERSHIP RESULT:", {
      activeMembership,
      allGroups
    });

    if (!activeMembership) {
      const fallbackSession = {
        uid,
        fullName: profile.fullName || user.displayName || "User",
        email: profile.email || user.email || "",
        role: profile.role || "member",
        globalRole: profile.role || "member",
        activeGroupRole: null,
        ownerId: profile.ownerId || null,
        groupName: null,
        groupId: null,
        allGroups: allGroups || []
      };

      deps.setCurrentSession?.(fallbackSession);
      deps.showDashboard?.(fallbackSession);
      deps.showToast?.("Login berhasil, tapi membership/group belum ditemukan.", "warning");
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

    console.log("NEXT SESSION:", nextSession);

    deps.setCurrentSession?.(nextSession);
    deps.showDashboard?.(nextSession);

    if (typeof deps.onAfterSetActiveGroup === "function") {
      await deps.onAfterSetActiveGroup({
        session: nextSession,
        reason: "restore-session"
      });
    }
  } catch (error) {
    console.error("RESTORE DASHBOARD SESSION ERROR FULL:", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      raw: error
    });

    deps.showToast?.(error.message || "Gagal memulihkan dashboard.", "error");
    deps.showLandingState?.();
  } finally {
    deps.bootLoading?.classList.add("hidden");
  }
}

  async function setActiveGroup(user, groupId, options = {}) {
    const {
      silent = false,
      reason = "manual"
    } = options;

    if (!user?.uid) {
      throw new Error("User tidak valid.");
    }

    if (!groupId) {
      throw new Error("groupId tidak valid.");
    }

    const membershipsRaw = await getUserMemberships(user.uid);

    if (!Array.isArray(membershipsRaw) || membershipsRaw.length === 0) {
      clearCurrentSession();
      syncSavedActiveGroup(user.uid, null);
      showLandingState();
      throw new Error("Membership user tidak ditemukan.");
    }

    const normalizedMemberships = membershipsRaw
      .map(normalizeMembership)
      .filter(
        (m) => m && m.groupId && (m.status ? m.status === "active" : true)
      );

    const selectedMembership = normalizedMemberships.find(
      (m) => m.groupId === groupId
    );

    if (!selectedMembership) {
      throw new Error("Group tidak valid atau membership tidak ditemukan.");
    }

    syncSavedActiveGroup(user.uid, selectedMembership.groupId);

    let currentSession = getCurrentSession();
    let nextSession = null;

    if (!currentSession || currentSession.uid !== user.uid) {
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        throw new Error("Profil user tidak ditemukan.");
      }

      nextSession = buildDashboardSession(
        user,
        profile,
        selectedMembership,
        normalizedMemberships
      );
    } else {
      nextSession = {
        ...currentSession,
        activeGroupRole: selectedMembership.roleInGroup || "member",
        ownerId: selectedMembership.ownerId || null,
        groupName: selectedMembership.groupName || "-",
        groupId: selectedMembership.groupId || null,
        allGroups: normalizedMemberships
      };
    }

    setCurrentSession(nextSession);
    renderDashboardSession(nextSession);

    if (typeof onAfterSetActiveGroup === "function") {
      await onAfterSetActiveGroup({
        session: nextSession,
        membership: selectedMembership,
        source: "direct",
        reason
      });
    }

    if (!silent) {
      showToast(`Komunitas aktif: ${selectedMembership.groupName}`, "success");
    }

    return nextSession;
  }

  return {
    resolveActiveMembership,
    restoreDashboardSession,
    setActiveGroup,
    syncSavedActiveGroup,
    clearCurrentSession
  };
}