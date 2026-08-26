"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { formatRoc } from "@/lib/calendar";
import { AR_LABEL } from "@/lib/master";
import { formatMoney, formatQty } from "@/lib/money";
import { useLedger } from "@/lib/store";
import type { ArStatus } from "@/lib/types";
import { UNIT_LABEL } from "@/lib/units";

type Filter = ArStatus | "all";

function Body() {
  const { ledger, updateLedger } = useLedger();
  const [filter, setFilter] = useState<Filter>("unpaid");
  const rows = useMemo(() => {
    const list = [...ledger.outboundRecords].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    if (filter === "all") return list;
    return list.filter((row) => row.arStatus === filter);
  }, [ledger.outboundRecords, filter]);
  const unpaidTotal = ledger.outboundRecords.filter((row) => row.arStatus === "unpaid").reduce((sum, row) => sum + row.amount, 0);
  const customerName = (id: string) => ledger.customers.find((s) => s.id === id)?.name ?? id;
  const itemName = (id: string) => ledger.items.find((s) => s.id === id)?.name ?? id;

  function setPaid(id: string, arStatus: ArStatus) {
    updateLedger((current) => ({
      ...current,
      outboundRecords: current.outboundRecords.map((row) =>
        row.id === id ? { ...row, arStatus, updatedAt: new Date().toISOString() } : row,
      ),
    }));
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5">應收</Typography>
      <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2">未收合計 {formatMoney(unpaidTotal)} 元</Typography>
      </Paper>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {([
          ["unpaid", "未收"],
          ["paid", "已收"],
          ["all", "全部"],
        ] as const).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            clickable
            color={filter === key ? "primary" : "default"}
            variant={filter === key ? "filled" : "outlined"}
            onClick={() => setFilter(key)}
          />
        ))}
      </Stack>
      <Stack spacing={1.5}>
        {rows.length === 0 ? <Typography color="text.secondary">沒有符合的出貨</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {customerName(row.customerId)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {itemName(row.itemId)}
                {row.grade ? `／${row.grade}` : ""} · {formatQty(row.qty)} {UNIT_LABEL[row.unit]}
              </Typography>
              <Typography variant="body2">{formatMoney(row.amount)} 元</Typography>
              <Chip size="small" sx={{ mt: 1 }} color={row.arStatus === "unpaid" ? "warning" : "success"} label={AR_LABEL[row.arStatus]} />
            </CardContent>
            <CardActions>
              {row.arStatus === "unpaid" ? (
                <Button size="small" onClick={() => setPaid(row.id, "paid")}>改為已收</Button>
              ) : (
                <Button size="small" onClick={() => setPaid(row.id, "unpaid")}>改回未收</Button>
              )}
            </CardActions>
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
