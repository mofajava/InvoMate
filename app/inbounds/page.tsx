"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportDialog from "@/components/ExportDialog";
import ImportLedgerButton from "@/components/ImportLedgerButton";
import QueryPanel from "@/components/QueryPanel";
import { formatRoc } from "@/lib/calendar";
import { amountDiff, formatMoney, formatQty } from "@/lib/money";
import { emptyQuery, filterInbounds, queryTotals } from "@/lib/query";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function InboundsBody() {
  const { ledger, updateLedger } = useLedger();
  const [query, setQuery] = useState(emptyQuery);
  const rows = useMemo(
    () => filterInbounds(ledger.inboundRecords, query, ledger.suppliers),
    [ledger.inboundRecords, ledger.suppliers, query],
  );
  const totals = queryTotals(rows);
  const nameOf = {
    supplier: (id: string) => ledger.suppliers.find((s) => s.id === id)?.name ?? id,
    item: (id: string) => ledger.items.find((s) => s.id === id)?.name ?? id,
  };

  function remove(id: string) {
    if (!confirm("確定刪除這筆進貨？")) return;
    updateLedger((current) => ({
      ...current,
      inboundRecords: current.inboundRecords.filter((row) => row.id !== id),
    }));
  }

  const summary = (
    <p className="rounded-lg bg-white px-3 py-2 text-sm">
      {totals.count} 筆 · 數量 {formatQty(totals.qtyInBase)} · 金額 {formatMoney(totals.amount)} 元
    </p>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">進貨</h1>
        <div className="flex flex-wrap gap-2">
          <ImportLedgerButton />
          <ExportDialog query={query} />
          <Link href="/inbounds/new/" className="rounded-xl bg-[#2f6f4e] px-4 py-2 text-white">
            新增進貨
          </Link>
        </div>
      </div>
      <QueryPanel query={query} onChange={setQuery} suppliers={ledger.suppliers} items={ledger.items} />
      {summary}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? <p className="text-sm text-neutral-600">沒有符合的進貨</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="font-medium">
              {formatRoc(row.date)} · {nameOf.supplier(row.supplierId)}
            </p>
            <p className="text-sm">
              {nameOf.item(row.itemId)}
              {row.grade ? `／${row.grade}` : ""}
            </p>
            <p className="text-sm">
              {formatQty(row.qty)} {UNIT_LABEL[row.unit]} · {formatMoney(row.unitPrice)} 元 · {formatMoney(row.amount)} 元
            </p>
            {row.amountOverridden ? (
              <p className="text-sm text-amber-800">
                公式 {formatMoney(row.computedAmount)}，差 {formatMoney(amountDiff(row.amount, row.computedAmount))}
              </p>
            ) : null}
            <div className="mt-2 flex gap-3 text-sm">
              <Link href={`/inbounds/edit/?id=${row.id}`}>編輯</Link>
              <button type="button" onClick={() => remove(row.id)}>
                刪除
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full border-collapse bg-white text-sm">
          <thead>
            <tr className="border-b text-left">
              {["日期", "供應商", "品項", "數量", "基準", "單價", "金額", ""].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="whitespace-nowrap px-2 py-2">{formatRoc(row.date)}</td>
                <td className="px-2 py-2">{nameOf.supplier(row.supplierId)}</td>
                <td className="px-2 py-2">
                  {nameOf.item(row.itemId)}
                  {row.grade ? `／${row.grade}` : ""}
                </td>
                <td className="px-2 py-2">
                  {formatQty(row.qty)} {UNIT_LABEL[row.unit]}
                </td>
                <td className="px-2 py-2">{formatQty(row.qtyInBase)}</td>
                <td className="px-2 py-2">{formatMoney(row.unitPrice)}</td>
                <td className="px-2 py-2">
                  {formatMoney(row.amount)}
                  {row.amountOverridden ? (
                    <span className="block text-xs text-amber-800">
                      公式 {formatMoney(row.computedAmount)} 差 {formatMoney(amountDiff(row.amount, row.computedAmount))}
                    </span>
                  ) : null}
                </td>
                <td className="px-2 py-2">
                  <Link href={`/inbounds/edit/?id=${row.id}`}>編輯</Link>{" "}
                  <button type="button" onClick={() => remove(row.id)}>
                    刪除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary}
    </div>
  );
}

export default function Page() {
  return (
    <AppShell>
      <InboundsBody />
    </AppShell>
  );
}
