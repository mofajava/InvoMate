"use client";

import Add from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import OutboundQueryPanel from "@/components/OutboundQueryPanel";
import { formatRoc } from "@/lib/calendar";
import { AR_LABEL } from "@/lib/master";
import { amountDiff, formatMoney, formatQty } from "@/lib/money";
import { emptyOutboundQuery, filterOutbounds } from "@/lib/outbound-query";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function Body() {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const [query, setQuery] = useState(emptyOutboundQuery);
  const rows = useMemo(
    () => filterOutbounds(ledger.outboundRecords, query, ledger.customers),
    [ledger.outboundRecords, ledger.customers, query],
  );
  const totals = {
    count: rows.length,
    qtyInBase: rows.reduce((sum, row) => sum + row.qtyInBase, 0),
    amount: rows.reduce((sum, row) => sum + row.amount, 0),
    unpaid: rows.filter((row) => row.arStatus === "unpaid").reduce((sum, row) => sum + row.amount, 0),
  };
  const nameOf = {
    customer: (id: string) => ledger.customers.find((s) => s.id === id)?.name ?? id,
    item: (id: string) => ledger.items.find((s) => s.id === id)?.name ?? id,
    warehouse: (id: string) => ledger.warehouses.find((s) => s.id === id)?.name ?? id,
  };

  function remove(id: string) {
    if (!confirm("確定刪除這筆出貨？")) return;
    updateLedger((current) => ({
      ...current,
      outboundRecords: current.outboundRecords.filter((row) => row.id !== id),
    }));
  }

  const summary = (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
      <Typography variant="body2">
        {totals.count} 筆 · 數量 {formatQty(totals.qtyInBase)} · 金額 {formatMoney(totals.amount)} 元 · 未收 {formatMoney(totals.unpaid)} 元
      </Typography>
    </Paper>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5">出貨</Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ display: { xs: "none", sm: "inline-flex" } }} onClick={() => router.push("/outbounds/new/")}>
          新增出貨
        </Button>
      </Stack>
      <OutboundQueryPanel query={query} onChange={setQuery} customers={ledger.customers} items={ledger.items} warehouses={ledger.warehouses} />
      {summary}
      <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
        {rows.length === 0 ? <Typography color="text.secondary">沒有符合的出貨</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {nameOf.customer(row.customerId)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {nameOf.item(row.itemId)}
                {row.grade ? `／${row.grade}` : ""} · {nameOf.warehouse(row.warehouseId)}
              </Typography>
              <Typography variant="body2">
                {formatQty(row.qty)} {UNIT_LABEL[row.unit]} · {formatMoney(row.unitPrice)} 元 · {formatMoney(row.amount)} 元
              </Typography>
              <Chip size="small" sx={{ mt: 1 }} color={row.arStatus === "unpaid" ? "warning" : "success"} label={AR_LABEL[row.arStatus]} />
              {row.amountOverridden ? (
                <Chip
                  size="small"
                  color="warning"
                  sx={{ mt: 1, ml: 1 }}
                  label={`公式 ${formatMoney(row.computedAmount)}，差 ${formatMoney(amountDiff(row.amount, row.computedAmount))}`}
                />
              ) : null}
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => router.push(`/outbounds/edit/?id=${row.id}`)}>編輯</Button>
              <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["日期", "客戶", "品項", "倉", "數量", "金額", "應收", ""].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatRoc(row.date)}</TableCell>
                <TableCell>{nameOf.customer(row.customerId)}</TableCell>
                <TableCell>
                  {nameOf.item(row.itemId)}
                  {row.grade ? `／${row.grade}` : ""}
                </TableCell>
                <TableCell>{nameOf.warehouse(row.warehouseId)}</TableCell>
                <TableCell>
                  {formatQty(row.qty)} {UNIT_LABEL[row.unit]}
                </TableCell>
                <TableCell>
                  {formatMoney(row.amount)}
                  {row.amountOverridden ? (
                    <Typography variant="caption" sx={{ color: "warning.main", display: "block" }}>
                      公式 {formatMoney(row.computedAmount)} 差 {formatMoney(amountDiff(row.amount, row.computedAmount))}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>{AR_LABEL[row.arStatus]}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => router.push(`/outbounds/edit/?id=${row.id}`)}>編輯</Button>
                  <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {summary}
      <Box sx={{ display: { sm: "none" } }}>
        <Fab color="primary" aria-label="新增出貨" onClick={() => router.push("/outbounds/new/")} sx={{ position: "fixed", right: 16, bottom: 16 }}>
          <Add />
        </Fab>
      </Box>
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
