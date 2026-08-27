import { finishedBalances } from "./stock";
import { SEED_IDS } from "./seed";
import type { Item, Ledger } from "./types";

export const KIND_LABEL = { raw: "原料", finished: "成品" } as const;
export const AR_LABEL = { unpaid: "未收", paid: "已收" } as const;

export function defaultFinishedItemId(items: Item[]): string {
  const usable = items.filter((item) => item.kind === "finished" && !item.archived);
  return (
    usable.find((item) => item.id === SEED_IDS.items.yamFinished)?.id ??
    usable.find((item) => item.name === "山藥成品")?.id ??
    usable[0]?.id ??
    ""
  );
}

export function itemHistoryCounts(ledger: Ledger, itemId: string) {
  return {
    inbound: ledger.inboundRecords.filter((row) => row.itemId === itemId).length,
    adjustments: ledger.stockAdjustments.filter((row) => row.itemId === itemId).length,
    workOrders: ledger.workOrders.filter(
      (row) => row.outputItemId === itemId || row.consumes.some((c) => c.itemId === itemId),
    ).length,
    transfers: ledger.transfers.filter((row) => row.itemId === itemId).length,
    outbounds: ledger.outboundRecords.filter((row) => row.itemId === itemId).length,
  };
}

export function itemHasHistory(ledger: Ledger, itemId: string): boolean {
  const counts = itemHistoryCounts(ledger, itemId);
  return Object.values(counts).some((n) => n > 0);
}

export function warehouseHistoryCounts(ledger: Ledger, warehouseId: string) {
  const nonzero = finishedBalances(ledger).filter(
    (row) => row.warehouseId === warehouseId && Math.abs(row.balance) > 1e-9,
  ).length;
  return {
    workOrders: ledger.workOrders.filter((row) => row.outputs.some((line) => line.warehouseId === warehouseId)).length,
    transfers: ledger.transfers.filter(
      (row) => row.fromWarehouseId === warehouseId || row.toWarehouseId === warehouseId,
    ).length,
    outbounds: ledger.outboundRecords.filter((row) => row.warehouseId === warehouseId).length,
    adjustments: ledger.stockAdjustments.filter((row) => row.warehouseId === warehouseId).length,
    nonzeroBalances: nonzero,
  };
}

export function warehouseInUse(ledger: Ledger, warehouseId: string): boolean {
  const counts = warehouseHistoryCounts(ledger, warehouseId);
  return Object.values(counts).some((n) => n > 0);
}

export function customerOutboundCount(ledger: Ledger, customerId: string): number {
  return ledger.outboundRecords.filter((row) => row.customerId === customerId).length;
}
