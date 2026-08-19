"use client";

import Add from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
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
import ExportDialog from "@/components/ExportDialog";
import ImportLedgerButton from "@/components/ImportLedgerButton";
import QueryPanel from "@/components/QueryPanel";
import { formatRoc } from "@/lib/calendar";
import { amountDiff, formatMoney, formatQty } from "@/lib/money";
import { emptyQuery, filterInbounds, queryTotals } from "@/lib/query";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function InboundsBody() {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const [query, setQuery] = useState(emptyQuery);
  const rows = useMemo(
    () => filterInbounds(ledger.inboundRecords, query, ledger.suppliers),
    [ledger.inboundRecords, ledger.suppliers, query],
  );
  const totals = queryTotals(rows);
  const nameOf = {
    supplier: (id: string) => ledger.suppliers.find((s) => s.id === id)?.name ?? id,
    item: (id: string) => ledger.items.find((s) => s.id === id)?.name ?? id,
  };

  function remove(id: string) {
    if (!confirm("確定刪除這筆進貨？")) return;
    updateLedger((current) => ({
      ...current,
      inboundRecords: current.inboundRecords.filter((row) => row.id !== id),
    }));
  }

  const summary = (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
      <Typography variant="body2">
        {totals.count} 筆 · 數量 {formatQty(totals.qtyInBase)} · 金額 {formatMoney(totals.amount)} 元
      </Typography>
    </Paper>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h5">進貨</Typography>
        <Stack direction="row" sx={{ display: { xs: "none", sm: "flex" }, flexWrap: "wrap", gap: 1 }}>
          <ImportLedgerButton />
          <ExportDialog query={query} />
          <Button variant="contained" startIcon={<Add />} onClick={() => router.push("/inbounds/new/")}>
            新增進貨
          </Button>
        </Stack>
        <Stack direction="row" sx={{ display: { xs: "flex", sm: "none" }, flexWrap: "wrap", gap: 1 }}>
          <ImportLedgerButton />
          <ExportDialog query={query} />
        </Stack>
      </Stack>
      <QueryPanel query={query} onChange={setQuery} suppliers={ledger.suppliers} items={ledger.items} />
      {summary}
      <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
        {rows.length === 0 ? <Typography color="text.secondary">沒有符合的進貨</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {nameOf.supplier(row.supplierId)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {nameOf.item(row.itemId)}
                {row.grade ? `／${row.grade}` : ""}
              </Typography>
              <Typography variant="body2">
                {formatQty(row.qty)} {UNIT_LABEL[row.unit]} · {formatMoney(row.unitPrice)} 元 · {formatMoney(row.amount)} 元
              </Typography>
              {row.amountOverridden ? (
                <Chip
                  size="small"
                  color="warning"
                  sx={{ mt: 1 }}
                  label={`公式 ${formatMoney(row.computedAmount)}，差 ${formatMoney(amountDiff(row.amount, row.computedAmount))}`}
                />
              ) : null}
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => router.push(`/inbounds/edit/?id=${row.id}`)}>編輯</Button>
              <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["日期", "供應商", "品項", "數量", "基準", "單價", "金額", ""].map((h) => (
                <TableCell key={h}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatRoc(row.date)}</TableCell>
                <TableCell>{nameOf.supplier(row.supplierId)}</TableCell>
                <TableCell>
                  {nameOf.item(row.itemId)}
                  {row.grade ? `／${row.grade}` : ""}
                </TableCell>
                <TableCell>
                  {formatQty(row.qty)} {UNIT_LABEL[row.unit]}
                </TableCell>
                <TableCell>{formatQty(row.qtyInBase)}</TableCell>
                <TableCell>{formatMoney(row.unitPrice)}</TableCell>
                <TableCell>
                  {formatMoney(row.amount)}
                  {row.amountOverridden ? (
                    <Typography variant="caption" sx={{ color: "warning.main", display: "block" }}>
                      公式 {formatMoney(row.computedAmount)} 差 {formatMoney(amountDiff(row.amount, row.computedAmount))}
                    </Typography>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => router.push(`/inbounds/edit/?id=${row.id}`)}>編輯</Button>
                  <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {summary}
      <Box sx={{ display: { sm: "none" } }}>
        <Fab
          color="primary"
          aria-label="新增進貨"
          onClick={() => router.push("/inbounds/new/")}
          sx={{ position: "fixed", right: 16, bottom: 80 }}
        >
          <Add />
        </Fab>
      </Box>
    </Stack>
  );
}

export default function Page() {
  return (
    <AppShell>
      <InboundsBody />
    </AppShell>
  );
}
