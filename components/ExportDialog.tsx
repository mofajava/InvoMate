"use client";

import { useState } from "react";
import { uploadExportFile } from "@/lib/drive";
import { buildPdfBlob, buildWorkbook, downloadBlob, exportFilename } from "@/lib/export";
import { useLedger } from "@/lib/store";
import type { InboundQuery } from "@/lib/types";

type Props = { query: InboundQuery };

export default function ExportDialog({ query }: Props) {
  const { ledger, token, handle } = useLedger();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "pdf">("xlsx");
  const [scope, setScope] = useState<"filter" | "all">("filter");
  const [toDrive, setToDrive] = useState(true);
  const [toDevice, setToDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage("");
    try {
      const useFilter = scope === "filter";
      const filename = exportFilename(format);
      const blob =
        format === "xlsx"
          ? buildWorkbook(ledger, query, useFilter).blob
          : await buildPdfBlob(ledger, query, useFilter);
      if (toDevice) downloadBlob(blob, filename);
      if (toDrive && token && handle && handle.folderId !== "local") {
        const mime =
          format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        const uploaded = await uploadExportFile(token, handle.folderId, filename, blob, mime);
        setMessage(uploaded.webViewLink ? `已存到雲端硬碟` : "已上傳");
        if (uploaded.webViewLink) {
          setMessage(`已存到雲端硬碟`);
          window.open(uploaded.webViewLink, "_blank");
        }
      } else if (toDrive && (!token || handle?.folderId === "local")) {
        setMessage("無法上傳雲端硬碟，已改為僅下載");
      } else {
        setMessage("已完成");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "匯出失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="rounded-lg border px-3" onClick={() => setOpen((v) => !v)}>
        匯出
      </button>
      {open ? (
        <div className="mt-3 space-y-2 rounded-xl border bg-white p-3 text-sm">
          <label className="flex items-center gap-2">
            格式
            <select className="rounded border px-2" value={format} onChange={(e) => setFormat(e.target.value as "xlsx" | "pdf")}>
              <option value="xlsx">Excel（xlsx）</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            範圍
            <select className="rounded border px-2" value={scope} onChange={(e) => setScope(e.target.value as "filter" | "all")}>
              <option value="filter">目前篩選</option>
              <option value="all">全部進貨</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={toDrive} onChange={(e) => setToDrive(e.target.checked)} />
            存到 Google 雲端硬碟
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={toDevice} onChange={(e) => setToDevice(e.target.checked)} />
            下載到此裝置
          </label>
          <button type="button" className="w-full rounded-xl bg-[#2f6f4e] py-2 text-white disabled:opacity-50" disabled={busy} onClick={() => void run()}>
            {busy ? "匯出中…" : "開始匯出"}
          </button>
          {message ? <p>{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
