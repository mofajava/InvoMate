"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
        if (uploaded.webViewLink) {
          setMessage("已存到雲端硬碟");
          window.open(uploaded.webViewLink, "_blank");
        } else {
          setMessage("已上傳");
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
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        匯出
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>匯出進貨</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="格式" value={format} onChange={(e) => setFormat(e.target.value as "xlsx" | "pdf")}>
              <MenuItem value="xlsx">Excel（xlsx）</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
            </TextField>
            <TextField select label="範圍" value={scope} onChange={(e) => setScope(e.target.value as "filter" | "all")}>
              <MenuItem value="filter">目前篩選</MenuItem>
              <MenuItem value="all">全部進貨</MenuItem>
            </TextField>
            <FormControlLabel
              control={<Checkbox checked={toDrive} onChange={(e) => setToDrive(e.target.checked)} />}
              label="存到 Google 雲端硬碟"
            />
            <FormControlLabel
              control={<Checkbox checked={toDevice} onChange={(e) => setToDevice(e.target.checked)} />}
              label="下載到此裝置"
            />
            {message ? <Typography variant="body2">{message}</Typography> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>關閉</Button>
          <Button variant="contained" disabled={busy} onClick={() => void run()}>
            {busy ? "匯出中…" : "開始匯出"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
