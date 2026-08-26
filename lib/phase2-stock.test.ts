import { describe, expect, it } from "vitest";
import { buildInbound } from "./inbound";
import { migrateToV2 } from "./migrate";
import { buildOutbound } from "./outbound";
import { parseLedger } from "./schema";
import { createEmptyLedger, SEED_IDS } from "./seed";
import { assertNonNegativeStock, finishedBalances, rawBalances, stockBalances } from "./stock";
import { buildTransfer } from "./transfer";
import type { Ledger, WorkOrder } from "./types";

describe("migrate v1 to v2", () => {
  it("keeps inbound raw stock and seeds 永靖／田尾／山藥成品", () => {
    const v2 = createEmptyLedger();
    const v1 = {
      version: 1 as const,
      updatedAt: v2.updatedAt,
      suppliers: v2.suppliers,
      items: v2.items.filter((i) => i.kind === "raw").map((item) => {
        const { kind, ...rest } = item;
        void kind;
        return rest;
      }),
      unitConversions: v2.unitConversions,
      inboundRecords: [
        {
          id: "in1",
          date: "2025-09-01",
          supplierId: SEED_IDS.suppliers.chen,
          itemId: SEED_IDS.items.yam,
          grade: "",
          qty: 10,
          unit: "jin" as const,
          qtyInBase: 10,
          unitPrice: 43,
          computedAmount: 430,
          amount: 430,
          amountOverridden: 0 as const,
          note: "",
          createdAt: v2.updatedAt,
          updatedAt: v2.updatedAt,
        },
      ],
      stockAdjustments: [],
    };
    const migrated = migrateToV2(v1);
    expect(migrated.version).toBe(2);
    expect(migrated.warehouses.map((w) => w.name)).toEqual(expect.arrayContaining(["永靖", "田尾"]));
    expect(migrated.warehouses).toHaveLength(2);
    expect(migrated.items.some((i) => i.name === "山藥成品" && i.kind === "finished")).toBe(true);
    expect(rawBalances(migrated).find((r) => r.itemId === SEED_IDS.items.yam)?.balance).toBe(10);
    const parsed = parseLedger(v1);
    expect(stockBalances(parsed.items, parsed.inboundRecords, parsed.stockAdjustments).find((r) => r.itemId === SEED_IDS.items.yam)?.balance).toBe(10);
  });
});

function wo(partial: Partial<WorkOrder> & Pick<WorkOrder, "id" | "outputQtyInBase" | "warehouseId" | "consumes">): WorkOrder {
  return {
    date: "2025-09-02",
    outputItemId: SEED_IDS.items.yamFinished,
    outputGrade: "",
    outputQty: partial.outputQtyInBase,
    outputUnit: "jin",
    note: "",
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("phase 2 stock", () => {
  it("blocks consume beyond raw stock and allows exact use", () => {
    const base = createEmptyLedger();
    const ledger: Ledger = {
      ...base,
      inboundRecords: [
        {
          id: "in",
          date: "2025-09-01",
          supplierId: SEED_IDS.suppliers.chen,
          itemId: SEED_IDS.items.yam,
          grade: "",
          qty: 10,
          unit: "jin",
          qtyInBase: 10,
          unitPrice: 43,
          computedAmount: 430,
          amount: 430,
          amountOverridden: 0,
          note: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    const over: Ledger = {
      ...ledger,
      workOrders: [
        wo({
          id: "wo-over",
          outputQtyInBase: 8,
          warehouseId: SEED_IDS.warehouses.yongjing,
          consumes: [{ id: "c1", itemId: SEED_IDS.items.yam, grade: "", qty: 11, unit: "jin", qtyInBase: 11 }],
        }),
      ],
    };
    expect(() => assertNonNegativeStock(over)).toThrow(/原料庫存不足/);
    const ok: Ledger = {
      ...ledger,
      workOrders: [
        wo({
          id: "wo-ok",
          outputQtyInBase: 8,
          warehouseId: SEED_IDS.warehouses.yongjing,
          consumes: [{ id: "c1", itemId: SEED_IDS.items.yam, grade: "", qty: 10, unit: "jin", qtyInBase: 10 }],
        }),
      ],
    };
    expect(() => assertNonNegativeStock(ok)).not.toThrow();
    expect(rawBalances(ok).find((r) => r.itemId === SEED_IDS.items.yam)?.balance).toBe(0);
    expect(finishedBalances(ok).find((r) => r.warehouseId === SEED_IDS.warehouses.yongjing)?.balance).toBe(8);
  });

  it("transfer empties source warehouse", () => {
    const base = createEmptyLedger();
    const ledger: Ledger = {
      ...base,
      workOrders: [
        wo({
          id: "wo",
          outputQtyInBase: 8,
          warehouseId: SEED_IDS.warehouses.yongjing,
          consumes: [],
        }),
      ],
      transfers: [
        {
          id: "tr",
          date: "2025-09-03",
          itemId: SEED_IDS.items.yamFinished,
          grade: "",
          fromWarehouseId: SEED_IDS.warehouses.yongjing,
          toWarehouseId: SEED_IDS.warehouses.tianwei,
          qty: 8,
          unit: "jin",
          qtyInBase: 8,
          note: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    expect(() => assertNonNegativeStock(ledger)).not.toThrow();
    const rows = finishedBalances(ledger);
    expect(rows.find((r) => r.warehouseId === SEED_IDS.warehouses.yongjing)?.balance).toBe(0);
    expect(rows.find((r) => r.warehouseId === SEED_IDS.warehouses.tianwei)?.balance).toBe(8);
    const overShip: Ledger = {
      ...ledger,
      outboundRecords: [
        {
          id: "out",
          date: "2025-09-04",
          customerId: "c",
          itemId: SEED_IDS.items.yamFinished,
          grade: "",
          warehouseId: SEED_IDS.warehouses.yongjing,
          qty: 1,
          unit: "jin",
          qtyInBase: 1,
          unitPrice: 80,
          computedAmount: 80,
          amount: 80,
          amountOverridden: 0,
          arStatus: "unpaid",
          note: "",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    expect(() => assertNonNegativeStock(overShip)).toThrow(/成品庫存不足/);
  });
});

describe("phase 2 builders", () => {
  it("rejects inbound of finished goods and outbound of raw", () => {
    const ledger = createEmptyLedger();
    expect(() =>
      buildInbound({
        id: "x",
        date: "2025-09-01",
        supplierId: SEED_IDS.suppliers.chen,
        itemId: SEED_IDS.items.yamFinished,
        grade: "",
        qty: 1,
        unit: "jin",
        unitPrice: 1,
        note: "",
        ledger,
      }),
    ).toThrow(/進貨只能選原料/);
    expect(() =>
      buildOutbound({
        id: "x",
        date: "2025-09-01",
        customerId: "c",
        itemId: SEED_IDS.items.yam,
        grade: "",
        warehouseId: SEED_IDS.warehouses.yongjing,
        qty: 1,
        unit: "jin",
        unitPrice: 1,
        arStatus: "unpaid",
        note: "",
        ledger,
      }),
    ).toThrow(/出貨只能選成品/);
  });

  it("rejects transfer with the same warehouse", () => {
    const ledger = createEmptyLedger();
    expect(() =>
      buildTransfer({
        id: "x",
        date: "2025-09-01",
        itemId: SEED_IDS.items.yamFinished,
        grade: "",
        fromWarehouseId: SEED_IDS.warehouses.yongjing,
        toWarehouseId: SEED_IDS.warehouses.yongjing,
        qty: 1,
        unit: "jin",
        note: "",
        ledger,
      }),
    ).toThrow(/來源倉與目的倉不可相同/);
  });
});
