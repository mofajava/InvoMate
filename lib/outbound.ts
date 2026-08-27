import { computedAmount, isAmountOverridden } from "./money";
import type { Ledger, OutboundRecord, UnitCode } from "./types";
import { qtyInBase } from "./units";

export function lastOutboundPrice(
  records: OutboundRecord[],
  customerId: string,
  itemId: string,
  grade: string,
): { unitPrice: number; unit: UnitCode } | null {
  const matches = records
    .filter((row) => row.customerId === customerId && row.itemId === itemId && row.grade === grade)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const last = matches[0];
  if (!last) return null;
  return { unitPrice: last.unitPrice, unit: last.unit };
}

export function buildOutbound(input: {
  id: string;
  date: string;
  customerId: string;
  itemId: string;
  grade: string;
  warehouseId: string;
  qty: number;
  unit: UnitCode;
  unitPrice: number;
  amount?: number;
  arStatus: OutboundRecord["arStatus"];
  note: string;
  ledger: Ledger;
  now?: string;
}): OutboundRecord {
  const item = input.ledger.items.find((row) => row.id === input.itemId);
  if (!item) throw new Error("找不到品項");
  if (item.kind !== "finished") throw new Error("出貨只能選成品");
  const computed = computedAmount(input.qty, input.unitPrice);
  const amount = input.amount ?? computed;
  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    date: input.date,
    customerId: input.customerId,
    itemId: input.itemId,
    grade: input.grade,
    warehouseId: input.warehouseId,
    qty: input.qty,
    unit: item.baseUnit,
    qtyInBase: qtyInBase(input.qty, item.baseUnit, item, input.ledger.unitConversions),
    unitPrice: input.unitPrice,
    computedAmount: computed,
    amount,
    amountOverridden: isAmountOverridden(amount, computed),
    arStatus: input.arStatus,
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
