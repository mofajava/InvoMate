"use client";

import Add from "@mui/icons-material/Add";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RocDateFields from "@/components/RocDateFields";
import { isValidIsoDate, todayIso } from "@/lib/calendar";
import { defaultFinishedItemId } from "@/lib/master";
import { formatQty } from "@/lib/money";
import { newId } from "@/lib/seed";
import { rawBalances } from "@/lib/stock";
import { useLedger } from "@/lib/store";
import type { Ledger, UnitCode } from "@/lib/types";
import { allowedUnits, UNIT_LABEL } from "@/lib/units";
import { buildWorkOrder } from "@/lib/work-order";

type ConsumeDraft = {
  key: string;
  itemId: string;
  grade: string;
  qty: string;
  unit: UnitCode;
};

function emptyConsume(): ConsumeDraft {
  return { key: newId(), itemId: "", grade: "", qty: "", unit: "jin" };
}

type Props = { editId?: string };

function ledgerWithoutOrder(ledger: Ledger, id?: string): Ledger {
  if (!id) return ledger;
  return { ...ledger, workOrders: ledger.workOrders.filter((row) => row.id !== id) };
}

export default function WorkOrderForm({ editId }: Props) {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const existing = ledger.workOrders.find((row) => row.id === editId);
  const initialFinishedId = existing?.outputItemId ?? defaultFinishedItemId(ledger.items);
  const [date, setDate] = useState(existing?.date ?? todayIso());
  const [outputItemId, setOutputItemId] = useState(initialFinishedId);
  const [outputGrade, setOutputGrade] = useState(existing?.outputGrade ?? "");
  const [outputQty, setOutputQty] = useState(existing ? String(existing.outputQty) : "");
  const [outputUnit, setOutputUnit] = useState<UnitCode>(
    existing?.outputUnit ?? ledger.items.find((row) => row.id === initialFinishedId)?.baseUnit ?? "jin",
  );
  const [warehouseId, setWarehouseId] = useState(existing?.warehouseId ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [consumes, setConsumes] = useState<ConsumeDraft[]>(
    existing?.consumes.length
      ? existing.consumes.map((row) => ({
          key: row.id,
          itemId: row.itemId,
          grade: row.grade,
          qty: String(row.qty),
          unit: row.unit,
        }))
      : [emptyConsume()],
  );
  const [error, setError] = useState("");

  const rawItems = ledger.items.filter((item) => item.kind === "raw" && (!item.archived || consumes.some((c) => c.itemId === item.id)));
  const finishedItems = ledger.items.filter((item) => item.kind === "finished" && (!item.archived || item.id === outputItemId));
  const warehouses = ledger.warehouses.filter((row) => !row.archived || row.id === warehouseId);
  const outputItem = ledger.items.find((row) => row.id === outputItemId);
  const outputUnits = outputItem ? allowedUnits(outputItem, ledger.unitConversions) : [];
  const previewStock = rawBalances(ledgerWithoutOrder(ledger, existing?.id));

  function setConsume(key: string, patch: Partial<ConsumeDraft>) {
    setConsumes((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidIsoDate(date)) {
      setError("日期無效");
      return;
    }
    const qtyNum = Number(outputQty);
    try {
      const record = buildWorkOrder({
        id: existing?.id ?? newId(),
        date,
        outputItemId,
        outputGrade,
        outputQty: qtyNum,
        outputUnit,
        warehouseId,
        consumes: consumes.map((row) => ({
          id: row.key,
          itemId: row.itemId,
          grade: row.grade,
          qty: Number(row.qty),
          unit: row.unit,
        })),
        note,
        ledger,
        now: existing?.createdAt,
      });
      if (existing) {
        record.createdAt = existing.createdAt;
        record.updatedAt = new Date().toISOString();
      }
      const ok = updateLedger((current) => ({
        ...current,
        workOrders: existing
          ? current.workOrders.map((row) => (row.id === existing.id ? record : row))
          : [...current.workOrders, record],
      }));
      if (!ok) {
        setError(useLedger.getState().saveError ?? "庫存不足，無法儲存");
        return;
      }
      router.push("/work-orders/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗");
    }
  }

  if (editId && !existing) {
    return <Alert severity="warning">找不到這張加工單。</Alert>;
  }

  return (
    <Stack component="form" spacing={2} sx={{ maxWidth: 560, mx: "auto" }} onSubmit={submit}>
      <Typography variant="h5">{existing ? "編輯加工單" : "新增加工單"}</Typography>
      <RocDateFields iso={isValidIsoDate(date) ? date : todayIso()} onChange={setDate} error={!isValidIsoDate(date) ? "日期無效" : undefined} />
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>耗用原料</Typography>
      {consumes.map((row, index) => {
        const item = ledger.items.find((i) => i.id === row.itemId);
        const units = item ? allowedUnits(item, ledger.unitConversions) : [];
        const bal = item ? previewStock.find((s) => s.itemId === row.itemId && s.grade === row.grade) : undefined;
        return (
          <Card key={row.key} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="body2" color="text.secondary">耗用 {index + 1}</Typography>
                  {consumes.length > 1 ? (
                    <IconButton aria-label="刪除此列" onClick={() => setConsumes((rows) => rows.filter((r) => r.key !== row.key))}>
                      <DeleteOutlined />
                    </IconButton>
                  ) : null}
                </Stack>
                <TextField
                  select
                  label="原料"
                  value={row.itemId}
                  onChange={(e) => {
                    const next = e.target.value;
                    const nextItem = ledger.items.find((i) => i.id === next);
                    setConsume(row.key, { itemId: next, unit: nextItem?.baseUnit ?? "jin" });
                  }}
                >
                  <MenuItem value="">請選擇</MenuItem>
                  {rawItems.map((i) => (
                    <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="品級" value={row.grade} onChange={(e) => setConsume(row.key, { grade: e.target.value })}>
                  <MenuItem value="">未分級</MenuItem>
                  <MenuItem value="醜">醜</MenuItem>
                </TextField>
                <Stack direction="row" spacing={1.5}>
                  <TextField label="數量" inputMode="decimal" value={row.qty} onChange={(e) => setConsume(row.key, { qty: e.target.value })} />
                  <TextField select label="單位" value={row.unit} onChange={(e) => setConsume(row.key, { unit: e.target.value as UnitCode })}>
                    {units.map((u) => (
                      <MenuItem key={u} value={u}>{UNIT_LABEL[u]}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
                {bal ? (
                  <Typography variant="body2" color="text.secondary">
                    目前可耗用 {formatQty(bal.balance)} {UNIT_LABEL[bal.baseUnit]}
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
      <Button startIcon={<Add />} variant="outlined" onClick={() => setConsumes((rows) => [...rows, emptyConsume()])} sx={{ alignSelf: "flex-start" }}>
        新增耗用
      </Button>
      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>產出成品</Typography>
      <TextField
        select
        label="成品"
        value={outputItemId}
        onChange={(e) => {
          const next = e.target.value;
          setOutputItemId(next);
          const nextItem = ledger.items.find((i) => i.id === next);
          if (nextItem) setOutputUnit(nextItem.baseUnit);
        }}
      >
        <MenuItem value="">請選擇</MenuItem>
        {finishedItems.map((i) => (
          <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>
        ))}
      </TextField>
      <TextField select label="品級" value={outputGrade} onChange={(e) => setOutputGrade(e.target.value)}>
        <MenuItem value="">未分級</MenuItem>
        <MenuItem value="醜">醜</MenuItem>
      </TextField>
      <Stack direction="row" spacing={1.5}>
        <TextField label="產量" inputMode="decimal" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
        <TextField select label="單位" value={outputUnit} onChange={(e) => setOutputUnit(e.target.value as UnitCode)}>
          {outputUnits.map((u) => (
            <MenuItem key={u} value={u}>{UNIT_LABEL[u]}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <TextField select label="入庫倉" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
        <MenuItem value="">請選擇</MenuItem>
        {warehouses.map((w) => (
          <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
        ))}
      </TextField>
      <TextField label="備註" multiline minRows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction="row" spacing={1.5}>
        <Button fullWidth variant="outlined" onClick={() => router.push("/work-orders/")}>取消</Button>
        <Button fullWidth type="submit" variant="contained">儲存</Button>
      </Stack>
    </Stack>
  );
}
