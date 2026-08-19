"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { formatRoc } from "@/lib/calendar";
import { formatQty } from "@/lib/money";
import { useLedger } from "@/lib/store";

const REASON: Record<string, string> = {
  stocktake: "盤點",
  consume: "耗用",
  spoilage: "報損",
  other: "其他",
};

function Body() {
  const { ledger } = useLedger();
  const itemName = (id: string) => ledger.items.find((i) => i.id === id)?.name ?? id;
  const rows = [...ledger.stockAdjustments].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">庫存調整</h1>
        <Link href="/adjustments/new/" className="rounded-xl bg-[#2f6f4e] px-4 py-2 text-white">
          新增調整
        </Link>
      </div>
      <p className="text-sm text-neutral-600">調整是增減量，不是盤後餘額；不計入進貨金額。</p>
      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-sm">尚無調整</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border bg-white p-3">
            <p className="font-medium">
              {formatRoc(row.date)} · {itemName(row.itemId)}
              {row.grade ? `／${row.grade}` : ""}
            </p>
            <p className="text-sm">
              {row.qtyInBase > 0 ? "+" : ""}
              {formatQty(row.qtyInBase)} · {REASON[row.reason]} · {row.note}
            </p>
          </article>
        ))}
      </div>
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
