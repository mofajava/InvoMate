import { describe, expect, it } from "vitest";
import { buildLedgerFromHandNotes } from "./hand-ledger";
import { parseLedger } from "./schema";
import { SEED_IDS } from "./seed";
import { emptyQuery, filterInbounds, queryTotals } from "./query";
import { stockBalances } from "./stock";

describe("hand ledger from data.txt", () => {
  const ledger = buildLedgerFromHandNotes();

  it("parses as ledger schema", () => {
    expect(() => parseLedger(ledger)).not.toThrow();
  });

  it("matches 陳美美 15909 斤 / 686643 元", () => {
    const rows = filterInbounds(ledger.inboundRecords, {
      ...emptyQuery(),
      supplierIds: [SEED_IDS.suppliers.chen],
    });
    const totals = queryTotals(rows);
    expect(rows).toHaveLength(14);
    expect(totals.qtyInBase).toBe(15909);
    expect(totals.amount).toBe(686643);
  });

  it("overrides 8/30 amount 58800 vs formula 58860", () => {
    const row = ledger.inboundRecords.find((r) => r.id === "in-chen-0830")!;
    expect(row.computedAmount).toBe(58860);
    expect(row.amount).toBe(58800);
    expect(row.amountOverridden).toBe(1);
  });

  it("converts 100 boxes to 3333 jin", () => {
    const row = ledger.inboundRecords.find((r) => r.id === "in-wang-1204")!;
    expect(row.qtyInBase).toBe(3333);
  });

  it("adjusts sugar and flour to 10 bags", () => {
    const stock = stockBalances(ledger.items, ledger.inboundRecords, ledger.stockAdjustments);
    expect(stock.find((r) => r.itemId === SEED_IDS.items.sugar)?.balance).toBe(10);
    expect(stock.find((r) => r.itemId === SEED_IDS.items.flour)?.balance).toBe(10);
  });
});
