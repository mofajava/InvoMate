# Phase 1：進貨帳冊與庫存 — 開發任務

狀態：Phase 1 實作中（本機可跑；雲端需設定 Google OAuth）。  
規格：[spec.md](./spec.md) · 設計：[design.md](./design.md)

任務順序固定：先可跑的空 App 與資料庫，再純函式測試，再主檔，再進貨，再庫存與調整，最後用手記驗收。

## T0 前置

- [ ] 規格與設計已確認（本檔才開始勾）
- [ ] Node 20+ 可用

## T1 建立 Next.js 靜態專案

- [ ] 在 repo 根目錄建立 Next.js（App Router、TypeScript、Tailwind、ESLint）
- [ ] `output: 'export'`、設定 `basePath`（配合 GitHub Pages 專案路徑）
- [ ] 保留既有 `resource/data.txt`、`LICENSE`、`specs/`
- [ ] 根路徑可 `next dev`；靜態 export 可在本機預覽

## T2 GitHub Pages 與 Google 雲端帳本

- [ ] GitHub Actions：build 靜態檔並 deploy Pages
- [ ] Google OAuth（Client ID 為 `NEXT_PUBLIC_`；origin 限制 Pages 網址與 localhost）
- [ ] 登入閘門：未登入不能進帳本
- [ ] `lib/drive.ts`：在 `InvoMate/invomate-ledger.json` 找或建立、讀、寫
- [ ] `lib/store.ts`：載入初始化；變更 debounce 自動存；狀態「儲存中／已儲存／失敗」
- [ ] 首次無檔時種入五供應商、四品項、紫山藥 100 箱 = 3333 斤
- [ ] README：啟用 Pages、建立 OAuth 用戶端、scope `drive.file`

## T3 計算純函式與測試

- [ ] `lib/calendar.ts`：民國 ↔ ISO；12/38、非閏年 2/29 丟錯
- [ ] `lib/money.ts`：`Math.round(qty * unitPrice)`；差額與 `amountOverridden`
- [ ] `lib/units.ts`：基準單位原樣；箱用 3333/100；無換算則失敗
- [ ] 單元測試至少覆蓋：
  - 114/12/4 → 2025-12-04
  - 1308 × 45 = 58860
  - 50 箱 → 1666.5 斤
  - 100 箱 → 3333 斤
- [ ] `npm test`（或 `pnpm test`）須通過

## T4 版面與導覽（含手機／平板）

- [ ] `app/layout.tsx`：viewport metadata；導覽進貨、庫存、調整、供應商、品項
- [ ] 小於 `md`：漢堡選單或底部導覽，不擠成一排小字；當前頁標示
- [ ] `md` 以上：頂部橫列
- [ ] 共用數字格式（千分位、整數元）
- [ ] 民國日期輸入元件（年／月／日），手機三欄並排不造成整頁橫滑；送出前呼叫 `rocToIso`
- [ ] 可點元素約 44px；數量／單價／金額用數字鍵盤（`inputMode`）

## T5 供應商主檔

- [ ] `/suppliers` 列表（含已停用標記）
- [ ] 新增、重新命名、停用
- [ ] 名稱唯一；空名稱拒絕
- [ ] 寫入 store 並觸發雲端儲存，失敗顯示訊息

## T6 品項主檔與換算

- [ ] `/items` 列表：名稱、基準單位、換算摘要
- [ ] 新增品項（名稱 + 基準單位 斤／包）
- [ ] 重新命名、停用
- [ ] 為品項新增／編輯一筆輔助單位換算（fromQty／toQty）
- [ ] 種子的紫山藥換算可在畫面看到 100 箱 = 3333 斤

## T7 進貨列表與多面向查詢

- [ ] `/inbounds` 讀取進貨
- [ ] `lib/query.ts`：AND 過濾（供應商／品項多選、日期起迄、金額、基準數量、單價、品級、備註、僅覆寫）+ 排序；單元測試含陳美美小計與金額下限
- [ ] 查詢 UI 如上列條件；快捷年／月填起迄；一鍵清除；已套用標籤
- [ ] 欄位：日期（民國）、供應商、品項、品級、數量+單位、基準數量、單價、金額
- [ ] 覆寫列顯示差額
- [ ] 查詢後 `sum(qtyInBase)`、`sum(amount)`、筆數
- [ ] 連到新增／編輯；刪除需確認
- [ ] 小於 `md`：卡片列表 + 可收合查詢；小計在標籤下與列表末；主按鈕全寬
- [ ] `md` 以上：表格；欄位過多時僅表格容器橫向捲動

## T8 進貨表單

- [ ] `/inbounds/new`、`/inbounds/[id]/edit`
- [ ] 欄位與設計 5.2 一致
- [ ] 供應商／品項下拉只顯示未停用；可從表單快捷新增供應商（或連到主檔）
- [ ] 單位下拉 = 基準單位 + 該品項換算 fromUnit
- [ ] 選箱時顯示換算後斤數
- [ ] 同供應商+品項+品級帶出上次單價與單位；單位不同時提示
- [ ] 金額隨公式更新，直到使用者覆寫；可「恢復公式金額」
- [ ] 伺服器改為瀏覽器：重算 `qtyInBase`、`computedAmount`、`amountOverridden`，不信任未驗證輸入
- [ ] 無效日期、qty ≤ 0、未知單位：不寫入並顯示錯誤
- [ ] 手機單欄、儲存／取消在表單最底全寬；平板最多兩欄

## T9 庫存頁

- [ ] `/stock` 依品項 + 品級聚合餘額
- [ ] 顯示基準單位
- [ ] 負數醒目
- [ ] 實作 `lib/stock.ts` 加總（可加測試：兩筆進貨 + 一筆負調整）

## T10 庫存調整

- [ ] `/adjustments` 列表
- [ ] `/adjustments/new`：日期、品項、品級、增減量（基準單位）、原因、備註
- [ ] 文案註明是增減量不是盤後餘額
- [ ] qtyInBase = 0 拒絕；調整不出現在進貨小計

## T10b 匯出 xlsx／pdf 到 Drive

- [ ] 瀏覽器產生 xlsx（進貨／庫存／調整三表 + 小計）
- [ ] 瀏覽器產生 pdf（繁中可讀、A4、進貨＋小計＋庫存）
- [ ] 上傳到 Drive `InvoMate/exports/`，檔名含時間；顯示已儲存與連結
- [ ] 可下載到此裝置
- [ ] 可選目前篩選或全部進貨
- [ ] 手機可完成匯出；不回寫 JSON 主檔

## T11 用手記驗收（手動）

對照 [spec.md](./spec.md) 第 5、6 節，登打後勾選：

- [ ] 陳美美 14 筆；小計 15,909 斤、686,643 元（含 8/30 覆寫 58,800）
- [ ] 8/30 列看得到公式 58,860 與差 −60
- [ ] 溪湖三筆（兩筆覆寫、兩筆醜）
- [ ] 王小姐／西螺用箱；100 箱顯示 3,333 斤
- [ ] 12/38 無法儲存
- [ ] 糖／麵粉／地瓜粉拆筆登打；9/12 兩筆公式金額
- [ ] 新增品項「山藥成品」並登一筆成功
- [ ] 庫存調整把糖、麵粉餘額調近「剩 10 包」；進貨金額小計不變
- [ ] 無出貨／成本畫面；有 Google 登入
- [ ] 裝置模式約 390×844 與 768×1024：可新增進貨、看庫存、看小計；導覽可達各主頁；無整頁橫向溢出
- [ ] Google 登入後載入／自動存；再開或換瀏覽器登入同一帳號資料仍在；git 無帳本 JSON
- [ ] 匯出 xlsx、pdf 到 Drive exports 資料夾且可本機下載；中文正常

## T12 收尾

- [ ] README：用途、Pages 網址、OAuth 設定、規格連結
- [ ] 切勿把 `invomate-ledger.json` 或含帳本的檔 commit 進 git

## 不在本清單

- 解析或批次匯入 `resource/data.txt`
- 本機 SQLite／Turso／Vercel 當主檔
- Phase 2 成本、Phase 3 出貨與帳務（見 [../roadmap.md](../roadmap.md)）
