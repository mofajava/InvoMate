import { buildInbound } from "./inbound";
import { createEmptyLedger, SEED_IDS } from "./seed";
import type { InboundRecord, Ledger, UnitCode } from "./types";

const T = "2026-03-23T12:00:00.000Z";
const S = SEED_IDS.suppliers;
const I = SEED_IDS.items;

type Draft = {
  id: string;
  date: string;
  supplierId: string;
  itemId: string;
  grade?: string;
  qty: number;
  unit: UnitCode;
  unitPrice: number;
  amount?: number;
  note?: string;
};

function add(ledger: Ledger, drafts: Draft[]): InboundRecord[] {
  return drafts.map((draft, index) =>
    buildInbound({
      id: draft.id,
      date: draft.date,
      supplierId: draft.supplierId,
      itemId: draft.itemId,
      grade: draft.grade ?? "",
      qty: draft.qty,
      unit: draft.unit,
      unitPrice: draft.unitPrice,
      amount: draft.amount,
      note: draft.note ?? "",
      ledger,
      now: `2025-08-28T00:00:${String(index).padStart(2, "0")}.000Z`,
    }),
  );
}

/** 由 resource/data.txt 依 Phase 1 規則轉成帳本（手記金額覆寫、12/38→12/28、混開拆筆）。 */
export function buildLedgerFromHandNotes(): Ledger {
  const ledger = createEmptyLedger();
  ledger.updatedAt = T;
  ledger.suppliers = ledger.suppliers.map((row) => ({ ...row, createdAt: T, updatedAt: T }));
  ledger.items = ledger.items.map((row) => ({ ...row, createdAt: T, updatedAt: T }));

  const inboundRecords = add(ledger, [
    { id: "in-chen-0830", date: "2025-08-30", supplierId: S.chen, itemId: I.yam, qty: 1308, unit: "jin", unitPrice: 45, amount: 58800, note: "手記 58800；公式 58860" },
    { id: "in-chen-0901", date: "2025-09-01", supplierId: S.chen, itemId: I.yam, qty: 1275, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0907", date: "2025-09-07", supplierId: S.chen, itemId: I.yam, qty: 1217, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0909a", date: "2025-09-09", supplierId: S.chen, itemId: I.yam, qty: 1175, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0909b", date: "2025-09-09", supplierId: S.chen, itemId: I.yam, qty: 558, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0913a", date: "2025-09-13", supplierId: S.chen, itemId: I.yam, qty: 1167, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0913b", date: "2025-09-13", supplierId: S.chen, itemId: I.yam, qty: 1117, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0916", date: "2025-09-16", supplierId: S.chen, itemId: I.yam, qty: 1125, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0918a", date: "2025-09-18", supplierId: S.chen, itemId: I.yam, qty: 1217, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0918b", date: "2025-09-18", supplierId: S.chen, itemId: I.yam, qty: 1208, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0919", date: "2025-09-19", supplierId: S.chen, itemId: I.yam, qty: 1100, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0925", date: "2025-09-25", supplierId: S.chen, itemId: I.yam, qty: 1267, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0927", date: "2025-09-27", supplierId: S.chen, itemId: I.yam, qty: 1200, unit: "jin", unitPrice: 43 },
    { id: "in-chen-0929", date: "2025-09-29", supplierId: S.chen, itemId: I.yam, qty: 975, unit: "jin", unitPrice: 43 },
    { id: "in-xihu-1014", date: "2025-10-14", supplierId: S.xihu, itemId: I.yam, qty: 66, unit: "jin", unitPrice: 54, amount: 3600, note: "手記 3600；公式 3564" },
    { id: "in-xihu-1016", date: "2025-10-16", supplierId: S.xihu, itemId: I.yam, grade: "醜", qty: 1012, unit: "jin", unitPrice: 45, amount: 45500, note: "手記 45500；公式 45540" },
    { id: "in-xihu-1017", date: "2025-10-17", supplierId: S.xihu, itemId: I.yam, grade: "醜", qty: 1000, unit: "jin", unitPrice: 40 },
    {
      id: "in-wang-50box",
      date: "2025-10-20",
      supplierId: S.wang,
      itemId: I.yam,
      qty: 50,
      unit: "box",
      unitPrice: 1800,
      note: "手記無日期，匯入填 10/20；手記 1666 斤，系統 50 箱＝1666.5 斤；一斤 54",
    },
    { id: "in-shan-1106", date: "2025-11-06", supplierId: S.shanshang, itemId: I.yam, grade: "醜", qty: 2100, unit: "jin", unitPrice: 33 },
    { id: "in-wang-1204", date: "2025-12-04", supplierId: S.wang, itemId: I.yam, qty: 100, unit: "box", unitPrice: 1800, note: "手記 3333 斤、一斤 54" },
    { id: "in-xiluo-1204", date: "2025-12-04", supplierId: S.xiluo, itemId: I.yam, qty: 200, unit: "box", unitPrice: 2000, note: "手記 6666 斤、一斤 60、40 萬；200 箱×2000＝400000" },
    {
      id: "in-wang-1228",
      date: "2025-12-28",
      supplierId: S.wang,
      itemId: I.yam,
      qty: 100,
      unit: "box",
      unitPrice: 1800,
      note: "手記日期 12/38，匯入改為 12/28",
    },
    { id: "in-wang-0119", date: "2026-01-19", supplierId: S.wang, itemId: I.yam, qty: 150, unit: "box", unitPrice: 1800, note: "手記 4950 斤、一斤 54" },
    { id: "in-wang-0202", date: "2026-02-02", supplierId: S.wang, itemId: I.yam, qty: 150, unit: "box", unitPrice: 1800, note: "手記 4950 斤、一斤 54" },
    { id: "in-wang-0302", date: "2026-03-02", supplierId: S.wang, itemId: I.yam, qty: 150, unit: "box", unitPrice: 1800, note: "手記 4950 斤、一斤 54" },
    { id: "in-sugar-0828", date: "2025-08-28", supplierId: S.unspecified, itemId: I.sugar, qty: 30, unit: "bag", unitPrice: 1100 },
    { id: "in-flour-0829", date: "2025-08-29", supplierId: S.unspecified, itemId: I.flour, qty: 30, unit: "bag", unitPrice: 420, note: "與地瓜粉同日混開" },
    { id: "in-starch-0829", date: "2025-08-29", supplierId: S.unspecified, itemId: I.starch, qty: 3, unit: "bag", unitPrice: 650, note: "與三花同日混開" },
    { id: "in-flour-0912", date: "2025-09-12", supplierId: S.unspecified, itemId: I.flour, qty: 90, unit: "bag", unitPrice: 450, note: "手記兩項合計寫 43650，拆筆後用公式 40500+5850=46350" },
    { id: "in-starch-0912", date: "2025-09-12", supplierId: S.unspecified, itemId: I.starch, qty: 9, unit: "bag", unitPrice: 650 },
    { id: "in-sugar-0920", date: "2025-09-20", supplierId: S.unspecified, itemId: I.sugar, qty: 20, unit: "bag", unitPrice: 1100 },
    { id: "in-sugar-1203", date: "2025-12-03", supplierId: S.unspecified, itemId: I.sugar, qty: 25, unit: "bag", unitPrice: 1100 },
    { id: "in-flour-1203", date: "2025-12-03", supplierId: S.unspecified, itemId: I.flour, qty: 90, unit: "bag", unitPrice: 450, note: "與地瓜粉同日混開" },
    { id: "in-starch-1203", date: "2025-12-03", supplierId: S.unspecified, itemId: I.starch, qty: 9, unit: "bag", unitPrice: 650 },
    { id: "in-sugar-1229", date: "2025-12-29", supplierId: S.unspecified, itemId: I.sugar, qty: 25, unit: "bag", unitPrice: 1100, amount: 33000, note: "手記 33000；25×1100 公式 27500" },
    { id: "in-flour-0117", date: "2026-01-17", supplierId: S.unspecified, itemId: I.flour, qty: 90, unit: "bag", unitPrice: 470, note: "與地瓜粉同日混開" },
    { id: "in-starch-0117", date: "2026-01-17", supplierId: S.unspecified, itemId: I.starch, qty: 9, unit: "bag", unitPrice: 650 },
    { id: "in-sugar-0121", date: "2026-01-21", supplierId: S.unspecified, itemId: I.sugar, qty: 50, unit: "bag", unitPrice: 1100 },
    { id: "in-flour-0206", date: "2026-02-06", supplierId: S.yi, itemId: I.flour, qty: 90, unit: "bag", unitPrice: 470, note: "手記「益三花」；與地瓜粉同日混開" },
    { id: "in-starch-0206", date: "2026-02-06", supplierId: S.yi, itemId: I.starch, qty: 9, unit: "bag", unitPrice: 650 },
    { id: "in-sugar-0309", date: "2026-03-09", supplierId: S.unspecified, itemId: I.sugar, qty: 35, unit: "bag", unitPrice: 1100 },
    { id: "in-flour-0323", date: "2026-03-23", supplierId: S.unspecified, itemId: I.flour, qty: 30, unit: "bag", unitPrice: 450, note: "與地瓜粉同日混開" },
    { id: "in-starch-0323", date: "2026-03-23", supplierId: S.unspecified, itemId: I.starch, qty: 3, unit: "bag", unitPrice: 650 },
  ]);

  ledger.inboundRecords = inboundRecords;
  ledger.stockAdjustments = [
    {
      id: "adj-sugar-remain",
      date: "2026-03-23",
      itemId: I.sugar,
      grade: "",
      qtyInBase: -175,
      reason: "stocktake",
      note: "手記剩 10 包糖（進貨 185 包）；−17650 元未入帳",
      createdAt: T,
      updatedAt: T,
    },
    {
      id: "adj-flour-remain",
      date: "2026-03-23",
      itemId: I.flour,
      grade: "",
      qtyInBase: -410,
      reason: "stocktake",
      note: "手記剩 10 包麵粉／三花（進貨 420 包）；−17650 元未入帳",
      createdAt: T,
      updatedAt: T,
    },
  ];
  return ledger;
}
