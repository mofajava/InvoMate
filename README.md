# InvoMate

進貨帳冊與庫存（Phase 1）。網站可放在 **GitHub Pages**；帳本存在你自己的 **Google 雲端硬碟**（`InvoMate/invomate-ledger.json`）。手機／平板用瀏覽器打開同一網址，登入同一 Google 帳號即可。

規格：[specs/phase-1-inbound-inventory/spec.md](specs/phase-1-inbound-inventory/spec.md)

## 本機開發

```bash
npm install
cp .env.example .env.local
# 填入 NEXT_PUBLIC_GOOGLE_CLIENT_ID 後，打開網頁會先進入授權畫面
npm run dev
```

開 http://localhost:3000 會先請你用 Google 授權雲端硬碟（瀏覽器規定要點一次按鈕，授權視窗不能自動跳出）。尚未設定用戶端 ID 時，畫面會說明設定步驟，並可選「先在本機試用」。

```bash
npm test
npm run build
```

## 設定 Google 登入（存雲端）

1. 到 [Google Cloud Console](https://console.cloud.google.com/) 建立專案，啟用 **Google Drive API**。
2. OAuth 同意畫面請把範圍加上 `https://www.googleapis.com/auth/drive.file`（測試中可把你的 Gmail 加到測試使用者）。
3. 建立 OAuth 用戶端 ID，類型選「網頁應用程式」。
4. **授權的 JavaScript 來源** 加上：
   - `http://localhost:3000`
   - `https://<你的帳號>.github.io`
5. **授權的重新導向 URI** 可填相同來源（GIS token client 主要看 JavaScript 來源）。
6. 把用戶端 ID 放到 `.env.local`：

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

GitHub Actions 請把同一個值存成 repo secret：`NEXT_PUBLIC_GOOGLE_CLIENT_ID`。

授權範圍為 `drive.file`：只能讀寫本 App 建立的檔，不是整個硬碟。

## 部署 GitHub Pages

1. Repo Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。
2. 推送到 `main` 後，workflow `.github/workflows/pages.yml` 會測試、建置並發布。
3. 網站網址約為 `https://<帳號>.github.io/InvoMate/`（`basePath` 使用 repo 名稱）。
4. 把上述 Pages 網址加進 Google OAuth 的 JavaScript 來源。

**不要**把 `invomate-ledger.json` 或任何帳本內容 commit 進 git。

## 功能摘要

- 進貨登打（民國日期、自動金額、可覆寫差額、箱↔斤）
- 多條件查詢（廠商、日期、金額、數量等）
- 庫存與庫存調整
- 供應商／品項主檔
- 匯出 xlsx／pdf 到 Drive `InvoMate/exports/` 或下載
- 進貨頁可從 JSON 檔匯入帳本（會覆蓋目前資料）

請勿兩台裝置同時記帳（後寫會蓋前寫）。
