"use client";

import { create } from "zustand";
import type { GoogleProfile } from "./auth";
import {
  fetchProfile,
  loadStoredProfile,
  loadStoredToken,
  persistProfile,
  requestGoogleToken,
  signOutGoogle,
  tokenHasDriveScope,
} from "./auth";
import { loadOrCreateLedger, saveLedger, type LedgerHandle } from "./drive";
import type { Ledger, SaveStatus } from "./types";
import { createEmptyLedger } from "./seed";

type LedgerStore = {
  ready: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;
  token: string | null;
  profile: GoogleProfile | null;
  handle: LedgerHandle | null;
  ledger: Ledger;
  signIn: () => Promise<void>;
  signOut: () => void;
  bootstrap: () => Promise<void>;
  updateLedger: (updater: (current: Ledger) => Ledger) => void;
  replaceLedger: (ledger: Ledger) => void;
  saveNow: () => Promise<void>;
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Ledger | null = null;

async function flushSave(get: () => LedgerStore, set: (partial: Partial<LedgerStore>) => void) {
  const { token, handle } = get();
  const ledger = pending ?? get().ledger;
  if (!handle) return;
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

  bootstrap: async () => {
    const token = loadStoredToken();
    const profile = loadStoredProfile();
    if (!token) {
      set({ ready: true, token: null, profile });
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
      });
    } catch {
      signOutGoogle(null);
      set({ ready: true, token: null, profile: null, saveStatus: "idle" });
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
    });
  },

  updateLedger: (updater) => {
    const next = updater(get().ledger);
    pending = next;
    set({ ledger: next, saveStatus: "saving" });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void flushSave(get, set);
    }, 800);
  },

  replaceLedger: (ledger) => {
    get().updateLedger(() => ledger);
  },

  saveNow: async () => {
    if (saveTimer) clearTimeout(saveTimer);
    await flushSave(get, set);
  },
}));
