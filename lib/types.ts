export type BaseUnit = "jin" | "bag";
export type UnitCode = BaseUnit | "box";
export type AdjustmentReason = "stocktake" | "consume" | "spoilage" | "other";
export type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";
export type ItemKind = "raw" | "finished";
export type ArStatus = "unpaid" | "paid";

export type NamedMaster = {
  id: string;
  name: string;
  archived: 0 | 1;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = NamedMaster;
export type Customer = NamedMaster;
export type Warehouse = NamedMaster;

export type Item = {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  kind: ItemKind;
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
  warehouseId: string;
  qtyInBase: number;
  reason: AdjustmentReason;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkOrderConsume = {
  id: string;
  itemId: string;
  grade: string;
  qty: number;
  unit: UnitCode;
  qtyInBase: number;
};

export type WorkOrder = {
  id: string;
  date: string;
  outputItemId: string;
  outputGrade: string;
  outputQty: number;
  outputUnit: UnitCode;
  outputQtyInBase: number;
  warehouseId: string;
  consumes: WorkOrderConsume[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Transfer = {
  id: string;
  date: string;
  itemId: string;
  grade: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  qty: number;
  unit: UnitCode;
  qtyInBase: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type OutboundRecord = {
  id: string;
  date: string;
  customerId: string;
  itemId: string;
  grade: string;
  warehouseId: string;
  qty: number;
  unit: UnitCode;
  qtyInBase: number;
  unitPrice: number;
  computedAmount: number;
  amount: number;
  amountOverridden: 0 | 1;
  arStatus: ArStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Ledger = {
  version: 2;
  updatedAt: string;
  suppliers: Supplier[];
  items: Item[];
  unitConversions: UnitConversion[];
  inboundRecords: InboundRecord[];
  stockAdjustments: StockAdjustment[];
  warehouses: Warehouse[];
  customers: Customer[];
  workOrders: WorkOrder[];
  transfers: Transfer[];
  outboundRecords: OutboundRecord[];
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

export type OutboundQuery = {
  customerIds: string[];
  itemIds: string[];
  warehouseIds: string[];
  dateFrom: string | null;
  dateTo: string | null;
  arStatus: ArStatus | null;
  amountMin: number | null;
  amountMax: number | null;
  noteKeyword: string;
  sortField: "date" | "amount";
  sortDir: QuerySortDir;
};
