"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { warehouseHistoryCounts, warehouseInUse } from "@/lib/master";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";

function Body() {
  const { ledger, updateLedger } = useLedger();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.warehouses.some((s) => s.name === trimmed)) {
      setError("名稱已存在");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      warehouses: [...current.warehouses, { id: newId(), name: trimmed, archived: 0, createdAt: timestamp, updatedAt: timestamp }],
    }));
    setName("");
    setError("");
  }

  function startRename(id: string, currentName: string) {
    setError("");
    setEditingId(id);
    setEditingName(currentName);
  }

  function saveRename() {
    if (!editingId) return;
    const next = editingName.trim();
    if (!next) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.warehouses.some((s) => s.name === next && s.id !== editingId)) {
      setError("名稱已存在");
      return;
    }
    updateLedger((led) => ({
      ...led,
      warehouses: led.warehouses.map((s) =>
        s.id === editingId ? { ...s, name: next, updatedAt: new Date().toISOString() } : s,
      ),
    }));
    setEditingId(null);
    setEditingName("");
    setError("");
  }

  function toggle(id: string) {
    updateLedger((led) => ({
      ...led,
      warehouses: led.warehouses.map((s) => (s.id === id ? { ...s, archived: s.archived ? 0 : 1, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  function remove(id: string) {
    if (warehouseInUse(ledger, id)) {
      const counts = warehouseHistoryCounts(ledger, id);
      setError(
        counts.nonzeroBalances
          ? "此倉仍有成品餘額，無法刪除。可改為停用。"
          : `已有加工 ${counts.workOrders}、調撥 ${counts.transfers}、出貨 ${counts.outbounds}、調整 ${counts.adjustments} 筆使用此倉，無法刪除。可改為停用。`,
      );
      return;
    }
    if (!confirm("確定刪除這個倉點？")) return;
    setError("");
    updateLedger((led) => ({
      ...led,
      warehouses: led.warehouses.filter((s) => s.id !== id),
    }));
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">倉點</Typography>
      <Typography variant="body2" color="text.secondary">
        只有成品分倉。停用後新加工、調撥、出貨不能選，舊單仍顯示名稱。
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField label="新倉點，例如冷凍庫" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="contained" onClick={add} sx={{ whiteSpace: "nowrap" }}>新增</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack spacing={1.5}>
        {ledger.warehouses.map((s) => (
          <Card key={s.id}>
            {editingId === s.id ? (
              <CardContent>
                <Stack spacing={1.5}>
                  <TextField
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="outlined" onClick={() => setEditingId(null)}>取消</Button>
                    <Button fullWidth variant="contained" onClick={saveRename}>儲存</Button>
                  </Stack>
                </Stack>
              </CardContent>
            ) : (
              <>
                <CardContent sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontWeight: 500 }}>{s.name}</Typography>
                  {s.archived ? <Chip size="small" label="已停用" /> : null}
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => startRename(s.id, s.name)}>重新命名</Button>
                  <Button size="small" onClick={() => toggle(s.id)}>{s.archived ? "啟用" : "停用"}</Button>
                  <Button size="small" color="error" onClick={() => remove(s.id)}>刪除</Button>
                </CardActions>
              </>
            )}
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}

export default function Page() {
  return (
    <AppShell>
      <Body />
    </AppShell>
  );
}
