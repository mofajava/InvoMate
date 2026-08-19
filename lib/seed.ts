import type { Item, Ledger, Supplier, UnitConversion } from "./types";

const now = () => new Date().toISOString();

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export const SEED_IDS = {
  suppliers: {
    chen: "sup-chen-meimei",
    xihu: "sup-xihu",
    shanshang: "sup-shanshang",
    wang: "sup-wang",
    xiluo: "sup-xiluo",
    unspecified: "sup-unspecified",
    yi: "sup-yi",
  },
  items: {
    yam: "item-purple-yam",
    sugar: "item-sugar",
    flour: "item-sanhua-flour",
    starch: "item-sweet-potato-starch",
  },
  conversion: {
    yamBox: "conv-yam-box",
  },
} as const;

export function createEmptyLedger(): Ledger {
  const timestamp = now();
  const suppliers: Supplier[] = [
    ["陳美美", SEED_IDS.suppliers.chen],
    ["溪湖", SEED_IDS.suppliers.xihu],
    ["山上", SEED_IDS.suppliers.shanshang],
    ["王小姐", SEED_IDS.suppliers.wang],
    ["西螺", SEED_IDS.suppliers.xiluo],
    ["未指定", SEED_IDS.suppliers.unspecified],
    ["益", SEED_IDS.suppliers.yi],
  ].map(([name, sid]) => ({
    id: sid,
    name,
    archived: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const items: Item[] = [
    { id: SEED_IDS.items.yam, name: "紫山藥", baseUnit: "jin" as const },
    { id: SEED_IDS.items.sugar, name: "糖", baseUnit: "bag" as const },
    { id: SEED_IDS.items.flour, name: "三花麵粉", baseUnit: "bag" as const },
    { id: SEED_IDS.items.starch, name: "地瓜粉", baseUnit: "bag" as const },
  ].map((item) => ({
    ...item,
    archived: 0 as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const unitConversions: UnitConversion[] = [
    {
      id: SEED_IDS.conversion.yamBox,
      itemId: SEED_IDS.items.yam,
      fromUnit: "box",
      toUnit: "jin",
      fromQty: 100,
      toQty: 3333,
    },
  ];

  return {
    version: 1,
    updatedAt: timestamp,
    suppliers,
    items,
    unitConversions,
    inboundRecords: [],
    stockAdjustments: [],
  };
}

export function newId(): string {
  return id("id");
}
