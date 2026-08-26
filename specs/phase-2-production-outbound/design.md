# Phase 2：加工、成品多倉與出貨 — 設計

狀態：待確認  
規格：[spec.md](./spec.md) · 任務：[tasks.md](./tasks.md)

## 1. 技術取捨

沿用 Phase 1：Next.js 靜態匯出、GitHub Pages、Drive JSON、Zustand、民國日期、金額覆寫。本階段只擴帳本 schema 與畫面，不改託管。

帳本 `version: 2`。讀到 `version: 1` 時在記憶體遷移後再存回：

- 每個 `item` 補 `kind: "raw"`
- 補空陣列：`warehouses`、`customers`、`workOrders`、`transfers`、`outboundRecords`
- 種子：若沒有成品「山藥成品」則插入（`kind: finished`，基準斤）；若 `warehouses` 空則插入「永靖」「田尾」（不重複、不覆蓋使用者已建倉名）

`stockAdjustments` 新增選用欄位 `warehouseId`（原料調整為 `""` 或不寫；成品必填）。

## 2. 領域模型

```mermaid
erDiagram
  Supplier ||--o{ InboundRecord : supplies
  Item ||--o{ InboundRecord : rawInbound
  Item ||--o{ WorkOrderConsume : consumed
  Item ||--o{ WorkOrder : produced
  Warehouse ||--o{ WorkOrder : outputInto
  Warehouse ||--o{ Transfer : from
  Warehouse ||--o{ Transfer : to
  Warehouse ||--o{ OutboundRecord : shipsFrom
  Customer ||--o{ OutboundRecord : buys
  Item ||--o{ OutboundRecord : finished
```

庫存仍不持久化餘額；每次由流水重算。儲存前跑 `assertNonNegativeStock(ledger)`，失敗則不寫入 store。

## 3. JSON 增補

根物件 version 2：

`{ version: 2, updatedAt, suppliers, items, unitConversions, inboundRecords, stockAdjustments, warehouses, customers, workOrders, transfers, outboundRecords }`

### 3.1 `items` 增 `kind`

`raw` | `finished`。不可變更。

### 3.2 `warehouses`

| 欄位 | 規則 |
|---|---|
| id | UUID |
| name | unique、非空 |
| archived | 0/1 |

### 3.3 `customers`

同供應商：id、name、archived、時間戳。

### 3.4 `workOrders`

| 欄位 | 規則 |
|---|---|
| id, date, note | 同進貨風格 |
| outputItemId | 必須 finished |
| outputGrade | 字串，可空 |
| outputQty, outputUnit, outputQtyInBase | 產量＞0 |
| warehouseId | 未停用倉 |
| consumes | 陣列 ≥1 |

`consumes[]`：`{ id, itemId (raw), grade, qty, unit, qtyInBase }`，qty＞0。

### 3.5 `transfers`

`fromWarehouseId` ≠ `toWarehouseId`；`itemId` 為 finished；`qtyInBase`＞0。

### 3.6 `outboundRecords`

進貨欄位對應＋`customerId`、`warehouseId`、`arStatus: unpaid|paid`。`itemId` 必須 finished。

### 3.7 `stockAdjustments`

成品：`warehouseId` 必填。原料：空字串。

## 4. 庫存函式

`lib/stock.ts` 擴充：

- `rawBalances(ledger)` → 現有 `stockBalances` 語意，但扣 `workOrders.consumes`
- `finishedBalances(ledger)` → 依 item × grade × warehouseId
- `assertNonNegativeStock(ledger)` → 任一餘額 ＜ 0 則 throw 中文原因

出貨上次單價：同客戶＋同成品＋同品級，最近一筆 `unitPrice`（可含單位提示，規則比照進貨）。

## 5. 畫面

| 路由 | 內容 |
|---|---|
| `/stock/` | 兩段：原料表；成品表（含倉欄）。負數不會出現在合法帳本，若載入壞檔仍標紅。 |
| `/work-orders/`、`/work-orders/new/`、`/work-orders/edit/` | 列表＋表單（耗用多列可增刪列） |
| `/transfers/`、`/transfers/new/` | 調撥 |
| `/outbounds/`、`/outbounds/new/`、`/outbounds/edit/` | 出貨；查詢收合同進貨（基本：客戶、日期、品項、倉） |
| `/customers/` | 同供應商頁 |
| `/warehouses/` | 同供應商頁 |
| `/receivables/` | 預設未收；可改已收 |

導覽：**側邊功能列分組**（帳務／庫存作業／主檔）。手機暫時 Drawer；桌機常駐。不做底欄、不做一排 Tabs。

## 6. 驗證

- 加工／調撥／出貨／調整的 `updateLedger` 包一層：先算出 next ledger，`assertNonNegativeStock`，失敗則 set saveError、不改帳本。
- Zod schema 同步 version 2。
- 單元測試：耗用超庫存、出貨超倉、調撥、v1→v2 遷移後原料餘額不變。
