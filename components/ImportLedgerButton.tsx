"use client";

import { useRef, useState } from "react";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { parseLedger } from "@/lib/schema";
import { useLedger } from "@/lib/store";

export default function ImportLedgerButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceLedger = useLedger((s) => s.replaceLedger);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  function confirmReplace(): boolean {
    return confirm("匯入會覆蓋目前帳本（進貨、庫存調整、供應商、品項）。確定嗎？");
  }

  async function apply(data: unknown) {
    const ledger = parseLedger(data);
    replaceLedger(ledger);
    setError(false);
    setMessage(`已匯入 ${ledger.inboundRecords.length} 筆進貨`);
  }

  async function onFile(file: File) {
    if (!confirmReplace()) return;
    try {
      await apply(JSON.parse(await file.text()));
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "JSON 格式不正確");
    }
  }

  return (
    <>
      <Button variant="outlined" onClick={() => inputRef.current?.click()}>
        從 JSON 檔匯入
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void onFile(file);
        }}
      />
      <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage("")}>
        <Alert severity={error ? "error" : "success"} onClose={() => setMessage("")}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
