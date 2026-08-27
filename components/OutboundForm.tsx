"use client";

import Add from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import DateField from "@/components/DateField";
import { isValidIsoDate, todayIso } from "@/lib/calendar";
import { AR_LABEL, defaultFinishedItemId } from "@/lib/master";
import { computedAmount, formatMoney, formatQty } from "@/lib/money";
import { buildOutbound, lastOutboundPrice } from "@/lib/outbound";
import { newId } from "@/lib/seed";
import { finishedBalances } from "@/lib/stock";
import { useLedger } from "@/lib/store";
import type { ArStatus, Ledger } from "@/lib/types";
import { FINISHED_UNIT, UNIT_LABEL } from "@/lib/units";

type Props = { editId?: string };

function ledgerWithoutOutbound(ledger: Ledger, id?: string): Ledger {
  if (!id) return ledger;
  return { ...ledger, outboundRecords: ledger.outboundRecords.filter((row) => row.id !== id) };
}

export default function OutboundForm({ editId }: Props) {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const existing = ledger.outboundRecords.find((row) => row.id === editId);
  const initialFinishedId = existing?.itemId ?? defaultFinishedItemId(ledger.items);

  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [customerId, setCustomerId] = useState(existing?.customerId ?? "");
  const [itemId, setItemId] = useState(initialFinishedId);
  const [grade, setGrade] = useState(existing?.grade || "");
  const [warehouseId, setWarehouseId] = useState(existing?.warehouseId ?? "");
  const [qty, setQty] = useState(existing ? String(existing.qty) : "");
  const [unitPrice, setUnitPrice] = useState(existing ? String(existing.unitPrice) : "");
  const [amount, setAmount] = useState(existing ? String(existing.amount) : "");
  const [amountLocked, setAmountLocked] = useState(existing?.amountOverridden === 1);
  const [arStatus, setArStatus] = useState<ArStatus>(existing?.arStatus ?? "unpaid");
  const [note, setNote] = useState(existing?.note ?? "");
  const [addOpen, setAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [addError, setAddError] = useState("");
  const [error, setError] = useState("");

  const item = ledger.items.find((row) => row.id === itemId);
  const unit = item?.baseUnit ?? FINISHED_UNIT;
  const activeCustomers = ledger.customers.filter((s) => !s.archived || s.id === customerId);
  const finishedItems = ledger.items.filter((s) => s.kind === "finished" && (!s.archived || s.id === itemId));
  const warehouses = ledger.warehouses.filter((s) => !s.archived || s.id === warehouseId);
  const qtyNum = Number(qty);
  const priceNum = Number(unitPrice);
  const formula = Number.isFinite(qtyNum) && Number.isFinite(priceNum) ? computedAmount(qtyNum, priceNum) : 0;
  const source = finishedBalances(ledgerWithoutOutbound(ledger, existing?.id)).find(
    (row) => row.itemId === itemId && row.grade === grade && row.warehouseId === warehouseId,
  );

  function applyLastPrice(nextCustomer: string, nextItem: string, nextGrade: string) {
    const last = lastOutboundPrice(ledger.outboundRecords.filter((row) => row.id !== existing?.id), nextCustomer, nextItem, nextGrade);
    if (!last) return;
    setUnitPrice(String(last.unitPrice));
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

  function openAddCustomer() {
    setNewCustomer("");
    setAddError("");
    setAddOpen(true);
  }

  function addCustomer() {
    const name = newCustomer.trim();
    if (!name) {
      setAddError("名稱不可空白");
      return;
    }
    if (ledger.customers.some((s) => s.name === name)) {
      setAddError("客戶名稱已存在");
      return;
    }
    const id = newId();
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      customers: [
        ...current.customers,
        { id, name, archived: 0, createdAt: timestamp, updatedAt: timestamp },
      ],
    }));
    setCustomerId(id);
    applyLastPrice(id, itemId, grade === "醜" ? "醜" : grade);
    setNewCustomer("");
    setAddError("");
    setAddOpen(false);
    setError("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidIsoDate(date)) {
      setError("日期無效（例如沒有 12/38）");
      return;
    }
    if (!customerId || !itemId || !warehouseId) {
      setError("請選客戶、成品與倉");
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
      const record = buildOutbound({
        id: existing?.id ?? newId(),
        date,
        customerId,
        itemId,
        grade,
        warehouseId,
        qty: qtyNum,
        unit,
        unitPrice: priceNum,
        amount: amountNum,
        arStatus,
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
        outboundRecords: existing
          ? current.outboundRecords.map((row) => (row.id === existing.id ? record : row))
          : [...current.outboundRecords, record],
      }));
      if (!ok) {
        setError(useLedger.getState().saveError ?? "庫存不足，無法儲存");
        return;
      }
      router.push("/outbounds/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  if (editId && !existing) {
    return <Alert severity="warning">找不到這筆出貨。</Alert>;
  }

  return (
    <>
    <Stack component="form" spacing={2} sx={{ maxWidth: 560, mx: "auto" }} onSubmit={submit}>
      <Typography variant="h5">{existing ? "編輯出貨" : "新增出貨"}</Typography>
      <DateField value={date} onChange={setDate} error={!isValidIsoDate(date) ? "日期無效" : undefined} />
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <TextField
          select
          label="客戶"
          value={customerId}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "__add__") {
              openAddCustomer();
              return;
            }
            setCustomerId(next);
            applyLastPrice(next, itemId, grade === "醜" ? "醜" : grade);
          }}
          sx={{ flex: 1 }}
        >
          <MenuItem value="">請選擇</MenuItem>
          {activeCustomers.map((s) => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
          <MenuItem value="__add__">新增客戶…</MenuItem>
        </TextField>
        <IconButton
          type="button"
          color="primary"
          aria-label="新增客戶"
          onClick={openAddCustomer}
          sx={{
            flex: "0 0 40px",
            width: 40,
            height: 40,
            minWidth: 40,
            minHeight: 40,
            maxWidth: 40,
            maxHeight: 40,
            p: 0,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            boxSizing: "border-box",
          }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Stack>
      <TextField
        select
        label="成品"
        value={itemId}
        onChange={(e) => {
          const next = e.target.value;
          setItemId(next);
          applyLastPrice(customerId, next, grade === "醜" ? "醜" : grade);
        }}
      >
        <MenuItem value="">請選擇</MenuItem>
        {finishedItems.map((i) => (
          <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="品級"
        value={grade}
        onChange={(e) => {
          setGrade(e.target.value);
          applyLastPrice(customerId, itemId, e.target.value);
        }}
      >
        <MenuItem value="">未分級</MenuItem>
        <MenuItem value="醜">醜</MenuItem>
      </TextField>
      <TextField select label="倉" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
        <MenuItem value="">請選擇</MenuItem>
        {warehouses.map((w) => (
          <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
        ))}
      </TextField>
      {source ? (
        <Typography variant="body2" color="text.secondary">
          此倉目前 {formatQty(source.balance)} {UNIT_LABEL[source.baseUnit]}
        </Typography>
      ) : warehouseId && itemId ? (
        <Typography variant="body2" color="text.secondary">此倉目前 0</Typography>
      ) : null}
      <TextField
        label={`數量（${UNIT_LABEL[unit]}）`}
        inputMode="decimal"
        value={qty}
        onChange={(e) => onQtyOrPrice(e.target.value, unitPrice)}
      />
      <TextField
        label={`單價（元／${UNIT_LABEL[unit]}）`}
        inputMode="numeric"
        value={unitPrice}
        onChange={(e) => onQtyOrPrice(qty, e.target.value)}
      />
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
      <TextField select label="應收" value={arStatus} onChange={(e) => setArStatus(e.target.value as ArStatus)}>
        <MenuItem value="unpaid">{AR_LABEL.unpaid}</MenuItem>
        <MenuItem value="paid">{AR_LABEL.paid}</MenuItem>
      </TextField>
      <TextField label="備註" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => router.push("/outbounds/")}>取消</Button>
        <Button fullWidth type="submit" variant="contained">儲存</Button>
      </Stack>
    </Stack>
    <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>新增客戶</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="客戶名稱"
          value={newCustomer}
          onChange={(e) => {
            setNewCustomer(e.target.value);
            setAddError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomer();
            }
          }}
          error={Boolean(addError)}
          helperText={addError}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={() => setAddOpen(false)}>取消</Button>
        <Button type="button" variant="contained" onClick={addCustomer}>新增</Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
