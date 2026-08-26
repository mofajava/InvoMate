"use client";

import { create } from "zustand";
import type { GoogleProfile } from "./auth";
import {
  fetchProfile,
  hasGrantedDrive,
  isOfflineDev,
  loadStoredProfile,
  loadStoredToken,
  loadTokenExpiry,
  markDriveGranted,
  persistProfile,
  requestGoogleToken,
  signOutGoogle,
  tokenHasDriveScope,
  trySilentGoogleToken,
  clearAuthStorage,
} from "./auth";
import {
  downloadJson,
  getFileRevision,
  isCloudNewer,
  loadOrCreateLedger,
  saveLedger,
  withRevision,
  type LedgerHandle,
} from "./drive";
import { createEmptyLedger } from "./seed";
import { assertNonNegativeStock } from "./stock";
import type { Ledger, SaveStatus } from "./types";

type LedgerStore = {
  ready: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  syncNotice: string | null;
  lastSavedAt: string | null;
  token: string | null;
  profile: GoogleProfile | null;
  handle: LedgerHandle | null;
  ledger: Ledger;
  offline: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  bootstrap: () => Promise<void>;
  updateLedger: (updater: (current: Ledger) => Ledger) => boolean;
  replaceLedger: (ledger: Ledger) => void;
  saveNow: () => Promise<void>;
  dismissSyncNotice: () => void;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Ledger | null = null;

function clearRefreshTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

function armTokenRefresh(
  get: () => LedgerStore,
  set: (partial: Partial<LedgerStore>) => void,
) {
  clearRefreshTimer();
  const exp = loadTokenExpiry();
  if (!exp || get().offline) return;
  const delay = Math.min(Math.max(exp - Date.now() - 90_000, 15_000), 50 * 60 * 1000);
  refreshTimer = setTimeout(() => {
    void (async () => {
      try {
        const token = await trySilentGoogleToken();
        if (!token || !(await tokenHasDriveScope(token))) return;
        set({ token });
        armTokenRefresh(get, set);
      } catch {
        /* 目前 token 還能用就先留著 */
      }
    })();
  }, delay);
}

async function flushSave(get: () => LedgerStore, set: (partial: Partial<LedgerStore>) => void) {
  const { token, handle, offline } = get();
  const ledger = pending ?? get().ledger;
  if (!handle) return;
  if (offline || !token || handle.fileId === "local") {
    pending = null;
    set({ saveStatus: "saved", lastSavedAt: new Date().toISOString(), saveError: null });
    await saveLedger(null, handle, ledger);
    return;
  }
  set({ saveStatus: "saving", saveError: null });
  try {
    const remote = await getFileRevision(token, handle.fileId);
    if (isCloudNewer(remote, handle)) {
      const cloudLedger = await downloadJson(token, handle.fileId);
      const loadedRev = await getFileRevision(token, handle.fileId);
      pending = null;
      set({
        ledger: cloudLedger,
        handle: withRevision(handle, loadedRev),
        saveStatus: "saved",
        lastSavedAt: cloudLedger.updatedAt,
        saveError: null,
        syncNotice: "雲端硬碟有較新的帳本，已重新載入。剛才還沒寫上雲端的變更已取消，請再輸入一次。",
      });
      return;
    }
    const revision = await saveLedger(token, handle, ledger);
    pending = null;
    set({
      handle: revision ? withRevision(handle, revision) : handle,
      saveStatus: "saved",
      lastSavedAt: new Date().toISOString(),
      saveError: null,
      syncNotice: null,
    });
  } catch (error) {
    set({
      saveStatus: "error",
      saveError: error instanceof Error ? error.message : "儲存失敗",
    });
  }
}

export const useLedger = create<LedgerStore>((set, get) => ({
  ready: false,
  saveStatus: "idle",
  saveError: null,
  syncNotice: null,
  lastSavedAt: null,
  token: null,
  profile: null,
  handle: null,
  ledger: createEmptyLedger(),
  offline: false,

  bootstrap: async () => {
    if (isOfflineDev()) {
      const loaded = await loadOrCreateLedger(null);
      set({
        ready: true,
        offline: true,
        token: null,
        profile: { email: "本機開發", name: "本機開發" },
        handle: loaded.handle,
        ledger: loaded.ledger,
        saveStatus: "saved",
        lastSavedAt: loaded.ledger.updatedAt,
      });
      return;
    }
    const profile = loadStoredProfile();
    let token = loadStoredToken();
    if (!token && hasGrantedDrive()) {
      set({ saveStatus: "loading" });
      token = await trySilentGoogleToken();
      if (token && !(await tokenHasDriveScope(token))) token = null;
      if (token) {
        try {
          const nextProfile = profile ?? (await fetchProfile(token));
          persistProfile(nextProfile);
          markDriveGranted();
          const loaded = await loadOrCreateLedger(token);
          set({
            ready: true,
            token,
            profile: nextProfile,
            handle: loaded.handle,
            ledger: loaded.ledger,
            saveStatus: "saved",
            lastSavedAt: loaded.ledger.updatedAt,
            offline: false,
          });
          armTokenRefresh(get, set);
          return;
        } catch {
          token = null;
        }
      }
    }
    if (!token) {
      set({ ready: true, token: null, profile, offline: false, saveStatus: "idle" });
      return;
    }
    set({ saveStatus: "loading" });
    try {
      const loaded = await loadOrCreateLedger(token);
      set({
        ready: true,
        token,
        profile,
        handle: loaded.handle,
        ledger: loaded.ledger,
        saveStatus: "saved",
        lastSavedAt: loaded.ledger.updatedAt,
        offline: false,
      });
      armTokenRefresh(get, set);
    } catch {
      clearAuthStorage();
      set({ ready: true, token: null, profile: null, saveStatus: "idle", offline: false });
    }
  },

  signIn: async () => {
    set({ saveStatus: "loading", saveError: null });
    try {
      let token = await requestGoogleToken(hasGrantedDrive() ? "" : "consent");
      if (!(await tokenHasDriveScope(token))) {
        token = await requestGoogleToken("consent");
        if (!(await tokenHasDriveScope(token))) {
          throw new Error("授權裡沒有雲端硬碟權限。請在 Google 視窗勾選 Drive，或到 Google 帳號安全性移除這項應用後再登入一次。");
        }
      }
      const profile = await fetchProfile(token);
      persistProfile(profile);
      markDriveGranted();
      const loaded = await loadOrCreateLedger(token);
      set({
        ready: true,
        token,
        profile,
        handle: loaded.handle,
        ledger: loaded.ledger,
        saveStatus: "saved",
        lastSavedAt: loaded.ledger.updatedAt,
        offline: false,
      });
      armTokenRefresh(get, set);
    } catch (error) {
      set({ saveStatus: "idle" });
      throw error;
    }
  },

  signOut: () => {
    clearRefreshTimer();
    signOutGoogle(get().token);
    if (saveTimer) clearTimeout(saveTimer);
    pending = null;
    set({
      token: null,
      profile: null,
      handle: null,
      ledger: createEmptyLedger(),
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,
      syncNotice: null,
      offline: false,
    });
  },

  updateLedger: (updater) => {
    let next: Ledger;
    try {
      next = updater(get().ledger);
      assertNonNegativeStock(next);
    } catch (error) {
      set({
        saveError: error instanceof Error ? error.message : "庫存不足",
      });
      return false;
    }
    pending = next;
    set({ ledger: next, saveStatus: "saving", saveError: null });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void flushSave(get, set);
    }, 800);
    return true;
  },

  replaceLedger: (ledger) => {
    get().updateLedger(() => ledger);
  },

  saveNow: async () => {
    if (saveTimer) clearTimeout(saveTimer);
    await flushSave(get, set);
  },

  dismissSyncNotice: () => set({ syncNotice: null }),
}));
