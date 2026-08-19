"use client";

import AppShell from "@/components/AppShell";
import { formatQty } from "@/lib/money";
import { stockBalances } from "@/lib/stock";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function Body() {
  const { ledger } = useLedger();
  const rows = stockBalances(ledger.items, ledger.inboundRecords, ledger.stockAdjustments);
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">庫存</h1>
      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? <p className="text-sm">尚無庫存</p> : null}
        {rows.map((row) => (
          <article key={`${row.itemId}-${row.grade}`} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <div>
              <p className="font-medium">{row.itemName}</p>
              <p className="text-sm text-neutral-600">{row.grade || "未分級"}</p>
            </div>
            <p className={row.balance < 0 ? "font-bold text-red-700" : "font-bold"}>
              {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
            </p>
          </article>
        ))}
      </div>
      <table className="hidden min-w-full bg-white text-sm md:table">
        <thead>
          <tr className="border-b text-left">
            <th className="px-2 py-2">品項</th>
            <th className="px-2 py-2">品級</th>
            <th className="px-2 py-2">餘額</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.itemId}-${row.grade}`} className="border-b">
              <td className="px-2 py-2">{row.itemName}</td>
              <td className="px-2 py-2">{row.grade || "未分級"}</td>
              <td className={`px-2 py-2 ${row.balance < 0 ? "text-red-700" : ""}`}>
                {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
