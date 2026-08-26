"use client";

import Add from "@mui/icons-material/Add";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { formatRoc } from "@/lib/calendar";
import { formatQty } from "@/lib/money";
import { useLedger } from "@/lib/store";

const REASON: Record<string, string> = {
  stocktake: "盤點",
  consume: "耗用",
  spoilage: "報損",
  other: "其他",
};

function Body() {
  const router = useRouter();
  const { ledger } = useLedger();
  const itemName = (id: string) => ledger.items.find((i) => i.id === id)?.name ?? id;
  const warehouseName = (id: string) => ledger.warehouses.find((i) => i.id === id)?.name ?? id;
  const rows = [...ledger.stockAdjustments].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5">庫存調整</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => router.push("/adjustments/new/")}>
          新增調整
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        調整是增減量，不是盤後餘額；不計入進貨金額。
      </Typography>
      <Stack spacing={1.5}>
        {rows.length === 0 ? <Typography color="text.secondary">尚無調整</Typography> : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardContent>
              <Typography sx={{ fontWeight: 500 }}>
                {formatRoc(row.date)} · {itemName(row.itemId)}
                {row.grade ? `／${row.grade}` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {row.qtyInBase > 0 ? "+" : ""}
                {formatQty(row.qtyInBase)} · {REASON[row.reason]}
                {row.warehouseId ? ` · ${warehouseName(row.warehouseId)}` : ""}
                {row.note ? ` · ${row.note}` : ""}
              </Typography>
            </CardContent>
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
