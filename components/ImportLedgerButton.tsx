"use client";

import { useRef, useState } from "react";
import { parseLedger } from "@/lib/schema";
import { useLedger } from "@/lib/store";

export default function ImportLedgerButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceLedger = useLedger((s) => s.replaceLedger);
  const [message, setMessage] = useState("");

  function confirmReplace(): boolean {
    return confirm("匯入會覆蓋目前帳本（進貨、庫存調整、供應商、品項）。確定嗎？");
  }

  async function apply(data: unknown) {
    const ledger = parseLedger(data);
    replaceLedger(ledger);
    setMessage(`已匯入 ${ledger.inboundRecords.length} 筆進貨`);
  }

  async function onFile(file: File) {
    if (!confirmReplace()) return;
    try {
      await apply(JSON.parse(await file.text()));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 格式不正確");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border px-3" onClick={() => inputRef.current?.click()}>
          從 JSON 檔匯入
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </div>
      {message ? <p className="mt-1 text-sm text-neutral-600">{message}</p> : null}
    </div>
  );
}
