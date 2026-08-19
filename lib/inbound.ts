import { computedAmount, isAmountOverridden } from "./money";
import type { InboundRecord, Item, Ledger, UnitCode } from "./types";
import { qtyInBase } from "./units";

export function lastPrice(
  records: InboundRecord[],
  supplierId: string,
  itemId: string,
  grade: string,
): { unitPrice: number; unit: UnitCode } | null {
  const matches = records
    .filter((row) => row.supplierId === supplierId && row.itemId === itemId && row.grade === grade)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const last = matches[0];
  if (!last) return null;
  return { unitPrice: last.unitPrice, unit: last.unit };
}

export function buildInbound(input: {
  id: string;
  date: string;
  supplierId: string;
  itemId: string;
  grade: string;
  qty: number;
  unit: UnitCode;
  unitPrice: number;
  amount?: number;
  note: string;
  ledger: Ledger;
  now?: string;
}): InboundRecord {
  const item = input.ledger.items.find((row) => row.id === input.itemId);
  if (!item) throw new Error("找不到品項");
  const computed = computedAmount(input.qty, input.unitPrice);
  const amount = input.amount ?? computed;
  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    date: input.date,
    supplierId: input.supplierId,
    itemId: input.itemId,
    grade: input.grade,
    qty: input.qty,
    unit: input.unit,
    qtyInBase: qtyInBase(input.qty, input.unit, item, input.ledger.unitConversions),
    unitPrice: input.unitPrice,
    computedAmount: computed,
    amount,
    amountOverridden: isAmountOverridden(amount, computed),
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function findItem(ledger: Ledger, itemId: string): Item | undefined {
  return ledger.items.find((item) => item.id === itemId);
}
