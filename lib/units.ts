import type { BaseUnit, Item, UnitCode, UnitConversion } from "./types";

export const UNIT_LABEL: Record<UnitCode, string> = {
  jin: "斤",
  bag: "包",
  box: "箱",
  barrel: "桶",
};

/** 成品庫存、加工產出、調撥、出貨都以桶為基準。 */
export const FINISHED_UNIT: BaseUnit = "barrel";

export class UnitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitError";
  }
}

export function qtyInBase(
  qty: number,
  unit: UnitCode,
  item: Item,
  conversions: UnitConversion[],
): number {
  if (unit === item.baseUnit) return qty;
  const conversion = conversions.find(
    (c) => c.itemId === item.id && c.fromUnit === unit && c.toUnit === item.baseUnit,
  );
  if (!conversion) {
    throw new UnitError("沒有對應的單位換算");
  }
  return qty * (conversion.toQty / conversion.fromQty);
}

export function allowedUnits(item: Item, conversions: UnitConversion[]): UnitCode[] {
  const extra = conversions
    .filter((c) => c.itemId === item.id)
    .map((c) => c.fromUnit);
  return [item.baseUnit, ...extra];
}

export function conversionSummary(item: Item, conversions: UnitConversion[]): string {
  const list = conversions.filter((c) => c.itemId === item.id);
  if (list.length === 0) return "無輔助單位";
  return list
    .map(
      (c) =>
        `${c.fromQty} ${UNIT_LABEL[c.fromUnit]} = ${c.toQty} ${UNIT_LABEL[c.toUnit]}`,
    )
    .join("、");
}
