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

export async function tokenHasDriveScope(accessToken: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) return false;
  const data = (await res.json()) as { scope?: string };
  const scopes = (data.scope ?? "").split(/\s+/);
  return scopes.some((scope) => scope.includes("drive.file") || scope.endsWith("/auth/drive"));
}

export async function requestGoogleToken(prompt: "" | "consent" = "consent"): Promise<string> {
  await loadGisScript();
  const clientId = googleClientId();
  if (!clientId) throw new Error("尚未設定 NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  // 只清本機，不要 revoke：撤銷會把同一個 OAuth 用戶端剛發出的新 token 一起作廢。
  clearAuthStorage();
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPES,
      include_granted_scopes: false,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error === "access_denied" ? "你拒絕了授權，無法使用雲端硬碟" : response.error || "登入取消"));
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

export function signOutGoogle(token: string | null): void {
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined);
  }
  clearAuthStorage();
}
