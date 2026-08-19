"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import RocDateFields from "@/components/RocDateFields";
import { isValidIsoDate, todayIso } from "@/lib/calendar";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";
import type { AdjustmentReason } from "@/lib/types";

function Form() {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const [date, setDate] = useState(todayIso());
  const [itemId, setItemId] = useState("");
  const [grade, setGrade] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<AdjustmentReason>("stocktake");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const qtyInBase = Number(qty);
    if (!isValidIsoDate(date)) {
      setError("日期無效");
      return;
    }
    if (!itemId) {
      setError("請選品項");
      return;
    }
    if (!Number.isFinite(qtyInBase) || qtyInBase === 0) {
      setError("增減量不可為 0");
      return;
    }
    if (reason === "other" && !note.trim()) {
      setError("原因為其他時請填備註");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      stockAdjustments: [
        ...current.stockAdjustments,
        {
          id: newId(),
          date,
          itemId,
          grade,
          qtyInBase,
          reason,
          note,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
    }));
    router.push("/adjustments/");
  }

  return (
    <Stack component="form" spacing={2} sx={{ maxWidth: 560, mx: "auto" }} onSubmit={submit}>
      <Typography variant="h5">新增庫存調整</Typography>
      <Alert severity="warning">這是增減量，不是盤後餘額。例如要從 20 包變成剩 10 包，請填 −10。</Alert>
      <RocDateFields iso={isValidIsoDate(date) ? date : todayIso()} onChange={setDate} />
      <TextField select label="品項" value={itemId} onChange={(e) => setItemId(e.target.value)}>
        <MenuItem value="">請選擇</MenuItem>
        {ledger.items.filter((i) => !i.archived).map((i) => (
          <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
        ))}
      </TextField>
      <TextField select label="品級" value={grade} onChange={(e) => setGrade(e.target.value)}>
        <MenuItem value="">未分級</MenuItem>
        <MenuItem value="醜">醜</MenuItem>
      </TextField>
      <TextField label="增減量（基準單位：斤或包）" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
      <TextField select label="原因" value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
        <MenuItem value="stocktake">盤點</MenuItem>
        <MenuItem value="consume">耗用</MenuItem>
        <MenuItem value="spoilage">報損</MenuItem>
        <MenuItem value="other">其他</MenuItem>
      </TextField>
      <TextField label="備註" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => router.push("/adjustments/")}>取消</Button>
        <Button fullWidth type="submit" variant="contained">儲存</Button>
      </Stack>
    </Stack>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Form />
    </AppShell>
  );
}
