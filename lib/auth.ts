const TOKEN_KEY = "invomate.google.token";
const TOKEN_EXP_KEY = "invomate.google.tokenExp";
const PROFILE_KEY = "invomate.google.profile";

export type GoogleProfile = {
  email: string;
  name: string;
  picture?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function isGoogleConfigured(): boolean {
  return googleClientId().length > 0;
}

const LOCAL_PREVIEW_KEY = "invomate.localPreview";

export function isLocalPreviewChosen(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(LOCAL_PREVIEW_KEY) === "1";
}

export function setLocalPreviewChosen(on: boolean): void {
  if (typeof window === "undefined") return;
  if (on) sessionStorage.setItem(LOCAL_PREVIEW_KEY, "1");
  else sessionStorage.removeItem(LOCAL_PREVIEW_KEY);
}

export function loadStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) ?? 0);
  if (!token || Date.now() > exp - 30_000) return null;
  return token;
}

export function loadStoredProfile(): GoogleProfile | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleProfile;
  } catch {
    return null;
  }
}

export function persistToken(token: string, expiresIn: number): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
}

export function persistProfile(profile: GoogleProfile): void {
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearAuthStorage(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXP_KEY);
  sessionStorage.removeItem(PROFILE_KEY);
}

export function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("無法載入 Google 登入"));
    document.head.appendChild(script);
  });
}

export async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("無法讀取 Google 帳號");
  const data = (await res.json()) as { email: string; name: string; picture?: string };
  return { email: data.email, name: data.name, picture: data.picture };
}

export async function requestGoogleToken(prompt: "" | "consent" = ""): Promise<string> {
  await loadGisScript();
  const clientId = googleClientId();
  if (!clientId) throw new Error("尚未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "登入取消"));
          return;
        }
        persistToken(response.access_token, response.expires_in ?? 3600);
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function signOutGoogle(token: string | null): void {
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearAuthStorage();
}
