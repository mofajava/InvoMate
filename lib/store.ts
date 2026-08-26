"use client";

import { create } from "zustand";
import type { GoogleProfile } from "./auth";
import {
  fetchProfile,
  isOfflineDev,
  loadStoredProfile,
  loadStoredToken,
  persistProfile,
  requestGoogleToken,
  signOutGoogle,
  tokenHasDriveScope,
} from "./auth";
import { loadOrCreateLedger, saveLedger, type LedgerHandle } from "./drive";
import { createEmptyLedger } from "./seed";
import { assertNonNegativeStock } from "./stock";
import type { Ledger, SaveStatus } from "./types";

type LedgerStore = {
  ready: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
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
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Ledger | null = null;

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
    await saveLedger(token, handle, ledger);
    pending = null;
    set({ saveStatus: "saved", lastSavedAt: new Date().toISOString() });
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
    const token = loadStoredToken();
    const profile = loadStoredProfile();
    if (!token) {
      set({ ready: true, token: null, profile, offline: false });
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
    } catch {
      signOutGoogle(null);
      set({ ready: true, token: null, profile: null, saveStatus: "idle", offline: false });
    }
  },

  signIn: async () => {
    set({ saveStatus: "loading", saveError: null });
    const token = await requestGoogleToken("consent");
    if (!(await tokenHasDriveScope(token))) {
      throw new Error("授權裡沒有雲端硬碟權限。請在 Google 視窗勾選 Drive，或到 Google 帳號安全性移除這項應用後再登入一次。");
    }
    const profile = await fetchProfile(token);
    persistProfile(profile);
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
  },

  signOut: () => {
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
}));
