const TOKEN_KEY = "invomate.google.token";
const TOKEN_EXP_KEY = "invomate.google.tokenExp";
const PROFILE_KEY = "invomate.google.profile";
const GRANTED_KEY = "invomate.google.granted";

export type GoogleProfile = {
  email: string;
  name: string;
  picture?: string;
};

type TokenPrompt = "" | "consent" | "none";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            include_granted_scopes?: boolean;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              scope?: string;
            }) => void;
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

/** `npm run dev` 略過 Google，不寫雲端。正式站與 `next start` 仍要授權。 */
export function isOfflineDev(): boolean {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_GOOGLE !== "1";
}

function readKey(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

function writeKey(key: string, value: string): void {
  localStorage.setItem(key, value);
  sessionStorage.removeItem(key);
}

function removeKey(key: string): void {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function hasGrantedDrive(): boolean {
  return readKey(GRANTED_KEY) === "1";
}

export function markDriveGranted(): void {
  writeKey(GRANTED_KEY, "1");
}

export function loadTokenExpiry(): number {
  return Number(readKey(TOKEN_EXP_KEY) ?? 0);
}

export function loadStoredToken(): string | null {
  const token = readKey(TOKEN_KEY);
  const exp = loadTokenExpiry();
  if (!token || Date.now() > exp - 30_000) return null;
  if (!localStorage.getItem(TOKEN_KEY)) {
    persistToken(token, Math.max(1, Math.round((exp - Date.now()) / 1000)));
  }
  return token;
}

export function loadStoredProfile(): GoogleProfile | null {
  const raw = readKey(PROFILE_KEY);
  if (!raw) return null;
  try {
    const profile = JSON.parse(raw) as GoogleProfile;
    if (!localStorage.getItem(PROFILE_KEY)) persistProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export function persistToken(token: string, expiresIn: number): void {
  writeKey(TOKEN_KEY, token);
  writeKey(TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000));
}

export function persistProfile(profile: GoogleProfile): void {
  writeKey(PROFILE_KEY, JSON.stringify(profile));
}

export function clearAuthStorage(): void {
  removeKey(TOKEN_KEY);
  removeKey(TOKEN_EXP_KEY);
  removeKey(PROFILE_KEY);
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

export async function tokenHasDriveScope(accessToken: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) return false;
  const data = (await res.json()) as { scope?: string };
  const scopes = (data.scope ?? "").split(/\s+/);
  return scopes.some((scope) => scope.includes("drive.file") || scope.endsWith("/auth/drive"));
}

export async function requestGoogleToken(prompt: TokenPrompt = ""): Promise<string> {
  await loadGisScript();
  const clientId = googleClientId();
  if (!clientId) throw new Error("尚未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPES,
      include_granted_scopes: true,
      callback: (response) => {
        if (response.error || !response.access_token) {
          const denied = response.error === "access_denied";
          reject(
            new Error(
              denied
                ? "你拒絕了授權，無法使用雲端硬碟"
                : response.error || "登入取消",
            ),
          );
          return;
        }
        if (response.scope && !response.scope.includes("drive.file")) {
          reject(new Error("授權裡沒有雲端硬碟權限。請在 Google 視窗允許 Drive，或到 Google 帳號安全性移除這項應用後再登入一次。"));
          return;
        }
        persistToken(response.access_token, response.expires_in ?? 3600);
        resolve(response.access_token);
      },
    });
    client.requestAccessToken({ prompt });
  });
}

export async function trySilentGoogleToken(): Promise<string | null> {
  try {
    return await Promise.race([
      requestGoogleToken("none"),
      new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("silent-timeout")), 6000);
      }),
    ]);
  } catch {
    return null;
  }
}

export function signOutGoogle(token: string | null): void {
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearAuthStorage();
  removeKey(GRANTED_KEY);
}
