import type { InboundQuery, InboundRecord, Supplier } from "./types";

export const emptyQuery = (): InboundQuery => ({
  supplierIds: [],
  itemIds: [],
  grade: null,
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  qtyMin: null,
  qtyMax: null,
  unitPriceMin: null,
  unitPriceMax: null,
  noteKeyword: "",
  overriddenOnly: false,
  sortField: "date",
  sortDir: "desc",
});

export function isQueryActive(query: InboundQuery): boolean {
  return (
    query.supplierIds.length > 0 ||
    query.itemIds.length > 0 ||
    query.grade !== null ||
    query.dateFrom !== null ||
    query.dateTo !== null ||
    query.amountMin !== null ||
    query.amountMax !== null ||
    query.qtyMin !== null ||
    query.qtyMax !== null ||
    query.unitPriceMin !== null ||
    query.unitPriceMax !== null ||
    query.noteKeyword.trim() !== "" ||
    query.overriddenOnly
  );
}

export function filterInbounds(
  records: InboundRecord[],
  query: InboundQuery,
  suppliers: Supplier[] = [],
): InboundRecord[] {
  const keyword = query.noteKeyword.trim().toLowerCase();
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));
  const filtered = records.filter((row) => {
    if (query.supplierIds.length > 0 && !query.supplierIds.includes(row.supplierId)) return false;
    if (query.itemIds.length > 0 && !query.itemIds.includes(row.itemId)) return false;
    if (query.grade !== null && row.grade !== query.grade) return false;
    if (query.dateFrom && row.date < query.dateFrom) return false;
    if (query.dateTo && row.date > query.dateTo) return false;
    if (query.amountMin !== null && row.amount < query.amountMin) return false;
    if (query.amountMax !== null && row.amount > query.amountMax) return false;
    if (query.qtyMin !== null && row.qtyInBase < query.qtyMin) return false;
    if (query.qtyMax !== null && row.qtyInBase > query.qtyMax) return false;
    if (query.unitPriceMin !== null && row.unitPrice < query.unitPriceMin) return false;
    if (query.unitPriceMax !== null && row.unitPrice > query.unitPriceMax) return false;
    if (keyword && !row.note.toLowerCase().includes(keyword)) return false;
    if (query.overriddenOnly && row.amountOverridden !== 1) return false;
    return true;
  });

  const dir = query.sortDir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    let cmp = 0;
    if (query.sortField === "date") cmp = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
    if (query.sortField === "amount") cmp = a.amount - b.amount;
    if (query.sortField === "qtyInBase") cmp = a.qtyInBase - b.qtyInBase;
    if (query.sortField === "supplier") {
      cmp = (supplierName.get(a.supplierId) ?? "").localeCompare(
        supplierName.get(b.supplierId) ?? "",
        "zh-Hant",
      );
    }
    if (cmp !== 0) return cmp * dir;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function queryTotals(records: InboundRecord[]): {
  count: number;
  qtyInBase: number;
  amount: number;
} {
  return records.reduce(
    (acc, row) => {
      acc.count += 1;
      acc.qtyInBase += row.qtyInBase;
      acc.amount += row.amount;
      return acc;
    },
    { count: 0, qtyInBase: 0, amount: 0 },
  );
}
