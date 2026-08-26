import type { Ledger, Transfer, UnitCode } from "./types";
import { qtyInBase } from "./units";

export function buildTransfer(input: {
  id: string;
  date: string;
  itemId: string;
  grade: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qty: number;
  unit: UnitCode;
  note: string;
  ledger: Ledger;
  now?: string;
}): Transfer {
  const item = input.ledger.items.find((row) => row.id === input.itemId);
  if (!item) throw new Error("找不到品項");
  if (item.kind !== "finished") throw new Error("調撥只能選成品");
  if (!input.fromWarehouseId || !input.toWarehouseId) throw new Error("請選來源倉與目的倉");
  if (input.fromWarehouseId === input.toWarehouseId) throw new Error("來源倉與目的倉不可相同");
  if (!Number.isFinite(input.qty) || input.qty <= 0) throw new Error("數量須大於 0");
  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    date: input.date,
    itemId: input.itemId,
    grade: input.grade,
    fromWarehouseId: input.fromWarehouseId,
    toWarehouseId: input.toWarehouseId,
    qty: input.qty,
    unit: input.unit,
    qtyInBase: qtyInBase(input.qty, input.unit, item, input.ledger.unitConversions),
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
