"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RocDateFields from "@/components/RocDateFields";
import { isValidIsoDate, todayIso } from "@/lib/calendar";
import { buildInbound, lastPrice } from "@/lib/inbound";
import { computedAmount, formatMoney } from "@/lib/money";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";
import { allowedUnits, qtyInBase, UNIT_LABEL } from "@/lib/units";
import type { UnitCode } from "@/lib/types";

type Props = { editId?: string };

export default function InboundForm({ editId }: Props) {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const existing = ledger.inboundRecords.find((row) => row.id === editId);

  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [supplierId, setSupplierId] = useState(existing?.supplierId ?? "");
  const [itemId, setItemId] = useState(existing?.itemId ?? "");
  const [grade, setGrade] = useState(existing?.grade || "");
  const [qty, setQty] = useState(existing ? String(existing.qty) : "");
  const [unit, setUnit] = useState<UnitCode>(existing?.unit ?? "jin");
  const [unitPrice, setUnitPrice] = useState(existing ? String(existing.unitPrice) : "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [amountLocked, setAmountLocked] = useState(existing?.amountOverridden === 1);
  const [note, setNote] = useState(existing?.note ?? "");
  const [newSupplier, setNewSupplier] = useState("");
  const [error, setError] = useState("");
  const [unitHint, setUnitHint] = useState("");

  const item = ledger.items.find((row) => row.id === itemId);
  const units = item ? allowedUnits(item, ledger.unitConversions) : [];
  const activeSuppliers = ledger.suppliers.filter((s) => !s.archived || s.id === supplierId);
  const activeItems = ledger.items.filter(
    (s) => s.kind === "raw" && (!s.archived || s.id === itemId),
  );
  const qtyNum = Number(qty);
  const priceNum = Number(unitPrice);
  const formula = Number.isFinite(qtyNum) && Number.isFinite(priceNum) ? computedAmount(qtyNum, priceNum) : 0;
  let previewBase: number | null = null;
  try {
    if (item && Number.isFinite(qtyNum) && qtyNum > 0) {
      previewBase = qtyInBase(qtyNum, unit, item, ledger.unitConversions);
    }
  } catch {
    previewBase = null;
  }

  function applyLastPrice(nextSupplier: string, nextItem: string, nextGrade: string) {
    const last = lastPrice(ledger.inboundRecords, nextSupplier, nextItem, nextGrade);
    if (!last) return;
    setUnitPrice(String(last.unitPrice));
    if (last.unit !== unit) {
      setUnitHint(`上次單位是「${UNIT_LABEL[last.unit]}」，目前是「${UNIT_LABEL[unit]}」，請確認單價`);
    } else {
      setUnitHint("");
    }
    if (!amountLocked) setAmount(String(computedAmount(Number(qty) || 0, last.unitPrice)));
  }

  function onQtyOrPrice(nextQty: string, nextPrice: string) {
    setQty(nextQty);
    setUnitPrice(nextPrice);
    if (!amountLocked) {
      const q = Number(nextQty);
      const p = Number(nextPrice);
      if (Number.isFinite(q) && Number.isFinite(p)) setAmount(String(computedAmount(q, p)));
    }
  }

  function addSupplier() {
    const name = newSupplier.trim();
    if (!name) return;
    if (ledger.suppliers.some((s) => s.name === name)) {
      setError("供應商名稱已存在");
      return;
    }
    const id = newId();
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      suppliers: [
        ...current.suppliers,
        { id, name, archived: 0, createdAt: timestamp, updatedAt: timestamp },
      ],
    }));
    setSupplierId(id);
    setNewSupplier("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidIsoDate(date)) {
      setError("日期無效（例如沒有 12/38）");
      return;
    }
    if (!supplierId || !itemId) {
      setError("請選供應商與品項");
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError("數量須大於 0");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("單價無效");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      setError("金額無效");
      return;
    }
    try {
      const record = buildInbound({
        id: existing?.id ?? newId(),
        date,
        supplierId,
        itemId,
        grade,
        qty: qtyNum,
        unit,
        unitPrice: priceNum,
        amount: amountNum,
        note,
        ledger,
        now: existing?.createdAt,
      });
      if (existing) {
        record.createdAt = existing.createdAt;
        record.updatedAt = new Date().toISOString();
      }
      const ok = updateLedger((current) => ({
        ...current,
        inboundRecords: existing
          ? current.inboundRecords.map((row) => (row.id === existing.id ? record : row))
          : [...current.inboundRecords, record],
      }));
      if (!ok) {
        setError(useLedger.getState().saveError ?? "庫存不足，無法儲存");
        return;
      }
      router.push("/inbounds/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  if (editId && !existing) {
    return <Alert severity="warning">找不到這筆進貨。</Alert>;
  }

  return (
    <Stack component="form" spacing={2} sx={{ maxWidth: 560, mx: "auto" }} onSubmit={submit}>
      <Typography variant="h5">{existing ? "編輯進貨" : "新增進貨"}</Typography>
      <RocDateFields iso={isValidIsoDate(date) ? date : "2025-01-01"} onChange={setDate} error={!isValidIsoDate(date) ? "日期無效" : undefined} />
      <TextField
        select
        label="供應商"
        value={supplierId}
        onChange={(e) => {
          setSupplierId(e.target.value);
          applyLastPrice(e.target.value, itemId, grade === "醜" ? "醜" : "");
        }}
      >
        <MenuItem value="">請選擇</MenuItem>
        {activeSuppliers.map((s) => (
          <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1}>
        <TextField label="新增供應商名稱" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
        <Button variant="outlined" onClick={addSupplier} sx={{ whiteSpace: "nowrap" }}>新增</Button>
      </Stack>
      <TextField
        select
        label="品項"
        value={itemId}
        onChange={(e) => {
          const next = e.target.value;
          setItemId(next);
          const nextItem = ledger.items.find((i) => i.id === next);
          if (nextItem) setUnit(nextItem.baseUnit);
          applyLastPrice(supplierId, next, grade === "醜" ? "醜" : "");
        }}
      >
        <MenuItem value="">請選擇</MenuItem>
        {activeItems.map((i) => (
          <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="品級"
        value={grade}
        onChange={(e) => {
          setGrade(e.target.value);
          applyLastPrice(supplierId, itemId, e.target.value === "醜" ? "醜" : e.target.value);
        }}
      >
        <MenuItem value="">未分級</MenuItem>
        <MenuItem value="醜">醜</MenuItem>
      </TextField>
      <Stack direction="row" spacing={1.5}>
        <TextField label="數量" inputMode="decimal" value={qty} onChange={(e) => onQtyOrPrice(e.target.value, unitPrice)} />
        <TextField select label="單位" value={unit} onChange={(e) => setUnit(e.target.value as UnitCode)}>
          {units.map((u) => (
            <MenuItem key={u} value={u}>{UNIT_LABEL[u]}</MenuItem>
          ))}
        </TextField>
      </Stack>
      {previewBase !== null && unit === "box" ? (
        <Typography variant="body2" color="text.secondary">約 {previewBase} 斤</Typography>
      ) : null}
      {unitHint ? <Alert severity="warning">{unitHint}</Alert> : null}
      <TextField label="單價（元／該單位）" inputMode="numeric" value={unitPrice} onChange={(e) => onQtyOrPrice(qty, e.target.value)} />
      <TextField
        label="金額"
        inputMode="numeric"
        value={amount}
        onChange={(e) => {
          setAmountLocked(true);
          setAmount(e.target.value);
        }}
      />
      <Typography variant="body2" color="text.secondary">公式金額 {formatMoney(formula)}</Typography>
      {amountLocked ? (
        <Button
          variant="text"
          onClick={() => {
            setAmountLocked(false);
            setAmount(String(formula));
          }}
          sx={{ alignSelf: "flex-start" }}
        >
          恢復公式金額
        </Button>
      ) : null}
      <TextField label="備註" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => router.push("/inbounds/")}>取消</Button>
        <Button fullWidth type="submit" variant="contained">儲存</Button>
      </Stack>
    </Stack>
  );
}
