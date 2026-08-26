import type { Ledger, UnitCode, WorkOrder } from "./types";
import { qtyInBase } from "./units";

export function buildWorkOrder(input: {
  id: string;
  date: string;
  outputItemId: string;
  outputGrade: string;
  outputQty: number;
  outputUnit: UnitCode;
  warehouseId: string;
  consumes: Array<{
    id: string;
    itemId: string;
    grade: string;
    qty: number;
    unit: UnitCode;
  }>;
  note: string;
  ledger: Ledger;
  now?: string;
}): WorkOrder {
  const output = input.ledger.items.find((row) => row.id === input.outputItemId);
  if (!output) throw new Error("找不到成品品項");
  if (output.kind !== "finished") throw new Error("加工產出只能選成品");
  if (!input.warehouseId) throw new Error("請選入庫倉");
  if (!Number.isFinite(input.outputQty) || input.outputQty <= 0) throw new Error("產量須大於 0");
  if (input.consumes.length < 1) throw new Error("至少一筆耗用");

  const consumes = input.consumes.map((row) => {
    const item = input.ledger.items.find((i) => i.id === row.itemId);
    if (!item) throw new Error("找不到耗用品項");
    if (item.kind !== "raw") throw new Error("加工耗用只能選原料");
    if (!Number.isFinite(row.qty) || row.qty <= 0) throw new Error("耗用數量須大於 0");
    return {
      id: row.id,
      itemId: row.itemId,
      grade: row.grade,
      qty: row.qty,
      unit: row.unit,
      qtyInBase: qtyInBase(row.qty, row.unit, item, input.ledger.unitConversions),
    };
  });

  const timestamp = input.now ?? new Date().toISOString();
  return {
    id: input.id,
    date: input.date,
    outputItemId: input.outputItemId,
    outputGrade: input.outputGrade,
    outputQty: input.outputQty,
    outputUnit: input.outputUnit,
    outputQtyInBase: qtyInBase(input.outputQty, input.outputUnit, output, input.ledger.unitConversions),
    warehouseId: input.warehouseId,
    consumes,
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
