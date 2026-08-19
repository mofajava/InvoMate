"use client";

import { formatRoc } from "@/lib/calendar";
import { formatMoney, formatQty } from "@/lib/money";
import { stockBalances } from "@/lib/stock";
import type { InboundQuery, Ledger } from "@/lib/types";
import { UNIT_LABEL } from "@/lib/units";
import { filterInbounds, queryTotals } from "@/lib/query";
import * as XLSX from "xlsx";

export function buildWorkbook(ledger: Ledger, query: InboundQuery, useFilter: boolean) {
  const rows = useFilter ? filterInbounds(ledger.inboundRecords, query, ledger.suppliers) : [...ledger.inboundRecords];
  const totals = queryTotals(rows);
  const supplierName = (id: string) => ledger.suppliers.find((s) => s.id === id)?.name ?? id;
  const itemName = (id: string) => ledger.items.find((i) => i.id === id)?.name ?? id;

  const inboundSheet = [
    ["民國日期", "ISO日期", "供應商", "品項", "品級", "數量", "單位", "基準數量", "單價", "公式金額", "金額", "覆寫", "備註"],
    ...rows.map((row) => [
      formatRoc(row.date),
      row.date,
      supplierName(row.supplierId),
      itemName(row.itemId),
      row.grade || "未分級",
      row.qty,
      UNIT_LABEL[row.unit],
      row.qtyInBase,
      row.unitPrice,
      row.computedAmount,
      row.amount,
      row.amountOverridden ? "是" : "",
      row.note,
    ]),
    [],
    ["小計筆數", totals.count, "基準數量", totals.qtyInBase, "金額", totals.amount],
  ];

  const stock = stockBalances(ledger.items, ledger.inboundRecords, ledger.stockAdjustments);
  const stockSheet = [
    ["品項", "品級", "基準單位", "餘額"],
    ...stock.map((row) => [row.itemName, row.grade || "未分級", UNIT_LABEL[row.baseUnit], row.balance]),
  ];

  const adjSheet = [
    ["民國日期", "ISO日期", "品項", "品級", "增減量", "原因", "備註"],
    ...ledger.stockAdjustments.map((row) => [
      formatRoc(row.date),
      row.date,
      itemName(row.itemId),
      row.grade || "未分級",
      row.qtyInBase,
      row.reason,
      row.note,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inboundSheet), "進貨");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockSheet), "庫存");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adjSheet), "調整");
  const array = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return { blob: new Blob([array], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), totals, rows };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildPdfBlob(ledger: Ledger, query: InboundQuery, useFilter: boolean): Promise<Blob> {
  const { rows, totals } = buildWorkbook(ledger, query, useFilter);
  const stock = stockBalances(ledger.items, ledger.inboundRecords, ledger.stockAdjustments);
  const supplierName = (id: string) => ledger.suppliers.find((s) => s.id === id)?.name ?? id;
  const itemName = (id: string) => ledger.items.find((i) => i.id === id)?.name ?? id;

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "800px";
  host.style.background = "white";
  host.style.color = "black";
  host.style.fontFamily = '"Noto Sans TC", sans-serif';
  host.style.padding = "24px";
  host.innerHTML = `
    <h1 style="font-size:20px;">InvoMate 進貨帳</h1>
    <p>筆數 ${totals.count}　基準數量 ${formatQty(totals.qtyInBase)}　金額 ${formatMoney(totals.amount)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr>
          ${["日期", "供應商", "品項", "數量", "金額"].map((h) => `<th style="border:1px solid #ccc;padding:4px;">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `<tr>
              <td style="border:1px solid #ccc;padding:4px;">${formatRoc(row.date)}</td>
              <td style="border:1px solid #ccc;padding:4px;">${supplierName(row.supplierId)}</td>
              <td style="border:1px solid #ccc;padding:4px;">${itemName(row.itemId)}${row.grade ? "／" + row.grade : ""}</td>
              <td style="border:1px solid #ccc;padding:4px;">${formatQty(row.qty)}${UNIT_LABEL[row.unit]}</td>
              <td style="border:1px solid #ccc;padding:4px;">${formatMoney(row.amount)}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
    <h2 style="font-size:16px;margin-top:16px;">庫存</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <tbody>
        ${stock
          .map(
            (row) => `<tr>
              <td style="border:1px solid #ccc;padding:4px;">${row.itemName}</td>
              <td style="border:1px solid #ccc;padding:4px;">${row.grade || "未分級"}</td>
              <td style="border:1px solid #ccc;padding:4px;">${formatQty(row.balance)} ${UNIT_LABEL[row.baseUnit]}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
  document.body.appendChild(host);
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(host, { scale: 2, useCORS: true });
  document.body.removeChild(host);
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  return pdf.output("blob");
}

export function exportFilename(ext: "xlsx" | "pdf"): string {
  const now = new Date();
  const roc = now.getFullYear() - 1911;
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hm = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `進貨帳_${roc}-${m}-${d}_${hm}.${ext}`;
}
