import type { Customer, OutboundQuery, OutboundRecord } from "./types";

export const emptyOutboundQuery = (): OutboundQuery => ({
  customerIds: [],
  itemIds: [],
  warehouseIds: [],
  dateFrom: null,
  dateTo: null,
  arStatus: null,
  amountMin: null,
  amountMax: null,
  noteKeyword: "",
  sortField: "date",
  sortDir: "desc",
});

export function isOutboundQueryActive(query: OutboundQuery): boolean {
  return (
    query.customerIds.length > 0 ||
    query.itemIds.length > 0 ||
    query.warehouseIds.length > 0 ||
    query.dateFrom !== null ||
    query.dateTo !== null ||
    query.arStatus !== null ||
    query.amountMin !== null ||
    query.amountMax !== null ||
    query.noteKeyword.trim() !== ""
  );
}

export function filterOutbounds(
  records: OutboundRecord[],
  query: OutboundQuery,
  customers: Customer[] = [],
): OutboundRecord[] {
  const keyword = query.noteKeyword.trim().toLowerCase();
  const names = new Map(customers.map((s) => [s.id, s.name]));
  const filtered = records.filter((row) => {
    if (query.customerIds.length && !query.customerIds.includes(row.customerId)) return false;
    if (query.itemIds.length && !query.itemIds.includes(row.itemId)) return false;
    if (query.warehouseIds.length && !query.warehouseIds.includes(row.warehouseId)) return false;
    if (query.dateFrom && row.date < query.dateFrom) return false;
    if (query.dateTo && row.date > query.dateTo) return false;
    if (query.arStatus && row.arStatus !== query.arStatus) return false;
    if (query.amountMin !== null && row.amount < query.amountMin) return false;
    if (query.amountMax !== null && row.amount > query.amountMax) return false;
    if (keyword && !row.note.toLowerCase().includes(keyword)) return false;
    return true;
  });
  const dir = query.sortDir === "asc" ? 1 : -1;
  return [...filtered].sort((a, b) => {
    let cmp = 0;
    if (query.sortField === "date") cmp = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
    if (query.sortField === "amount") cmp = a.amount - b.amount;
    if (cmp !== 0) return cmp * dir;
    return (names.get(a.customerId) ?? "").localeCompare(names.get(b.customerId) ?? "", "zh-Hant") * dir;
  });
}
