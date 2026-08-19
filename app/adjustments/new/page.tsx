"use client";

import Link from "next/link";
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
    <form className="mx-auto grid max-w-xl gap-3" onSubmit={submit}>
      <h1 className="text-xl font-bold">新增庫存調整</h1>
      <p className="text-sm text-amber-800">這是增減量，不是盤後餘額。例如要從 20 包變成剩 10 包，請填 −10。</p>
      <RocDateFields iso={isValidIsoDate(date) ? date : todayIso()} onChange={setDate} />
      <label className="text-sm">
        品項
        <select className="mt-1 w-full rounded-lg border px-2" value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">請選擇</option>
          {ledger.items.filter((i) => !i.archived).map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        品級
        <select className="mt-1 w-full rounded-lg border px-2" value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">未分級</option>
          <option value="醜">醜</option>
        </select>
      </label>
      <label className="text-sm">
        增減量（基準單位：斤或包）
        <input className="mt-1 w-full rounded-lg border px-2" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <label className="text-sm">
        原因
        <select className="mt-1 w-full rounded-lg border px-2" value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
          <option value="stocktake">盤點</option>
          <option value="consume">耗用</option>
          <option value="spoilage">報損</option>
          <option value="other">其他</option>
        </select>
      </label>
      <label className="text-sm">
        備註
        <textarea className="mt-1 min-h-20 w-full rounded-lg border px-2 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Link href="/adjustments/" className="flex items-center justify-center rounded-xl border">取消</Link>
        <button type="submit" className="rounded-xl bg-[#2f6f4e] text-white">儲存</button>
      </div>
    </form>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Form />
    </AppShell>
  );
}
