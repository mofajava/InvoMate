"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { itemHasHistory, itemHistoryCounts, KIND_LABEL } from "@/lib/master";
import { newId } from "@/lib/seed";
import { useLedger } from "@/lib/store";
import type { BaseUnit, ItemKind } from "@/lib/types";
import { conversionSummary } from "@/lib/units";

function Body() {
  const { ledger, updateLedger } = useLedger();
  const [name, setName] = useState("");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("jin");
  const [kind, setKind] = useState<ItemKind>("raw");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [fromQty, setFromQty] = useState("100");
  const [toQty, setToQty] = useState("3333");

  function add() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名稱不可空白");
      return;
    }
    if (ledger.items.some((s) => s.name === trimmed)) {
      setError("名稱已存在");
      return;
    }
    const timestamp = new Date().toISOString();
    updateLedger((current) => ({
      ...current,
      items: [...current.items, { id: newId(), name: trimmed, baseUnit, kind, archived: 0, createdAt: timestamp, updatedAt: timestamp }],
    }));
    setName("");
    setError("");
  }

  function startRename(id: string, currentName: string) {
    setError("");
    setConvertingId(null);
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
    if (ledger.items.some((s) => s.name === next && s.id !== editingId)) {
      setError("名稱已存在");
      return;
    }
    updateLedger((led) => ({
      ...led,
      items: led.items.map((s) =>
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
      items: led.items.map((s) => (s.id === id ? { ...s, archived: s.archived ? 0 : 1, updatedAt: new Date().toISOString() } : s)),
    }));
  }

  function remove(id: string) {
    if (itemHasHistory(ledger, id)) {
      const counts = itemHistoryCounts(ledger, id);
      setError(
        `已有進貨 ${counts.inbound}、調整 ${counts.adjustments}、加工 ${counts.workOrders}、調撥 ${counts.transfers}、出貨 ${counts.outbounds} 筆使用此品項，無法刪除。可改為停用。`,
      );
      return;
    }
    if (!confirm("確定刪除這個品項？")) return;
    setError("");
    updateLedger((led) => ({
      ...led,
      items: led.items.filter((item) => item.id !== id),
      unitConversions: led.unitConversions.filter((c) => c.itemId !== id),
    }));
  }

  function startConversion(itemId: string) {
    const existing = ledger.unitConversions.find((c) => c.itemId === itemId);
    setEditingId(null);
    setConvertingId(itemId);
    setFromQty(String(existing?.fromQty ?? 100));
    setToQty(String(existing?.toQty ?? 3333));
    setError("");
  }

  function saveConversion() {
    if (!convertingId) return;
    const from = Number(fromQty);
    const to = Number(toQty);
    if (!Number.isFinite(from) || from <= 0 || !Number.isFinite(to) || to <= 0) {
      setError("換算請輸入正數");
      return;
    }
    const item = ledger.items.find((i) => i.id === convertingId);
    if (!item) return;
    const existing = ledger.unitConversions.find((c) => c.itemId === convertingId);
    updateLedger((led) => {
      const rest = led.unitConversions.filter((c) => !(c.itemId === convertingId && c.fromUnit === "box"));
      return {
        ...led,
        unitConversions: [
          ...rest,
          {
            id: existing?.id ?? newId(),
            itemId: convertingId,
            fromUnit: "box",
            toUnit: item.baseUnit,
            fromQty: from,
            toQty: to,
          },
        ],
      };
    });
    setConvertingId(null);
    setError("");
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">品項</Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField label="新品項，例如山藥成品" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField select label="種類" value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} sx={{ minWidth: 120 }}>
          <MenuItem value="raw">原料</MenuItem>
          <MenuItem value="finished">成品</MenuItem>
        </TextField>
        <TextField select label="基準單位" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)} sx={{ minWidth: 120 }}>
          <MenuItem value="jin">斤</MenuItem>
          <MenuItem value="bag">包</MenuItem>
        </TextField>
        <Button variant="contained" onClick={add} sx={{ whiteSpace: "nowrap" }}>新增</Button>
      </Stack>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack spacing={1.5}>
        {ledger.items.map((item) => (
          <Card key={item.id}>
            {editingId === item.id ? (
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
            ) : convertingId === item.id ? (
              <CardContent>
                <Stack spacing={1.5}>
                  <Typography sx={{ fontWeight: 500 }}>{item.name}　箱 → {item.baseUnit === "jin" ? "斤" : "包"}</Typography>
                  <TextField label="幾箱" inputMode="numeric" value={fromQty} onChange={(e) => setFromQty(e.target.value)} />
                  <TextField label={`等於多少${item.baseUnit === "jin" ? "斤" : "包"}`} inputMode="numeric" value={toQty} onChange={(e) => setToQty(e.target.value)} />
                  <Stack direction="row" spacing={1}>
                    <Button fullWidth variant="outlined" onClick={() => setConvertingId(null)}>取消</Button>
                    <Button fullWidth variant="contained" onClick={saveConversion}>儲存</Button>
                  </Stack>
                </Stack>
              </CardContent>
            ) : (
              <>
                <CardContent>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 500 }}>{item.name}</Typography>
                    <Chip size="small" label={KIND_LABEL[item.kind]} color={item.kind === "finished" ? "primary" : "default"} />
                    {item.archived ? <Chip size="small" label="已停用" /> : null}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{conversionSummary(item, ledger.unitConversions)}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => startRename(item.id, item.name)}>重新命名</Button>
                  <Button size="small" onClick={() => toggle(item.id)}>{item.archived ? "啟用" : "停用"}</Button>
                  <Button size="small" color="error" onClick={() => remove(item.id)}>刪除</Button>
                  {item.baseUnit === "jin" ? (
                    <Button size="small" onClick={() => startConversion(item.id)}>編輯箱換算</Button>
                  ) : null}
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
