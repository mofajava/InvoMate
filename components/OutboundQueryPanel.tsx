"use client";

import ExpandMore from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DateField from "@/components/DateField";
import { lastMonthRange, thisMonthRange } from "@/lib/calendar";
import { AR_LABEL } from "@/lib/master";
import { emptyOutboundQuery, isOutboundQueryActive } from "@/lib/outbound-query";
import type { Customer, Item, OutboundQuery, Warehouse } from "@/lib/types";

type Props = {
  query: OutboundQuery;
  onChange: (query: OutboundQuery) => void;
  customers: Customer[];
  items: Item[];
  warehouses: Warehouse[];
};

function isAdvancedActive(query: OutboundQuery): boolean {
  return (
    query.arStatus !== null ||
    query.amountMin !== null ||
    query.amountMax !== null ||
    query.noteKeyword.trim() !== "" ||
    query.sortField !== "date" ||
    query.sortDir !== "desc"
  );
}

export default function OutboundQueryPanel({ query, onChange, customers, items, warehouses }: Props) {
  const advancedOn = isAdvancedActive(query);
  const finished = items.filter((item) => item.kind === "finished");

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function num(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  const tags: { key: string; label: string; clear: () => OutboundQuery }[] = [];
  if (query.customerIds.length) {
    const names = customers.filter((s) => query.customerIds.includes(s.id)).map((s) => s.name);
    tags.push({ key: "cus", label: names.join("、"), clear: () => ({ ...query, customerIds: [] }) });
  }
  if (query.itemIds.length) {
    const names = items.filter((s) => query.itemIds.includes(s.id)).map((s) => s.name);
    tags.push({ key: "item", label: names.join("、"), clear: () => ({ ...query, itemIds: [] }) });
  }
  if (query.warehouseIds.length) {
    const names = warehouses.filter((s) => query.warehouseIds.includes(s.id)).map((s) => s.name);
    tags.push({ key: "wh", label: names.join("、"), clear: () => ({ ...query, warehouseIds: [] }) });
  }
  if (query.dateFrom || query.dateTo) {
    tags.push({
      key: "date",
      label: `${query.dateFrom ?? "起"}～${query.dateTo ?? "迄"}`,
      clear: () => ({ ...query, dateFrom: null, dateTo: null }),
    });
  }
  if (query.arStatus) {
    tags.push({ key: "ar", label: AR_LABEL[query.arStatus], clear: () => ({ ...query, arStatus: null }) });
  }
  if (query.amountMin !== null || query.amountMax !== null) {
    tags.push({
      key: "amt",
      label: `金額 ${query.amountMin ?? "—"}～${query.amountMax ?? "—"}`,
      clear: () => ({ ...query, amountMin: null, amountMax: null }),
    });
  }
  if (query.noteKeyword.trim()) {
    tags.push({
      key: "note",
      label: `備註 ${query.noteKeyword}`,
      clear: () => ({ ...query, noteKeyword: "" }),
    });
  }

  const queryOn = isOutboundQueryActive(query);

  return (
    <Stack spacing={1.5}>
      <Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" }, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography sx={{ fontWeight: 500 }}>查詢</Typography>
            {queryOn ? <Chip size="small" color="primary" label="已套用" /> : null}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <div>
              <Typography variant="caption" color="text.secondary">客戶</Typography>
              <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
                {customers.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.name}
                    clickable
                    color={query.customerIds.includes(s.id) ? "primary" : "default"}
                    variant={query.customerIds.includes(s.id) ? "filled" : "outlined"}
                    onClick={() => onChange({ ...query, customerIds: toggle(query.customerIds, s.id) })}
                  />
                ))}
              </Stack>
            </div>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <DateField
                label="日期起"
                value={query.dateFrom ?? ""}
                onChange={(iso) => onChange({ ...query, dateFrom: iso || null })}
              />
              <DateField
                label="日期迄"
                value={query.dateTo ?? ""}
                onChange={(iso) => onChange({ ...query, dateTo: iso || null })}
              />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  const range = thisMonthRange();
                  onChange({ ...query, dateFrom: range.from, dateTo: range.to });
                }}
              >
                本月
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  const range = lastMonthRange();
                  onChange({ ...query, dateFrom: range.from, dateTo: range.to });
                }}
              >
                上月
              </Button>
            </Stack>
            <div>
              <Typography variant="caption" color="text.secondary">品項</Typography>
              <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
                {finished.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.name}
                    clickable
                    color={query.itemIds.includes(item.id) ? "primary" : "default"}
                    variant={query.itemIds.includes(item.id) ? "filled" : "outlined"}
                    onClick={() => onChange({ ...query, itemIds: toggle(query.itemIds, item.id) })}
                  />
                ))}
              </Stack>
            </div>
            <div>
              <Typography variant="caption" color="text.secondary">倉</Typography>
              <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
                {warehouses.map((row) => (
                  <Chip
                    key={row.id}
                    label={row.name}
                    clickable
                    color={query.warehouseIds.includes(row.id) ? "primary" : "default"}
                    variant={query.warehouseIds.includes(row.id) ? "filled" : "outlined"}
                    onClick={() => onChange({ ...query, warehouseIds: toggle(query.warehouseIds, row.id) })}
                  />
                ))}
              </Stack>
            </div>
            <Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" }, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Typography>進階條件</Typography>
                  {advancedOn ? <Chip size="small" color="primary" label="已套用" /> : null}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="應收"
                    value={query.arStatus ?? "__any__"}
                    onChange={(e) => {
                      const value = e.target.value;
                      onChange({ ...query, arStatus: value === "__any__" ? null : value as OutboundQuery["arStatus"] });
                    }}
                  >
                    <MenuItem value="__any__">不限</MenuItem>
                    <MenuItem value="unpaid">{AR_LABEL.unpaid}</MenuItem>
                    <MenuItem value="paid">{AR_LABEL.paid}</MenuItem>
                  </TextField>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField label="金額最小" inputMode="numeric" value={query.amountMin ?? ""} onChange={(e) => onChange({ ...query, amountMin: num(e.target.value) })} />
                    <TextField label="金額最大" inputMode="numeric" value={query.amountMax ?? ""} onChange={(e) => onChange({ ...query, amountMax: num(e.target.value) })} />
                  </Stack>
                  <TextField label="備註關鍵字" value={query.noteKeyword} onChange={(e) => onChange({ ...query, noteKeyword: e.target.value })} />
                  <TextField
                    select
                    label="排序"
                    value={`${query.sortField}:${query.sortDir}`}
                    onChange={(e) => {
                      const [sortField, sortDir] = e.target.value.split(":") as [OutboundQuery["sortField"], OutboundQuery["sortDir"]];
                      onChange({ ...query, sortField, sortDir });
                    }}
                  >
                    <MenuItem value="date:desc">日期新到舊</MenuItem>
                    <MenuItem value="date:asc">日期舊到新</MenuItem>
                    <MenuItem value="amount:desc">金額高到低</MenuItem>
                    <MenuItem value="amount:asc">金額低到高</MenuItem>
                  </TextField>
                </Stack>
              </AccordionDetails>
            </Accordion>
            <Button variant="text" onClick={() => onChange(emptyOutboundQuery())} sx={{ alignSelf: "flex-start" }}>
              清除查詢
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
      {queryOn ? (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag) => (
            <Chip key={tag.key} label={tag.label} onDelete={() => onChange(tag.clear())} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
