export type BaseUnit = "jin" | "bag";
export type UnitCode = BaseUnit | "box";
export type AdjustmentReason = "stocktake" | "consume" | "spoilage" | "other";
export type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

export type Supplier = {
  id: string;
  name: string;
  archived: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export type Item = {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  archived: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export type UnitConversion = {
  id: string;
  itemId: string;
  fromUnit: UnitCode;
  toUnit: BaseUnit;
  fromQty: number;
  toQty: number;
};

export type InboundRecord = {
  id: string;
  date: string;
  supplierId: string;
  itemId: string;
  grade: string;
  qty: number;
  unit: UnitCode;
  qtyInBase: number;
  unitPrice: number;
  computedAmount: number;
  amount: number;
  amountOverridden: 0 | 1;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type StockAdjustment = {
  id: string;
  date: string;
  itemId: string;
  grade: string;
  qtyInBase: number;
  reason: AdjustmentReason;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Ledger = {
  version: 1;
  updatedAt: string;
  suppliers: Supplier[];
  items: Item[];
  unitConversions: UnitConversion[];
  inboundRecords: InboundRecord[];
  stockAdjustments: StockAdjustment[];
};

export type QuerySortField = "date" | "amount" | "qtyInBase" | "supplier";
export type QuerySortDir = "asc" | "desc";

export type InboundQuery = {
  supplierIds: string[];
  itemIds: string[];
  grade: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
  qtyMin: number | null;
  qtyMax: number | null;
  unitPriceMin: number | null;
  unitPriceMax: number | null;
  noteKeyword: string;
  overriddenOnly: boolean;
  sortField: QuerySortField;
  sortDir: QuerySortDir;
};
