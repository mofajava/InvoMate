import { seedFinishedYam, seedWarehouses } from "./seed";
import type { Item, Ledger, StockAdjustment } from "./types";

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
  workOrders?: Ledger["workOrders"];
  transfers?: Ledger["transfers"];
  outboundRecords?: Ledger["outboundRecords"];
};

export function migrateToV2(input: LooseLedger): Ledger {
  const timestamp = input.updatedAt;
  const items: Item[] = input.items.map((item) => ({
    ...item,
    kind: item.kind ?? "raw",
  }));
  if (!items.some((item) => item.id === seedFinishedYam(timestamp).id || item.name === "山藥成品")) {
    items.push(seedFinishedYam(timestamp));
  }
  const warehouses = input.warehouses?.length ? input.warehouses : seedWarehouses(timestamp);
  return {
    version: 2,
    updatedAt: input.updatedAt,
    suppliers: input.suppliers,
    items,
    unitConversions: input.unitConversions,
    inboundRecords: input.inboundRecords,
    stockAdjustments: input.stockAdjustments.map((row) => ({
      ...row,
      warehouseId: row.warehouseId ?? "",
    })),
    warehouses,
    customers: input.customers ?? [],
    workOrders: input.workOrders ?? [],
    transfers: input.transfers ?? [],
    outboundRecords: input.outboundRecords ?? [],
  };
}
