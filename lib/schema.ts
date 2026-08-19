import { z } from "zod";
import type { Ledger } from "./types";

const supplierSchema = z.object({
  id: z.string(),
  name: z.string(),
  archived: z.union([z.literal(0), z.literal(1)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUnit: z.enum(["jin", "bag"]),
  archived: z.union([z.literal(0), z.literal(1)]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const conversionSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  fromUnit: z.enum(["jin", "bag", "box"]),
  toUnit: z.enum(["jin", "bag"]),
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
  unit: z.enum(["jin", "bag", "box"]),
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
  qtyInBase: z.number(),
  reason: z.enum(["stocktake", "consume", "spoilage", "other"]),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ledgerSchema: z.ZodType<Ledger> = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  suppliers: z.array(supplierSchema),
  items: z.array(itemSchema),
  unitConversions: z.array(conversionSchema),
  inboundRecords: z.array(inboundSchema),
  stockAdjustments: z.array(adjustmentSchema),
});

export function parseLedger(data: unknown): Ledger {
  return ledgerSchema.parse(data);
}
