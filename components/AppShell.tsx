"use client";

import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import CloudOutlined from "@mui/icons-material/CloudOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlined from "@mui/icons-material/LocalShippingOutlined";
import Logout from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import OutboxOutlined from "@mui/icons-material/OutboxOutlined";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import PrecisionManufacturingOutlined from "@mui/icons-material/PrecisionManufacturingOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import SwapHoriz from "@mui/icons-material/SwapHoriz";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import WarehouseOutlined from "@mui/icons-material/WarehouseOutlined";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isGoogleConfigured, isOfflineDev } from "@/lib/auth";
import { useLedger } from "@/lib/store";

const DRAWER_WIDTH = 280;

type NavItem = { href: string; label: string; icon: React.ReactNode };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "帳務",
    items: [
      { href: "/inbounds/", label: "進貨", icon: <LocalShippingOutlined /> },
      { href: "/outbounds/", label: "出貨", icon: <OutboxOutlined /> },
      { href: "/receivables/", label: "應收", icon: <AccountBalanceWalletOutlined /> },
    ],
  },
  {
    title: "庫存作業",
    items: [
      { href: "/stock/", label: "庫存", icon: <WarehouseOutlined /> },
      { href: "/work-orders/", label: "加工", icon: <PrecisionManufacturingOutlined /> },
      { href: "/adjustments/", label: "調整", icon: <TuneOutlined /> },
      { href: "/transfers/", label: "調撥", icon: <SwapHoriz /> },
    ],
  },
  {
    title: "主檔",
    items: [
      { href: "/suppliers/", label: "供應商", icon: <StorefrontOutlined /> },
      { href: "/customers/", label: "客戶", icon: <PeopleOutlined /> },
      { href: "/items/", label: "品項", icon: <CategoryOutlined /> },
      { href: "/warehouses/", label: "倉點", icon: <PlaceOutlined /> },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((group) => group.items);

function saveLabel(status: string, lastSavedAt: string | null, offline: boolean) {
  if (offline) return "本機（不同步）";
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

function isActive(pathname: string, href: string) {
  const base = href.replace(/\/$/, "");
  return pathname === href || pathname === base || pathname.startsWith(`${base}/`);
}

function currentLabel(pathname: string) {
  return ALL_NAV.find((item) => isActive(pathname, item.href))?.label ?? "InvoMate";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, bootstrap, token, profile, signIn, signOut, saveStatus, saveError, lastSavedAt, saveNow, offline } =
    useLedger();
  const [signInError, setSignInError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!ready || (isOfflineDev() && !offline)) void bootstrap();
  }, [ready, bootstrap, offline]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <Stack spacing={2} sx={{ minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
        <Typography color="text.secondary">載入中…</Typography>
      </Stack>
    );
  }

  if (!token && !offline) {
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

  function go(href: string) {
    router.push(href);
    setDrawerOpen(false);
  }

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Inventory2Outlined fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 500 }}>InvoMate</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {offline ? "本機開發 · 不同步雲端" : profile?.email}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ overflow: "auto", flex: 1 }}>
        {NAV_GROUPS.map((group, index) => (
          <List
            key={group.title}
            subheader={
              <ListSubheader component="div" sx={{ bgcolor: "transparent", lineHeight: "36px" }}>
                {group.title}
              </ListSubheader>
            }
          >
            {group.items.map((item) => (
              <ListItemButton
                key={item.href}
                selected={isActive(pathname, item.href)}
                onClick={() => go(item.href)}
                sx={{ mx: 1, borderRadius: 2, minHeight: 48 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            {index < NAV_GROUPS.length - 1 ? <Divider sx={{ my: 1 }} /> : null}
          </List>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="開啟功能選單"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }} noWrap>
            {currentLabel(pathname)}
          </Typography>
          <Chip size="small" label={saveLabel(saveStatus, lastSavedAt, offline)} variant="outlined" />
          {saveStatus === "error" && !offline ? (
            <Button color="error" onClick={() => void saveNow()}>
              重試
            </Button>
          ) : null}
          {offline ? null : (
            <IconButton aria-label="登出" onClick={signOut}>
              <Logout />
            </IconButton>
          )}
        </Toolbar>
        {saveError ? (
          <Alert severity="error" sx={{ borderRadius: 0 }}>
            {saveError}
          </Alert>
        ) : null}
      </AppBar>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` } }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {children}
        </Container>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 3, pb: 3 }}>
          {offline ? "本機開發不會寫入 Google 雲端硬碟" : "請勿兩台裝置同時記帳，後寫會蓋前寫"}
        </Typography>
      </Box>
    </Box>
  );
}
