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

async function findFile(token: string, name: string, parentId: string): Promise<string | null> {
  const q = `name='${name}' and '${parentId}' in parents and trashed=false`;
  const res = await driveFetch(
    token,
    `${DRIVE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
  );
  const data = (await res.json()) as { files: { id: string }[] };
  return data.files[0]?.id ?? null;
}

async function createJsonFile(token: string, parentId: string, content: Ledger): Promise<string> {
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
    `${UPLOAD}/files?uploadType=multipart&fields=id`,
    { method: "POST", body },
  );
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function updateJsonFile(token: string, fileId: string, content: Ledger): Promise<void> {
  await driveFetch(
    token,
    `${UPLOAD}/files/${fileId}?uploadType=media`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    },
  );
}

async function downloadJson(token: string, fileId: string): Promise<Ledger> {
  const res = await driveFetch(token, `${DRIVE}/files/${fileId}?alt=media`);
  const data = await res.json();
  return parseLedger(data);
}

export type LedgerHandle = {
  fileId: string | "local";
  folderId: string | "local";
};

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
    const fileId = await createJsonFile(token, folderId, ledger);
    return { ledger, handle: { fileId, folderId } };
  }
  const ledger = await downloadJson(token, existing);
  return { ledger, handle: { fileId: existing, folderId } };
}

export async function saveLedger(
  token: string | null,
  handle: LedgerHandle,
  ledger: Ledger,
): Promise<void> {
  const next = { ...ledger, updatedAt: new Date().toISOString() };
  if (!token || handle.fileId === "local") {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
    return;
  }
  await updateJsonFile(token, handle.fileId, next);
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
