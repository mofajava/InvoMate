"use client";

import CloudOutlined from "@mui/icons-material/CloudOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import Logout from "@mui/icons-material/Logout";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import WarehouseOutlined from "@mui/icons-material/WarehouseOutlined";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isGoogleConfigured } from "@/lib/auth";
import { useLedger } from "@/lib/store";

const NAV = [
  { href: "/inbounds/", label: "進貨", icon: <LocalShippingOutlined /> },
  { href: "/stock/", label: "庫存", icon: <WarehouseOutlined /> },
  { href: "/adjustments/", label: "調整", icon: <TuneOutlined /> },
  { href: "/suppliers/", label: "供應商", icon: <StorefrontOutlined /> },
  { href: "/items/", label: "品項", icon: <CategoryOutlined /> },
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

function activeHref(pathname: string) {
  return NAV.find((item) => pathname.startsWith(item.href.replace(/\/$/, "")))?.href ?? NAV[0].href;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, bootstrap, token, profile, signIn, signOut, saveStatus, saveError, lastSavedAt, saveNow } =
    useLedger();
  const [signInError, setSignInError] = useState("");
  const current = activeHref(pathname);

  useEffect(() => {
    if (!ready) void bootstrap();
  }, [ready, bootstrap]);

  if (!ready) {
    return (
      <Stack spacing={2} sx={{ minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
        <Typography color="text.secondary">載入中…</Typography>
      </Stack>
    );
  }

  if (!token) {
    const configured = isGoogleConfigured();
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", display: "flex", alignItems: "center" }}>
        <Container maxWidth="sm">
          <Card>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Stack spacing={2.5} sx={{ alignItems: "center", textAlign: "center" }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 4,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Inventory2Outlined />
                </Box>
                <Typography variant="h4">InvoMate</Typography>
                <Typography color="text.secondary">
                  請先用 Google 帳號授權。帳本會存在你的雲端硬碟
                  <Box component="code" sx={{ mx: 0.5, fontFamily: "monospace" }}>
                    InvoMate/invomate-ledger.json
                  </Box>
                  ，換手機登入同一帳號即可。
                </Typography>
                {configured ? (
                  <Typography color="text.secondary">
                    瀏覽器規定授權視窗必須由你點一下才會出現，請按下方按鈕。
                  </Typography>
                ) : (
                  <Alert severity="warning" sx={{ textAlign: "left", width: "100%" }}>
                    還沒設定 Google 用戶端，所以現在無法授權。請在 Google Cloud Console 建立網頁應用程式
                    OAuth 用戶端、啟用 Drive API，並把範圍加上
                    https://www.googleapis.com/auth/drive.file。詳細步驟見 README。
                  </Alert>
                )}
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  disabled={!configured}
                  startIcon={<CloudOutlined />}
                  onClick={() =>
                    void signIn().catch((err: Error) => setSignInError(err.message))
                  }
                >
                  {configured ? "使用 Google 授權雲端硬碟" : "請先完成設定"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Container>
        <Snackbar open={Boolean(signInError)} autoHideDuration={8000} onClose={() => setSignInError("")}>
          <Alert severity="error" onClose={() => setSignInError("")} variant="filled">
            {signInError}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", pb: { xs: 10, md: 0 } }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            InvoMate
          </Typography>
          <Chip size="small" label={saveLabel(saveStatus, lastSavedAt)} variant="outlined" />
          {saveStatus === "error" ? (
            <Button color="error" onClick={() => void saveNow()}>
              重試
            </Button>
          ) : null}
          <IconButton aria-label="登出" onClick={signOut}>
            <Logout />
          </IconButton>
        </Toolbar>
        <Box sx={{ px: 2, pb: 1, display: { xs: "none", md: "block" } }}>
          <Typography variant="caption" color="text.secondary">
            {profile?.email} · 請勿兩台裝置同時記帳，後寫會蓋前寫
          </Typography>
        </Box>
        {saveError ? (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {saveError}
          </Alert>
        ) : null}
        <Tabs
          value={current}
          onChange={(_, href: string) => router.push(href)}
          variant="scrollable"
          sx={{ display: { xs: "none", md: "flex" }, px: 1 }}
        >
          {NAV.map((item) => (
            <Tab key={item.href} value={item.href} label={item.label} icon={item.icon} iconPosition="start" />
          ))}
        </Tabs>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
      <BottomNavigation
        showLabels
        value={current}
        onChange={(_, href: string) => router.push(href)}
        sx={{
          display: { md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {NAV.map((item) => (
          <BottomNavigationAction key={item.href} value={item.href} label={item.label} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Box>
  );
}
