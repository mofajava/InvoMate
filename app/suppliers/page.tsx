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
    if (ledger.suppliers.some((s) => s.name === trimmed)) {
      setError("名稱已存在");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      suppliers: [...current.suppliers, { id: newId(), name: trimmed, archived: 0, createdAt: timestamp, updatedAt: timestamp }],
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
    if (ledger.suppliers.some((s) => s.name === next && s.id !== editingId)) {
      setError("名稱已存在");
      return;
    }
    updateLedger((led) => ({
      ...led,
      suppliers: led.suppliers.map((s) =>
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
      suppliers: led.suppliers.map((s) => (s.id === id ? { ...s, archived: s.archived ? 0 : 1, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  function remove(id: string) {
    const used = ledger.inboundRecords.filter((row) => row.supplierId === id).length;
    if (used > 0) {
      setError(`已有 ${used} 筆進貨使用此供應商，無法刪除。可改為停用。`);
      return;
    }
    if (!confirm("確定刪除這個供應商？")) return;
    setError("");
    updateLedger((led) => ({
      ...led,
      suppliers: led.suppliers.filter((s) => s.id !== id),
    }));
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">供應商</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField label="新供應商" value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="contained" onClick={add} sx={{ whiteSpace: "nowrap" }}>新增</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack spacing={1.5}>
        {ledger.suppliers.map((s) => (
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
