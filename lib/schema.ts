import { z } from "zod";
import { migrateToV2 } from "./migrate";
import type { Ledger } from "./types";

const namedSchema = z.object({
  id: z.string(),
  name: z.string(),
  archived: z.union([z.literal(0), z.literal(1)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUnit: z.enum(["jin", "bag", "barrel"]),
  kind: z.enum(["raw", "finished"]).optional(),
  archived: z.union([z.literal(0), z.literal(1)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const conversionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  fromUnit: z.enum(["jin", "bag", "box", "barrel"]),
  toUnit: z.enum(["jin", "bag", "barrel"]),
  fromQty: z.number().positive(),
  toQty: z.number().positive(),
});

const inboundSchema = z.object({
  id: z.string(),
  date: z.string(),
  supplierId: z.string(),
  itemId: z.string(),
  grade: z.string(),
  qty: z.number(),
  unit: z.enum(["jin", "bag", "box", "barrel"]),
  qtyInBase: z.number(),
  unitPrice: z.number(),
  computedAmount: z.number(),
  amount: z.number(),
  amountOverridden: z.union([z.literal(0), z.literal(1)]),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const adjustmentSchema = z.object({
  id: z.string(),
  date: z.string(),
  itemId: z.string(),
  grade: z.string(),
  warehouseId: z.string().optional(),
  qtyInBase: z.number(),
  reason: z.enum(["stocktake", "consume", "spoilage", "other"]),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const consumeSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  grade: z.string(),
  qty: z.number(),
  unit: z.enum(["jin", "bag", "box", "barrel"]),
  qtyInBase: z.number(),
});

const workOrderOutputSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  qty: z.number(),
  qtyInBase: z.number(),
});

const workOrderSchema = z.object({
  id: z.string(),
  date: z.string(),
  outputItemId: z.string(),
  outputGrade: z.string(),
  outputQty: z.number().optional(),
  outputUnit: z.enum(["jin", "bag", "box", "barrel"]),
  outputQtyInBase: z.number().optional(),
  warehouseId: z.string().optional(),
  outputs: z.array(workOrderOutputSchema).optional(),
  consumes: z.array(consumeSchema),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const transferSchema = z.object({
  id: z.string(),
  date: z.string(),
  itemId: z.string(),
  grade: z.string(),
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  qty: z.number(),
  unit: z.enum(["jin", "bag", "box", "barrel"]),
  qtyInBase: z.number(),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const outboundSchema = z.object({
  id: z.string(),
  date: z.string(),
  customerId: z.string(),
  itemId: z.string(),
  grade: z.string(),
  warehouseId: z.string(),
  qty: z.number(),
  unit: z.enum(["jin", "bag", "box", "barrel"]),
  qtyInBase: z.number(),
  unitPrice: z.number(),
  computedAmount: z.number(),
  amount: z.number(),
  amountOverridden: z.union([z.literal(0), z.literal(1)]),
  arStatus: z.enum(["unpaid", "paid"]),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const looseLedgerSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  updatedAt: z.string(),
  suppliers: z.array(namedSchema),
  items: z.array(itemSchema),
  unitConversions: z.array(conversionSchema),
  inboundRecords: z.array(inboundSchema),
  stockAdjustments: z.array(adjustmentSchema),
  warehouses: z.array(namedSchema).optional(),
  customers: z.array(namedSchema).optional(),
  workOrders: z.array(workOrderSchema).optional(),
  transfers: z.array(transferSchema).optional(),
  outboundRecords: z.array(outboundSchema).optional(),
});

export function parseLedger(data: unknown): Ledger {
  return migrateToV2(looseLedgerSchema.parse(data));
}
