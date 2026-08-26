"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DateField from "@/components/DateField";
import { isValidIsoDate, todayIso } from "@/lib/calendar";
import { defaultFinishedItemId } from "@/lib/master";
import { formatQty } from "@/lib/money";
import { newId } from "@/lib/seed";
import { finishedBalances } from "@/lib/stock";
import { useLedger } from "@/lib/store";
import { buildTransfer } from "@/lib/transfer";
import type { UnitCode } from "@/lib/types";
import { allowedUnits, UNIT_LABEL } from "@/lib/units";

export default function TransferForm() {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const initialFinishedId = defaultFinishedItemId(ledger.items);
  const [date, setDate] = useState(todayIso());
  const [itemId, setItemId] = useState(initialFinishedId);
  const [grade, setGrade] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitCode>(
    ledger.items.find((row) => row.id === initialFinishedId)?.baseUnit ?? "jin",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const finishedItems = ledger.items.filter((item) => item.kind === "finished" && !item.archived);
  const warehouses = ledger.warehouses.filter((row) => !row.archived);
  const item = ledger.items.find((row) => row.id === itemId);
  const units = item ? allowedUnits(item, ledger.unitConversions) : [];
  const source = finishedBalances(ledger).find(
    (row) => row.itemId === itemId && row.grade === grade && row.warehouseId === fromWarehouseId,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidIsoDate(date)) {
      setError("日期無效");
      return;
    }
    try {
      const record = buildTransfer({
        id: newId(),
        date,
        itemId,
        grade,
        fromWarehouseId,
        toWarehouseId,
        qty: Number(qty),
        unit,
        note,
        ledger,
      });
      const ok = updateLedger((current) => ({
        ...current,
        transfers: [...current.transfers, record],
      }));
      if (!ok) {
        setError(useLedger.getState().saveError ?? "庫存不足，無法儲存");
        return;
      }
      router.push("/transfers/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  return (
    <Stack component="form" spacing={2} sx={{ maxWidth: 560, mx: "auto" }} onSubmit={submit}>
      <Typography variant="h5">新增調撥</Typography>
      <DateField value={date} onChange={setDate} error={!isValidIsoDate(date) ? "日期無效" : undefined} />
      <TextField
        select
        label="成品"
        value={itemId}
        onChange={(e) => {
          const next = e.target.value;
          setItemId(next);
          const nextItem = ledger.items.find((i) => i.id === next);
          if (nextItem) setUnit(nextItem.baseUnit);
        }}
      >
        <MenuItem value="">請選擇</MenuItem>
        {finishedItems.map((i) => (
          <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
        ))}
      </TextField>
      <TextField select label="品級" value={grade} onChange={(e) => setGrade(e.target.value)}>
        <MenuItem value="">未分級</MenuItem>
        <MenuItem value="醜">醜</MenuItem>
      </TextField>
      <TextField select label="來源倉" value={fromWarehouseId} onChange={(e) => setFromWarehouseId(e.target.value)}>
        <MenuItem value="">請選擇</MenuItem>
        {warehouses.map((w) => (
          <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
        ))}
      </TextField>
      {source ? (
        <Typography variant="body2" color="text.secondary">
          來源倉目前 {formatQty(source.balance)} {UNIT_LABEL[source.baseUnit]}
        </Typography>
      ) : fromWarehouseId && itemId ? (
        <Typography variant="body2" color="text.secondary">來源倉目前 0</Typography>
      ) : null}
      <TextField select label="目的倉" value={toWarehouseId} onChange={(e) => setToWarehouseId(e.target.value)}>
        <MenuItem value="">請選擇</MenuItem>
        {warehouses.map((w) => (
          <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1.5}>
        <TextField label="數量" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        <TextField select label="單位" value={unit} onChange={(e) => setUnit(e.target.value as UnitCode)}>
          {units.map((u) => (
            <MenuItem key={u} value={u}>{UNIT_LABEL[u]}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField label="備註" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => router.push("/transfers/")}>取消</Button>
        <Button fullWidth type="submit" variant="contained">儲存</Button>
      </Stack>
    </Stack>
  );
}
