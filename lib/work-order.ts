import type { Ledger, UnitCode, WorkOrder, WorkOrderOutput } from "./types";
import { qtyInBase } from "./units";

export function buildWorkOrder(input: {
  id: string;
  date: string;
  outputItemId: string;
  outputGrade: string;
  outputs: Array<{
    id: string;
    warehouseId: string;
    qty: number;
  }>;
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
  if (input.consumes.length < 1) throw new Error("至少一筆耗用");
  if (input.outputs.length < 1) throw new Error("請至少填一個倉的桶數");

  const seen = new Set<string>();
  const outputs: WorkOrderOutput[] = input.outputs.map((row, index) => {
    if (!row.warehouseId) throw new Error(`入庫 ${index + 1} 請選倉`);
    if (seen.has(row.warehouseId)) throw new Error("同一倉請合併成一列，不要重複選");
    seen.add(row.warehouseId);
    if (!Number.isFinite(row.qty) || row.qty <= 0) throw new Error(`入庫 ${index + 1} 數量須大於 0`);
    return {
      id: row.id,
      warehouseId: row.warehouseId,
      qty: row.qty,
      qtyInBase: qtyInBase(row.qty, output.baseUnit, output, input.ledger.unitConversions),
    };
  });

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
    outputUnit: output.baseUnit,
    outputQty: outputs.reduce((sum, line) => sum + line.qty, 0),
    outputQtyInBase: outputs.reduce((sum, line) => sum + line.qtyInBase, 0),
    outputs,
    consumes,
    note: input.note,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
