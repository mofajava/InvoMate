import type { InboundRecord, Item, Ledger, StockAdjustment, Warehouse } from "./types";

export type StockRow = {
  itemId: string;
  itemName: string;
  grade: string;
  baseUnit: Item["baseUnit"];
  balance: number;
};

export type FinishedStockRow = StockRow & {
  warehouseId: string;
  warehouseName: string;
};

export function stockKey(itemId: string, grade: string): string {
  return `${itemId}\0${grade}`;
}

export function finishedStockKey(itemId: string, grade: string, warehouseId: string): string {
  return `${itemId}\0${grade}\0${warehouseId}`;
}

function itemMap(items: Item[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function warehouseMap(warehouses: Warehouse[]) {
  return new Map(warehouses.map((row) => [row.id, row]));
}

/** Phase 1 相容：原料進貨＋調整，不含加工耗用。 */
export function stockBalances(
  items: Item[],
  inbounds: InboundRecord[],
  adjustments: StockAdjustment[],
): StockRow[] {
  return rawBalances({
    items,
    inboundRecords: inbounds,
    stockAdjustments: adjustments,
    workOrders: [],
  } as Pick<Ledger, "items" | "inboundRecords" | "stockAdjustments" | "workOrders">);
}

export function rawBalances(
  ledger: Pick<Ledger, "items" | "inboundRecords" | "stockAdjustments" | "workOrders">,
): StockRow[] {
  const map = new Map<string, number>();
  for (const row of ledger.inboundRecords) {
    const key = stockKey(row.itemId, row.grade);
    map.set(key, (map.get(key) ?? 0) + row.qtyInBase);
  }
  for (const row of ledger.stockAdjustments) {
    const item = ledger.items.find((i) => i.id === row.itemId);
    if (item?.kind === "finished") continue;
    const key = stockKey(row.itemId, row.grade);
    map.set(key, (map.get(key) ?? 0) + row.qtyInBase);
  }
  for (const order of ledger.workOrders) {
    for (const consume of order.consumes) {
      const key = stockKey(consume.itemId, consume.grade);
      map.set(key, (map.get(key) ?? 0) - consume.qtyInBase);
    }
  }
  const byId = itemMap(ledger.items);
  return [...map.entries()]
    .map(([key, balance]) => {
      const [itemId, grade] = key.split("\0");
      const item = byId.get(itemId);
      return {
        itemId,
        itemName: item?.name ?? "（已刪除品項）",
        grade,
        baseUnit: item?.baseUnit ?? "jin",
        balance,
      };
    })
    .filter((row) => byId.get(row.itemId)?.kind !== "finished")
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "zh-Hant") || a.grade.localeCompare(b.grade, "zh-Hant"));
}

export function finishedBalances(ledger: Ledger): FinishedStockRow[] {
  const map = new Map<string, number>();
  const bump = (itemId: string, grade: string, warehouseId: string, qty: number) => {
    if (!warehouseId) return;
    const key = finishedStockKey(itemId, grade, warehouseId);
    map.set(key, (map.get(key) ?? 0) + qty);
  };
  for (const order of ledger.workOrders) {
    bump(order.outputItemId, order.outputGrade, order.warehouseId, order.outputQtyInBase);
  }
  for (const row of ledger.transfers) {
    bump(row.itemId, row.grade, row.toWarehouseId, row.qtyInBase);
    bump(row.itemId, row.grade, row.fromWarehouseId, -row.qtyInBase);
  }
  for (const row of ledger.outboundRecords) {
    bump(row.itemId, row.grade, row.warehouseId, -row.qtyInBase);
  }
  for (const row of ledger.stockAdjustments) {
    const item = ledger.items.find((i) => i.id === row.itemId);
    if (item?.kind !== "finished") continue;
    bump(row.itemId, row.grade, row.warehouseId, row.qtyInBase);
  }
  const byItem = itemMap(ledger.items);
  const byWh = warehouseMap(ledger.warehouses);
  return [...map.entries()]
    .map(([key, balance]) => {
      const [itemId, grade, warehouseId] = key.split("\0");
      const item = byItem.get(itemId);
      return {
        itemId,
        itemName: item?.name ?? "（已刪除品項）",
        grade,
        warehouseId,
        warehouseName: byWh.get(warehouseId)?.name ?? "（已刪除倉）",
        baseUnit: item?.baseUnit ?? "jin",
        balance,
      };
    })
    .sort(
      (a, b) =>
        a.itemName.localeCompare(b.itemName, "zh-Hant") ||
        a.warehouseName.localeCompare(b.warehouseName, "zh-Hant") ||
        a.grade.localeCompare(b.grade, "zh-Hant"),
    );
}

export function assertNonNegativeStock(ledger: Ledger): void {
  for (const row of rawBalances(ledger)) {
    if (row.balance < -1e-9) {
      const grade = row.grade ? `／${row.grade}` : "";
      throw new Error(`原料庫存不足：${row.itemName}${grade}（餘額 ${row.balance}）`);
    }
  }
  for (const row of finishedBalances(ledger)) {
    if (row.balance < -1e-9) {
      const grade = row.grade ? `／${row.grade}` : "";
      throw new Error(`成品庫存不足：${row.itemName}${grade} @ ${row.warehouseName}（餘額 ${row.balance}）`);
    }
  }
}
