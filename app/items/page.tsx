"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";
import type { BaseUnit } from "@/lib/types";
import { conversionSummary } from "@/lib/units";

function Body() {
  const { ledger, updateLedger } = useLedger();
  const [name, setName] = useState("");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("jin");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [fromQty, setFromQty] = useState("100");
  const [toQty, setToQty] = useState("3333");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.items.some((s) => s.name === trimmed)) {
      setError("名稱已存在");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      items: [...current.items, { id: newId(), name: trimmed, baseUnit, archived: 0, createdAt: timestamp, updatedAt: timestamp }],
    }));
    setName("");
    setError("");
  }

  function startRename(id: string, currentName: string) {
    setError("");
    setConvertingId(null);
    setEditingId(id);
    setEditingName(currentName);
  }

  function saveRename() {
    if (!editingId) return;
    const next = editingName.trim();
    if (!next) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.items.some((s) => s.name === next && s.id !== editingId)) {
      setError("名稱已存在");
      return;
    }
    updateLedger((led) => ({
      ...led,
      items: led.items.map((s) =>
        s.id === editingId ? { ...s, name: next, updatedAt: new Date().toISOString() } : s,
      ),
    }));
    setEditingId(null);
    setEditingName("");
    setError("");
  }

  function toggle(id: string) {
    updateLedger((led) => ({
      ...led,
      items: led.items.map((s) => (s.id === id ? { ...s, archived: s.archived ? 0 : 1, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  function startConversion(itemId: string) {
    const existing = ledger.unitConversions.find((c) => c.itemId === itemId);
    setEditingId(null);
    setConvertingId(itemId);
    setFromQty(String(existing?.fromQty ?? 100));
    setToQty(String(existing?.toQty ?? 3333));
    setError("");
  }

  function saveConversion() {
    if (!convertingId) return;
    const from = Number(fromQty);
    const to = Number(toQty);
    if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to) || to <= 0) {
      setError("換算請輸入正數");
      return;
    }
    const item = ledger.items.find((i) => i.id === convertingId);
    if (!item) return;
    const existing = ledger.unitConversions.find((c) => c.itemId === convertingId);
    updateLedger((led) => {
      const rest = led.unitConversions.filter((c) => !(c.itemId === convertingId && c.fromUnit === "box"));
      return {
        ...led,
        unitConversions: [
          ...rest,
          {
            id: existing?.id ?? newId(),
            itemId: convertingId,
            fromUnit: "box",
            toUnit: item.baseUnit,
            fromQty: from,
            toQty: to,
          },
        ],
      };
    });
    setConvertingId(null);
    setError("");
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">品項</h1>
      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
        <input className="rounded-lg border px-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="新品項，例如山藥成品" />
        <select className="rounded-lg border px-2" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}>
          <option value="jin">斤</option>
          <option value="bag">包</option>
        </select>
        <button type="button" className="rounded-xl bg-[#2f6f4e] px-4 text-white" onClick={add}>
          新增
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {ledger.items.map((item) => (
          <li key={item.id} className="rounded-xl border bg-white p-3">
            {editingId === item.id ? (
              <div className="grid gap-2">
                <input
                  className="w-full rounded-lg border px-3"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-xl border" onClick={() => setEditingId(null)}>
                    取消
                  </button>
                  <button type="button" className="flex-1 rounded-xl bg-[#2f6f4e] text-white" onClick={saveRename}>
                    儲存
                  </button>
                </div>
              </div>
            ) : convertingId === item.id ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">{item.name}　箱 → {item.baseUnit === "jin" ? "斤" : "包"}</p>
                <label className="text-sm">
                  幾箱
                  <input className="mt-1 w-full rounded-lg border px-3" inputMode="numeric" value={fromQty} onChange={(e) => setFromQty(e.target.value)} />
                </label>
                <label className="text-sm">
                  等於多少{item.baseUnit === "jin" ? "斤" : "包"}
                  <input className="mt-1 w-full rounded-lg border px-3" inputMode="numeric" value={toQty} onChange={(e) => setToQty(e.target.value)} />
                </label>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-xl border" onClick={() => setConvertingId(null)}>
                    取消
                  </button>
                  <button type="button" className="flex-1 rounded-xl bg-[#2f6f4e] text-white" onClick={saveConversion}>
                    儲存
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="font-medium">
                    {item.name}
                    {item.archived ? <span className="ml-2 text-sm text-neutral-500">已停用</span> : null}
                  </p>
                  <p className="text-sm text-neutral-600">{conversionSummary(item, ledger.unitConversions)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => startRename(item.id, item.name)}>
                    重新命名
                  </button>
                  <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => toggle(item.id)}>
                    {item.archived ? "啟用" : "停用"}
                  </button>
                  {item.baseUnit === "jin" ? (
                    <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => startConversion(item.id)}>
                      編輯箱換算
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}
