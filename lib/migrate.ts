import { seedFinishedYam, seedWarehouses } from "./seed";
import type { Item, Ledger, StockAdjustment, UnitCode, WorkOrder, WorkOrderOutput } from "./types";
import { FINISHED_UNIT } from "./units";

type LooseWorkOrder = Omit<WorkOrder, "outputs" | "outputQty" | "outputQtyInBase"> & {
  warehouseId?: string;
  outputQty?: number;
  outputQtyInBase?: number;
  outputs?: WorkOrderOutput[];
};

type LooseLedger = {
  version?: number;
  updatedAt: string;
  suppliers: Ledger["suppliers"];
  items: Array<Omit<Item, "kind"> & { kind?: Item["kind"] }>;
  unitConversions: Ledger["unitConversions"];
  inboundRecords: Ledger["inboundRecords"];
  stockAdjustments: Array<Omit<StockAdjustment, "warehouseId"> & { warehouseId?: string }>;
  warehouses?: Ledger["warehouses"];
  customers?: Ledger["customers"];
  workOrders?: LooseWorkOrder[];
  transfers?: Ledger["transfers"];
  outboundRecords?: Ledger["outboundRecords"];
};

function rewriteFinishedUnit<T extends { unit: UnitCode }>(row: T, finishedIds: Set<string>, itemId: string): T {
  if (!finishedIds.has(itemId) || row.unit === FINISHED_UNIT) return row;
  return { ...row, unit: FINISHED_UNIT };
}

function migrateWorkOrderOutputs(row: LooseWorkOrder): WorkOrderOutput[] {
  if (row.outputs?.length) return row.outputs;
  if (!row.warehouseId) return [];
  const qty = row.outputQty ?? row.outputQtyInBase ?? 0;
  const qtyInBase = row.outputQtyInBase ?? qty;
  return [{ id: `${row.id}-out`, warehouseId: row.warehouseId, qty, qtyInBase }];
}

export function migrateToV2(input: LooseLedger): Ledger {
  const timestamp = input.updatedAt;
  const items: Item[] = input.items.map((item) => {
    const kind = item.kind ?? "raw";
    return {
      ...item,
      kind,
      baseUnit: kind === "finished" ? FINISHED_UNIT : item.baseUnit,
    };
  });
  if (!items.some((item) => item.id === seedFinishedYam(timestamp).id || item.name === "山藥成品")) {
    items.push(seedFinishedYam(timestamp));
  }
  const finishedIds = new Set(items.filter((item) => item.kind === "finished").map((item) => item.id));
  const warehouses = input.warehouses?.length ? input.warehouses : seedWarehouses(timestamp);
  const workOrders: WorkOrder[] = (input.workOrders ?? []).map((row) => {
    const outputUnit = finishedIds.has(row.outputItemId) ? FINISHED_UNIT : row.outputUnit;
    const outputs = migrateWorkOrderOutputs(row);
    const outputQty = outputs.reduce((sum, line) => sum + line.qty, 0);
    const outputQtyInBase = outputs.reduce((sum, line) => sum + line.qtyInBase, 0);
    const { warehouseId: _warehouseId, ...rest } = row;
    void _warehouseId;
    return {
      ...rest,
      outputUnit,
      outputs,
      outputQty,
      outputQtyInBase,
    };
  });
  const transfers = (input.transfers ?? []).map((row) => rewriteFinishedUnit(row, finishedIds, row.itemId));
  const outboundRecords = (input.outboundRecords ?? []).map((row) =>
    rewriteFinishedUnit(row, finishedIds, row.itemId),
  );
  return {
    version: 2,
    updatedAt: input.updatedAt,
    suppliers: input.suppliers,
    items,
    unitConversions: input.unitConversions.filter((c) => !finishedIds.has(c.itemId)),
    inboundRecords: input.inboundRecords,
    stockAdjustments: input.stockAdjustments.map((row) => ({
      ...row,
      warehouseId: row.warehouseId ?? "",
    })),
    warehouses,
    customers: input.customers ?? [],
    workOrders,
    transfers,
    outboundRecords,
  };
}
