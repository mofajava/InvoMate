import type { InboundRecord, Item, StockAdjustment } from "./types";

export type StockRow = {
  itemId: string;
  itemName: string;
  grade: string;
  baseUnit: Item["baseUnit"];
  balance: number;
};

export function stockKey(itemId: string, grade: string): string {
  return `${itemId}\0${grade}`;
}

export function stockBalances(
  items: Item[],
  inbounds: InboundRecord[],
  adjustments: StockAdjustment[],
): StockRow[] {
  const map = new Map<string, number>();
  for (const row of inbounds) {
    const key = stockKey(row.itemId, row.grade);
    map.set(key, (map.get(key) ?? 0) + row.qtyInBase);
  }
  for (const row of adjustments) {
    const key = stockKey(row.itemId, row.grade);
    map.set(key, (map.get(key) ?? 0) + row.qtyInBase);
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  return [...map.entries()]
    .map(([key, balance]) => {
      const [itemId, grade] = key.split("\0");
      const item = itemById.get(itemId);
      return {
        itemId,
        itemName: item?.name ?? "（已刪除品項）",
        grade,
        baseUnit: item?.baseUnit ?? "jin",
        balance,
      };
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName, "zh-Hant") || a.grade.localeCompare(b.grade, "zh-Hant"));
}
