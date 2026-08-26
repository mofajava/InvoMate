import { describe, expect, it } from "vitest";
import { InvalidDateError, rocToIso, isoToRoc } from "./calendar";
import { computedAmount } from "./money";
import { qtyInBase } from "./units";
import { createEmptyLedger, SEED_IDS } from "./seed";
import { emptyQuery, filterInbounds, queryTotals } from "./query";
import { stockBalances } from "./stock";
import type { InboundRecord, StockAdjustment } from "./types";

const yam = () => createEmptyLedger().items.find((i) => i.id === SEED_IDS.items.yam)!;
const conversions = () => createEmptyLedger().unitConversions;

describe("calendar", () => {
  it("converts ROC 114/12/4 to ISO", () => {
    expect(rocToIso(114, 12, 4)).toBe("2025-12-04");
    expect(isoToRoc("2025-12-04")).toEqual({ year: 114, month: 12, day: 4 });
  });

  it("rejects 12/38", () => {
    expect(() => rocToIso(114, 12, 38)).toThrow(InvalidDateError);
  });

  it("rejects non-leap Feb 29", () => {
    expect(() => rocToIso(114, 2, 29)).toThrow(InvalidDateError);
  });
});

describe("money", () => {
  it("computes 1308 * 45 = 58860", () => {
    expect(computedAmount(1308, 45)).toBe(58860);
  });
});

describe("units", () => {
  it("converts 50 boxes to 1666.5 jin", () => {
    expect(qtyInBase(50, "box", yam(), conversions())).toBe(1666.5);
  });

  it("converts 100 boxes to 3333 jin", () => {
    expect(qtyInBase(100, "box", yam(), conversions())).toBe(3333);
  });

  it("keeps jin as-is", () => {
    expect(qtyInBase(1308, "jin", yam(), conversions())).toBe(1308);
  });
});

function inbound(partial: Partial<InboundRecord> & Pick<InboundRecord, "id" | "amount" | "qtyInBase" | "supplierId">): InboundRecord {
  return {
    date: "2025-09-01",
    itemId: SEED_IDS.items.yam,
    grade: "",
    qty: partial.qtyInBase,
    unit: "jin",
    unitPrice: 43,
    computedAmount: partial.amount,
    amountOverridden: 0,
    note: "",
    createdAt: "2025-09-01T00:00:00.000Z",
    updatedAt: "2025-09-01T00:00:00.000Z",
    ...partial,
  };
}

describe("query", () => {
  const chen = SEED_IDS.suppliers.chen;
  const wang = SEED_IDS.suppliers.wang;
  const records: InboundRecord[] = [
    inbound({ id: "a", supplierId: chen, qtyInBase: 1308, amount: 58800, date: "2025-08-30", amountOverridden: 1 }),
    inbound({ id: "b", supplierId: chen, qtyInBase: 1275, amount: 54825, date: "2025-09-01" }),
    inbound({ id: "c", supplierId: wang, qtyInBase: 3333, amount: 180000, date: "2025-12-04" }),
  ];

  it("filters 陳美美 and totals amount", () => {
    const query = { ...emptyQuery(), supplierIds: [chen] };
    const rows = filterInbounds(records, query);
    const totals = queryTotals(rows);
    expect(totals.qtyInBase).toBe(2583);
    expect(totals.amount).toBe(113625);
  });

  it("filters amount >= 180000", () => {
    const query = { ...emptyQuery(), amountMin: 180000 };
    const rows = filterInbounds(records, query);
    expect(rows.map((r) => r.id)).toEqual(["c"]);
  });
});

describe("stock", () => {
  const ledger = createEmptyLedger();
  const inbounds: InboundRecord[] = [
    inbound({ id: "1", supplierId: SEED_IDS.suppliers.chen, qtyInBase: 10, amount: 430, itemId: SEED_IDS.items.yam }),
    inbound({ id: "2", supplierId: SEED_IDS.suppliers.chen, qtyInBase: 5, amount: 215, itemId: SEED_IDS.items.yam, grade: "醜" }),
  ];
  const adjustments: StockAdjustment[] = [
    {
      id: "adj",
      date: "2025-12-01",
      itemId: SEED_IDS.items.yam,
      grade: "",
      warehouseId: "",
      qtyInBase: -3,
      reason: "consume",
      note: "",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("adds inbounds and negative adjustment", () => {
    const rows = stockBalances(ledger.items, inbounds, adjustments);
    const normal = rows.find((r) => r.grade === "");
    const ugly = rows.find((r) => r.grade === "醜");
    expect(normal?.balance).toBe(7);
    expect(ugly?.balance).toBe(5);
  });
});
