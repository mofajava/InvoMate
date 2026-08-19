"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";

function Body() {
  const { ledger, updateLedger } = useLedger();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.suppliers.some((s) => s.name === trimmed)) {
      setError("名稱已存在");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      suppliers: [...current.suppliers, { id: newId(), name: trimmed, archived: 0, createdAt: timestamp, updatedAt: timestamp }],
    }));
    setName("");
    setError("");
  }

  function startRename(id: string, currentName: string) {
    setError("");
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
    if (ledger.suppliers.some((s) => s.name === next && s.id !== editingId)) {
      setError("名稱已存在");
      return;
    }
    updateLedger((led) => ({
      ...led,
      suppliers: led.suppliers.map((s) =>
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
      suppliers: led.suppliers.map((s) => (s.id === id ? { ...s, archived: s.archived ? 0 : 1, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">供應商</h1>
      <div className="flex gap-2">
        <input className="flex-1 rounded-lg border px-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="新供應商" />
        <button type="button" className="rounded-xl bg-[#2f6f4e] px-4 text-white" onClick={add}>
          新增
        </button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {ledger.suppliers.map((s) => (
          <li key={s.id} className="rounded-xl border bg-white p-3">
            {editingId === s.id ? (
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
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>
                  {s.name}
                  {s.archived ? <span className="ml-2 text-sm text-neutral-500">已停用</span> : null}
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => startRename(s.id, s.name)}>
                    重新命名
                  </button>
                  <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => toggle(s.id)}>
                    {s.archived ? "啟用" : "停用"}
                  </button>
                </span>
              </div>
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
