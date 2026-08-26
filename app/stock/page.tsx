"use client";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import AppShell from "@/components/AppShell";
import { formatQty } from "@/lib/money";
import { finishedBalances, rawBalances } from "@/lib/stock";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function Body() {
  const { ledger } = useLedger();
  const rawRows = rawBalances(ledger);
  const finishedRows = finishedBalances(ledger);
  const negative = rawRows.some((row) => row.balance < 0) || finishedRows.some((row) => row.balance < 0);

  return (
    <Stack spacing={3}>
      <Typography variant="h5">庫存</Typography>
      <Stack spacing={1.5}>
        <Typography variant="h6">原料</Typography>
        <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
          {rawRows.length === 0 ? <Typography color="text.secondary">尚無原料庫存</Typography> : null}
          {rawRows.map((row) => (
            <Card key={`${row.itemId}-${row.grade}`}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography sx={{ fontWeight: 500 }}>{row.itemName}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.grade || "未分級"}</Typography>
                </div>
                <Typography sx={{ fontWeight: 600, color: row.balance < 0 ? "error.main" : "text.primary" }}>
                  {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>品項</TableCell>
                <TableCell>品級</TableCell>
                <TableCell>餘額</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rawRows.map((row) => (
                <TableRow key={`${row.itemId}-${row.grade}`} hover>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.grade || "未分級"}</TableCell>
                  <TableCell sx={{ color: row.balance < 0 ? "error.main" : "inherit" }}>
                    {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
      <Stack spacing={1.5}>
        <Typography variant="h6">成品（依倉）</Typography>
        <Stack spacing={1.5} sx={{ display: { md: "none" } }}>
          {finishedRows.length === 0 ? <Typography color="text.secondary">尚無成品庫存</Typography> : null}
          {finishedRows.map((row) => (
            <Card key={`${row.itemId}-${row.grade}-${row.warehouseId}`}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <Typography sx={{ fontWeight: 500 }}>{row.itemName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.warehouseName} · {row.grade || "未分級"}
                  </Typography>
                </div>
                <Typography sx={{ fontWeight: 600, color: row.balance < 0 ? "error.main" : "text.primary" }}>
                  {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: "none", md: "block" } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>品項</TableCell>
                <TableCell>品級</TableCell>
                <TableCell>倉</TableCell>
                <TableCell>餘額</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {finishedRows.map((row) => (
                <TableRow key={`${row.itemId}-${row.grade}-${row.warehouseId}`} hover>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{row.grade || "未分級"}</TableCell>
                  <TableCell>{row.warehouseName}</TableCell>
                  <TableCell sx={{ color: row.balance < 0 ? "error.main" : "inherit" }}>
                    {formatQty(row.balance)} {UNIT_LABEL[row.baseUnit]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
      {negative ? <Alert severity="warning">有品項庫存為負，請核對進貨、加工、出貨或調整。</Alert> : null}
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
