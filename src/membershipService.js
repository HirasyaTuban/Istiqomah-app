import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Factory membership watcher service
 *
 * Cara pakai di index.html:
 * const membershipService = createMembershipService({...deps});
 * membershipService.watchUserMemberships(user);
 * membershipService.stopWatchingMemberships();
 */
export function createMembershipService(deps = {}) {
  const {
    getCurrentSession,
    resetCurrentSession,
    getSavedActiveGroup,
    getActiveGroupStorageKey,
    resolveActiveMembership,
    setActiveGroup,
    showLandingState,
    showToast
  } = deps;

  if (
    typeof getCurrentSession !== "function" ||
    typeof resetCurrentSession !== "function" ||
    typeof getSavedActiveGroup !== "function" ||
    typeof getActiveGroupStorageKey !== "function" ||
    typeof resolveActiveMembership !== "function" ||
    typeof setActiveGroup !== "function" ||
    typeof showLandingState !== "function" ||
    typeof showToast !== "function"
  ) {
    throw new Error("createMembershipService: dependency belum lengkap.");
  }

  let unsubscribeMembershipWatcher = null;

  function clearSavedActiveGroup(uid) {
    if (!uid) return;
    const storageKey = getActiveGroupStorageKey(uid);
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
  }

  async function handleMembershipSnapshot(user, membershipsRaw, options = {}) {
    const { showAutoFixToast = true } = options;

    try {
      if (!user?.uid) return;

      const savedGroupId = getSavedActiveGroup(user.uid);
      const currentSession = getCurrentSession();
      const currentGroupId = currentSession?.groupId || savedGroupId || null;

      const {
        membership: resolvedMembership,
        source
      } = resolveActiveMembership(membershipsRaw, currentGroupId);

      if (!resolvedMembership) {
        resetCurrentSession();
        clearSavedActiveGroup(user.uid);
        showLandingState();
        showToast("Membership komunitas sudah tidak tersedia.", "info");
        return;
      }

      const nextGroupId = resolvedMembership.groupId;
      const activeGroupId = currentSession?.groupId || null;

      if (!currentSession) {
        await setActiveGroup(user, nextGroupId, {
          silent: true,
          reason: "watcher-init"
        });
        return;
      }

      if (activeGroupId !== nextGroupId) {
        await setActiveGroup(user, nextGroupId, {
          silent: true,
          reason: "watcher-autofix"
        });

        console.info(
          `[MEMBERSHIP WATCHER] active group auto-fixed from "${activeGroupId}" to "${nextGroupId}" via "${source}"`
        );

        if (showAutoFixToast) {
          showToast("Komunitas aktif dipulihkan otomatis.", "info");
        }

        return;
      }

      await setActiveGroup(user, nextGroupId, {
        silent: true,
        reason: "watcher-refresh"
      });
    } catch (error) {
      console.error("HANDLE MEMBERSHIP SNAPSHOT ERROR:", error);
    }
  }

  function watchUserMemberships(user, options = {}) {
    const { showAutoFixToast = true } = options;

    if (!user?.uid) {
      console.warn("watchUserMemberships: user tidak valid.");
      return () => {};
    }

    if (typeof unsubscribeMembershipWatcher === "function") {
      unsubscribeMembershipWatcher();
      unsubscribeMembershipWatcher = null;
    }

    const membershipsRef = collection(db, "users", user.uid, "memberships");
    const membershipsQuery = query(membershipsRef);

    unsubscribeMembershipWatcher = onSnapshot(
      membershipsQuery,
      async (snapshot) => {
        const membershipsRaw = snapshot.docs.map((docSnap) => ({
          groupId: docSnap.id,
          ...docSnap.data()
        }));

        await handleMembershipSnapshot(user, membershipsRaw, {
          showAutoFixToast
        });
      },
      (error) => {
        console.error("WATCH USER MEMBERSHIPS ERROR:", error);
      }
    );

    return stopWatchingMemberships;
  }

  function stopWatchingMemberships() {
    if (typeof unsubscribeMembershipWatcher === "function") {
      unsubscribeMembershipWatcher();
      unsubscribeMembershipWatcher = null;
    }
  }

  return {
    watchUserMemberships,
    stopWatchingMemberships
  };
}