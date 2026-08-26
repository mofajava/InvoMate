"use client";

import Add from "@mui/icons-material/Add";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Fab from "@mui/material/Fab";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { formatRoc } from "@/lib/calendar";
import { formatQty } from "@/lib/money";
import { useLedger } from "@/lib/store";
import { UNIT_LABEL } from "@/lib/units";

function Body() {
  const router = useRouter();
  const { ledger, updateLedger } = useLedger();
  const itemName = (id: string) => ledger.items.find((i) => i.id === id)?.name ?? id;
  const warehouseName = (id: string) => ledger.warehouses.find((i) => i.id === id)?.name ?? id;
  const rows = [...ledger.transfers].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  function remove(id: string) {
    if (!confirm("確定刪除這筆調撥？")) return;
    updateLedger((current) => ({
      ...current,
      transfers: current.transfers.filter((row) => row.id !== id),
    }));
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5">調撥</Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ display: { xs: "none", sm: "inline-flex" } }} onClick={() => router.push("/transfers/new/")}>
          新增調撥
        </Button>
      </Stack>
      <Stack spacing={1.5}>
        {rows.length === 0 ? <Typography color="text.secondary">尚無調撥</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {itemName(row.itemId)}
                {row.grade ? `／${row.grade}` : ""}
              </Typography>
              <Typography variant="body2">
                {warehouseName(row.fromWarehouseId)} → {warehouseName(row.toWarehouseId)} · {formatQty(row.qty)} {UNIT_LABEL[row.unit]}
              </Typography>
              {row.note ? <Typography variant="body2" color="text.secondary">{row.note}</Typography> : null}
            </CardContent>
            <CardActions>
              <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
      <Box sx={{ display: { sm: "none" } }}>
        <Fab color="primary" aria-label="新增調撥" onClick={() => router.push("/transfers/new/")} sx={{ position: "fixed", right: 16, bottom: 16 }}>
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
