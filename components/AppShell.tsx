"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isGoogleConfigured } from "@/lib/auth";
import { useLedger } from "@/lib/store";

const NAV = [
  { href: "/inbounds/", label: "進貨" },
  { href: "/stock/", label: "庫存" },
  { href: "/adjustments/", label: "調整" },
  { href: "/suppliers/", label: "供應商" },
  { href: "/items/", label: "品項" },
];

function saveLabel(status: string, lastSavedAt: string | null) {
  if (status === "loading") return "載入中";
  if (status === "saving") return "儲存中";
  if (status === "error") return "儲存失敗";
  if (status === "saved" && lastSavedAt) {
    const t = new Date(lastSavedAt);
    return `已儲存 ${t.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (status === "saved") return "已儲存";
  return "";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { ready, bootstrap, token, profile, signIn, signOut, enterLocalPreview, saveStatus, saveError, lastSavedAt, usingLocalFallback, saveNow } =
    useLedger();

  useEffect(() => {
    if (!ready) void bootstrap();
  }, [ready, bootstrap]);

  if (!ready) {
    return <p className="p-6">載入中…</p>;
  }

  const signedIn = usingLocalFallback || Boolean(token);

  if (!signedIn) {
    const configured = isGoogleConfigured();
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
        <h1 className="text-2xl font-bold">InvoMate 進貨帳冊</h1>
        <p className="text-sm leading-6 text-neutral-700">
          請先用 Google 帳號授權。授權後帳本會存在你的雲端硬碟
          <code className="mx-1">InvoMate/invomate-ledger.json</code>
          ，換手機登入同一帳號即可。
        </p>
        {configured ? (
          <p className="text-sm leading-6 text-neutral-700">
            瀏覽器規定授權視窗必須由你點一下才會出現，無法在打開網頁時自動跳出。請按下方按鈕。
          </p>
        ) : (
          <div className="space-y-2 rounded-lg bg-amber-100 p-3 text-sm leading-6">
            <p className="font-medium">還沒設定 Google 用戶端，所以現在無法授權。</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>到 Google Cloud Console 建立「網頁應用程式」OAuth 用戶端。</li>
              <li>啟用 Google Drive API。</li>
              <li>
                OAuth 同意畫面的範圍（Scopes）加上
                <code className="block mt-1">https://www.googleapis.com/auth/drive.file</code>
              </li>
              <li>
                授權 JavaScript 來源加上 <code>http://localhost:3000</code> 與 GitHub Pages 網址。
              </li>
              <li>
                在專案根目錄建立 <code>.env.local</code>，填入
                <code className="block mt-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID=你的ID</code>
                後重新執行 <code>npm run dev</code>。
              </li>
            </ol>
            <p>詳細步驟見 README。</p>
          </div>
        )}
        <button
          type="button"
          className="rounded-xl bg-[#2f6f4e] px-4 py-3 text-white disabled:opacity-50"
          disabled={!configured}
          onClick={() => void signIn().catch((err: Error) => alert(err.message))}
        >
          {configured ? "使用 Google 授權雲端硬碟" : "請先完成上方設定"}
        </button>
        <button
          type="button"
          className="text-sm text-neutral-600 underline"
          onClick={() => void enterLocalPreview()}
        >
          先在本機試用（不會存到雲端）
        </button>
      </main>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-[#f4f1ea]/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-base font-bold">InvoMate</p>
            <p className="text-xs text-neutral-600">
              {usingLocalFallback ? "本機預覽（未設定 Google）" : profile?.email}
              {usingLocalFallback ? null : ` · ${saveLabel(saveStatus, lastSavedAt)}`}
              {usingLocalFallback ? ` · ${saveLabel(saveStatus, lastSavedAt)}` : null}
            </p>
          </div>
          <div className="flex gap-2">
            {saveStatus === "error" ? (
              <button type="button" className="rounded-lg bg-red-100 px-3 text-sm" onClick={() => void saveNow()}>
                重試儲存
              </button>
            ) : null}
            {usingLocalFallback ? (
              <button type="button" className="rounded-lg border border-stone-300 px-3 text-sm" onClick={signOut}>
                改用 Google
              </button>
            ) : (
              <button type="button" className="rounded-lg border border-stone-300 px-3 text-sm" onClick={signOut}>
                登出
              </button>
            )}
          </div>
        </div>
        {saveError ? <p className="px-4 pb-2 text-sm text-red-700">{saveError}</p> : null}
        {usingLocalFallback ? (
          <p className="px-4 pb-2 text-xs text-amber-800">資料只存在這個瀏覽器。設定 Google 用戶端後即可存到雲端硬碟。</p>
        ) : (
          <p className="px-4 pb-2 text-xs text-neutral-500">請勿兩台裝置同時記帳，後寫會蓋前寫。</p>
        )}
        <nav className="hidden gap-1 px-2 pb-2 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm ${active ? "bg-[#2f6f4e] text-white" : "text-neutral-800"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="p-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-stone-200 bg-[#fffcf6] md:hidden">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href.replace(/\/$/, ""));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center px-1 text-sm ${active ? "font-bold text-[#2f6f4e]" : "text-neutral-600"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
