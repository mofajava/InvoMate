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
  const rows = [...ledger.workOrders].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  function remove(id: string) {
    if (!confirm("確定刪除這張加工單？")) return;
    updateLedger((current) => ({
      ...current,
      workOrders: current.workOrders.filter((row) => row.id !== id),
    }));
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5">加工單</Typography>
        <Button variant="contained" startIcon={<Add />} sx={{ display: { xs: "none", sm: "inline-flex" } }} onClick={() => router.push("/work-orders/new/")}>
          新增加工
        </Button>
      </Stack>
      <Stack spacing={1.5}>
        {rows.length === 0 ? <Typography color="text.secondary">尚無加工單</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {itemName(row.outputItemId)}
                {row.outputGrade ? `／${row.outputGrade}` : ""} → {warehouseName(row.warehouseId)}
              </Typography>
              <Typography variant="body2">
                產出 {formatQty(row.outputQty)} {UNIT_LABEL[row.outputUnit]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                耗用{" "}
                {row.consumes
                  .map((c) => `${itemName(c.itemId)}${c.grade ? `／${c.grade}` : ""} ${formatQty(c.qty)} ${UNIT_LABEL[c.unit]}`)
                  .join("、")}
              </Typography>
              {row.note ? <Typography variant="body2" color="text.secondary">{row.note}</Typography> : null}
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => router.push(`/work-orders/edit/?id=${row.id}`)}>編輯</Button>
              <Button size="small" color="error" onClick={() => remove(row.id)}>刪除</Button>
            </CardActions>
          </Card>
        ))}
      </Stack>
      <Box sx={{ display: { sm: "none" } }}>
        <Fab color="primary" aria-label="新增加工" onClick={() => router.push("/work-orders/new/")} sx={{ position: "fixed", right: 16, bottom: 16 }}>
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
