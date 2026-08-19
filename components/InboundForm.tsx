"use client";

import Link from "next/link";
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
  const activeItems = ledger.items.filter((s) => !s.archived || s.id === itemId);
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
      updateLedger((current) => ({
        ...current,
        inboundRecords: existing
          ? current.inboundRecords.map((row) => (row.id === existing.id ? record : row))
          : [...current.inboundRecords, record],
      }));
      router.push("/inbounds/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  if (editId && !existing) {
    return <p>找不到這筆進貨。</p>;
  }

  return (
    <form className="mx-auto grid max-w-xl gap-3" onSubmit={submit}>
      <h1 className="text-xl font-bold">{existing ? "編輯進貨" : "新增進貨"}</h1>
      <RocDateFields iso={isValidIsoDate(date) ? date : "2025-01-01"} onChange={setDate} error={!isValidIsoDate(date) ? "日期無效" : undefined} />
      <label className="text-sm">
        供應商
        <select className="mt-1 w-full rounded-lg border px-2" value={supplierId} onChange={(e) => {
          setSupplierId(e.target.value);
          applyLastPrice(e.target.value, itemId, grade === "醜" ? "醜" : "");
        }}>
          <option value="">請選擇</option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-2" placeholder="新增供應商名稱" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
        <button type="button" className="rounded-lg border px-3" onClick={addSupplier}>新增</button>
      </div>
      <label className="text-sm">
        品項
        <select className="mt-1 w-full rounded-lg border px-2" value={itemId} onChange={(e) => {
          const next = e.target.value;
          setItemId(next);
          const nextItem = ledger.items.find((i) => i.id === next);
          if (nextItem) setUnit(nextItem.baseUnit);
          applyLastPrice(supplierId, next, grade === "醜" ? "醜" : "");
        }}>
          <option value="">請選擇</option>
          {activeItems.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        品級
        <select className="mt-1 w-full rounded-lg border px-2" value={grade} onChange={(e) => {
          setGrade(e.target.value);
          applyLastPrice(supplierId, itemId, e.target.value === "醜" ? "醜" : e.target.value);
        }}>
          <option value="">未分級</option>
          <option value="醜">醜</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          數量
          <input className="mt-1 w-full rounded-lg border px-2" inputMode="decimal" value={qty} onChange={(e) => onQtyOrPrice(e.target.value, unitPrice)} />
        </label>
        <label className="text-sm">
          單位
          <select className="mt-1 w-full rounded-lg border px-2" value={unit} onChange={(e) => setUnit(e.target.value as UnitCode)}>
            {units.map((u) => (
              <option key={u} value={u}>{UNIT_LABEL[u]}</option>
            ))}
          </select>
        </label>
      </div>
      {previewBase !== null && unit === "box" ? <p className="text-sm text-neutral-600">約 {previewBase} 斤</p> : null}
      {unitHint ? <p className="text-sm text-amber-800">{unitHint}</p> : null}
      <label className="text-sm">
        單價（元／該單位）
        <input className="mt-1 w-full rounded-lg border px-2" inputMode="numeric" value={unitPrice} onChange={(e) => onQtyOrPrice(qty, e.target.value)} />
      </label>
      <label className="text-sm">
        金額
        <input
          className="mt-1 w-full rounded-lg border px-2"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            setAmountLocked(true);
            setAmount(e.target.value);
          }}
        />
      </label>
      <p className="text-sm text-neutral-600">公式金額 {formatMoney(formula)}</p>
      {amountLocked ? (
        <button type="button" className="w-fit rounded-lg border px-3 text-sm" onClick={() => {
          setAmountLocked(false);
          setAmount(String(formula));
        }}>
          恢復公式金額
        </button>
      ) : null}
      <label className="text-sm">
        備註
        <textarea className="mt-1 min-h-20 w-full rounded-lg border px-2 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link href="/inbounds/" className="flex items-center justify-center rounded-xl border">取消</Link>
        <button type="submit" className="rounded-xl bg-[#2f6f4e] text-white">儲存</button>
      </div>
    </form>
  );
}
