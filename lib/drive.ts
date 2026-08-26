import type { Ledger } from "./types";
import { parseLedger } from "./schema";
import { createEmptyLedger } from "./seed";

const FOLDER_NAME = "InvoMate";
const FILE_NAME = "invomate-ledger.json";
const EXPORT_FOLDER = "exports";
const LOCAL_KEY = "invomate.local.ledger";

const DRIVE = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

async function driveFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error("Google 登入已失效。請再按一次「使用 Google 授權雲端硬碟」。");
    }
    if (res.status === 403 && text.includes("insufficient")) {
      throw new Error("雲端硬碟權限不足。請再按一次「使用 Google 授權雲端硬碟」，並在視窗中允許存取 Drive。");
    }
    throw new Error(`Drive API ${res.status}: ${text}`);
  }
  return res;
}

async function findFolder(token: string, name: string, parentId?: string): Promise<string | null> {
  const parents = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parents}`;
  const res = await driveFetch(
    token,
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
  );
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

async function createFolder(token: string, name: string, parentId?: string): Promise<string> {
  const res = await driveFetch(token, `${DRIVE}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    }),
  });
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function ensureFolder(token: string, name: string, parentId?: string): Promise<string> {
  return (await findFolder(token, name, parentId)) ?? createFolder(token, name, parentId);
}

export type DriveRevision = {
  modifiedTime: string;
  version: string;
};

export type LedgerHandle = {
  fileId: string | "local";
  folderId: string | "local";
  modifiedTime?: string;
  version?: string;
};

function parseRevision(data: { modifiedTime?: string; version?: string }): DriveRevision {
  return {
    modifiedTime: data.modifiedTime ?? "",
    version: data.version ?? "",
  };
}

export function withRevision(handle: LedgerHandle, revision: DriveRevision): LedgerHandle {
  return {
    ...handle,
    modifiedTime: revision.modifiedTime,
    version: revision.version,
  };
}

export function isCloudNewer(
  cloud: DriveRevision,
  known: Pick<LedgerHandle, "modifiedTime" | "version">,
): boolean {
  const cloudVer = Number(cloud.version);
  const knownVer = Number(known.version);
  if (cloud.version && known.version && Number.isFinite(cloudVer) && Number.isFinite(knownVer)) {
    return cloudVer > knownVer;
  }
  const cloudTime = cloud.modifiedTime ? Date.parse(cloud.modifiedTime) : Number.NaN;
  const knownTime = known.modifiedTime ? Date.parse(known.modifiedTime) : Number.NaN;
  if (Number.isFinite(cloudTime) && Number.isFinite(knownTime)) {
    return cloudTime > knownTime;
  }
  return false;
}

async function findFile(
  token: string,
  name: string,
  parentId: string,
): Promise<({ id: string } & Partial<DriveRevision>) | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
  const res = await driveFetch(
    token,
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,version)`,
  );
  const data = (await res.json()) as {
    files: ({ id: string } & Partial<DriveRevision>)[];
  };
  return data.files[0] ?? null;
}

export async function getFileRevision(token: string, fileId: string): Promise<DriveRevision> {
  const res = await driveFetch(
    token,
    `${DRIVE}/files/${fileId}?fields=modifiedTime,version`,
  );
  return parseRevision((await res.json()) as { modifiedTime?: string; version?: string });
}

const FILE_FIELDS = "id,modifiedTime,version";

async function createJsonFile(
  token: string,
  parentId: string,
  content: Ledger,
): Promise<{ id: string } & DriveRevision> {
  const metadata = {
    name: FILE_NAME,
    parents: [parentId],
    mimeType: "application/json",
  };
  const body = new Blob(
    [
      `--invomate\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--invomate\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(content)}\r\n`,
      `--invomate--`,
    ],
    { type: "multipart/related; boundary=invomate" },
  );
  const res = await driveFetch(
    token,
    `${UPLOAD}/files?uploadType=multipart&fields=${FILE_FIELDS}`,
    { method: "POST", body },
  );
  const data = (await res.json()) as { id: string; modifiedTime?: string; version?: string };
  return { id: data.id, ...parseRevision(data) };
}

async function updateJsonFile(token: string, fileId: string, content: Ledger): Promise<DriveRevision> {
  const res = await driveFetch(
    token,
    `${UPLOAD}/files/${fileId}?uploadType=media&fields=${FILE_FIELDS}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    },
  );
  const data = (await res.json()) as { modifiedTime?: string; version?: string };
  if (data.modifiedTime && data.version) return parseRevision(data);
  return getFileRevision(token, fileId);
}

export async function downloadJson(token: string, fileId: string): Promise<Ledger> {
  const res = await driveFetch(token, `${DRIVE}/files/${fileId}?alt=media`);
  const data = await res.json();
  return parseLedger(data);
}

export async function loadOrCreateLedger(token: string | null): Promise<{
  ledger: Ledger;
  handle: LedgerHandle;
}> {
  if (!token) {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      return { ledger: parseLedger(JSON.parse(raw)), handle: { fileId: "local", folderId: "local" } };
    }
    const ledger = createEmptyLedger();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ledger));
    return { ledger, handle: { fileId: "local", folderId: "local" } };
  }

  const folderId = await ensureFolder(token, FOLDER_NAME);
  const existing = await findFile(token, FILE_NAME, folderId);
  if (!existing) {
    const ledger = createEmptyLedger();
    const created = await createJsonFile(token, folderId, ledger);
    return {
      ledger,
      handle: { fileId: created.id, folderId, modifiedTime: created.modifiedTime, version: created.version },
    };
  }
  const revision =
    existing.modifiedTime && existing.version
      ? parseRevision(existing)
      : await getFileRevision(token, existing.id);
  const ledger = await downloadJson(token, existing.id);
  return {
    ledger,
    handle: { fileId: existing.id, folderId, ...revision },
  };
}

export async function saveLedger(
  token: string | null,
  handle: LedgerHandle,
  ledger: Ledger,
): Promise<DriveRevision | null> {
  const next = { ...ledger, updatedAt: new Date().toISOString() };
  if (!token || handle.fileId === "local") {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    return null;
  }
  return updateJsonFile(token, handle.fileId, next);
}

export async function uploadExportFile(
  token: string,
  folderId: string,
  filename: string,
  blob: Blob,
  mimeType: string,
): Promise<{ id: string; webViewLink?: string }> {
  const exportFolderId =
    folderId === "local" ? "local" : await ensureFolder(token, EXPORT_FOLDER, folderId);
  if (exportFolderId === "local") {
    return { id: "local" };
  }
  const metadata = { name: filename, parents: [exportFolderId] };
  const metaBlob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
  const form = new FormData();
  form.append("metadata", metaBlob);
  form.append("file", blob, filename);
  // Drive multipart via fetch FormData is not the uploadType=multipart JSON format.
  // Use resumable/simple upload with metadata first.
  const created = await driveFetch(token, `${DRIVE}/files?fields=id,webViewLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, mimeType }),
  });
  const file = (await created.json()) as { id: string; webViewLink?: string };
  await driveFetch(token, `${UPLOAD}/files/${file.id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": mimeType },
    body: blob,
  });
  const meta = await driveFetch(token, `${DRIVE}/files/${file.id}?fields=id,webViewLink`);
  return (await meta.json()) as { id: string; webViewLink?: string };
}
