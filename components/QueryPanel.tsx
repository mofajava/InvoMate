"use client";

import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { monthRange, todayRoc } from "@/lib/calendar";
import { emptyQuery, isQueryActive } from "@/lib/query";
import type { InboundQuery, Item, Supplier } from "@/lib/types";

type Props = {
  query: InboundQuery;
  onChange: (query: InboundQuery) => void;
  suppliers: Supplier[];
  items: Item[];
};

function isAdvancedActive(query: InboundQuery): boolean {
  return (
    query.amountMin !== null ||
    query.amountMax !== null ||
    query.qtyMin !== null ||
    query.qtyMax !== null ||
    query.unitPriceMin !== null ||
    query.unitPriceMax !== null ||
    query.grade !== null ||
    query.noteKeyword.trim() !== "" ||
    query.overriddenOnly ||
    query.sortField !== "date" ||
    query.sortDir !== "desc"
  );
}

export default function QueryPanel({ query, onChange, suppliers, items }: Props) {
  const roc = todayRoc();
  const advancedOn = isAdvancedActive(query);

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function num(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  const tags: { key: string; label: string; clear: () => InboundQuery }[] = [];
  if (query.supplierIds.length) {
    const names = suppliers.filter((s) => query.supplierIds.includes(s.id)).map((s) => s.name);
    tags.push({
      key: "sup",
      label: names.join("、"),
      clear: () => ({ ...query, supplierIds: [] }),
    });
  }
  if (query.itemIds.length) {
    const names = items.filter((s) => query.itemIds.includes(s.id)).map((s) => s.name);
    tags.push({ key: "item", label: names.join("、"), clear: () => ({ ...query, itemIds: [] }) });
  }
  if (query.dateFrom || query.dateTo) {
    tags.push({
      key: "date",
      label: `${query.dateFrom ?? "起"}～${query.dateTo ?? "迄"}`,
      clear: () => ({ ...query, dateFrom: null, dateTo: null }),
    });
  }
  if (query.amountMin !== null || query.amountMax !== null) {
    tags.push({
      key: "amt",
      label: `金額 ${query.amountMin ?? "—"}～${query.amountMax ?? "—"}`,
      clear: () => ({ ...query, amountMin: null, amountMax: null }),
    });
  }
  if (query.qtyMin !== null || query.qtyMax !== null) {
    tags.push({
      key: "qty",
      label: `數量 ${query.qtyMin ?? "—"}～${query.qtyMax ?? "—"}`,
      clear: () => ({ ...query, qtyMin: null, qtyMax: null }),
    });
  }
  if (query.unitPriceMin !== null || query.unitPriceMax !== null) {
    tags.push({
      key: "price",
      label: `單價 ${query.unitPriceMin ?? "—"}～${query.unitPriceMax ?? "—"}`,
      clear: () => ({ ...query, unitPriceMin: null, unitPriceMax: null }),
    });
  }
  if (query.grade !== null) {
    tags.push({
      key: "grade",
      label: query.grade === "" ? "未分級" : `品級 ${query.grade}`,
      clear: () => ({ ...query, grade: null }),
    });
  }
  if (query.noteKeyword.trim()) {
    tags.push({
      key: "note",
      label: `備註 ${query.noteKeyword}`,
      clear: () => ({ ...query, noteKeyword: "" }),
    });
  }
  if (query.overriddenOnly) {
    tags.push({ key: "ov", label: "僅覆寫", clear: () => ({ ...query, overriddenOnly: false }) });
  }

  return (
    <Stack spacing={1.5}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography sx={{ fontWeight: 500 }}>查詢</Typography>
          <div>
            <Typography variant="caption" color="text.secondary">
              供應商
            </Typography>
            <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
              {suppliers.map((s) => (
                <Chip
                  key={s.id}
                  label={s.name}
                  clickable
                  color={query.supplierIds.includes(s.id) ? "primary" : "default"}
                  variant={query.supplierIds.includes(s.id) ? "filled" : "outlined"}
                  onClick={() => onChange({ ...query, supplierIds: toggle(query.supplierIds, s.id) })}
                />
              ))}
            </Stack>
          </div>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="日期起"
              placeholder="2025-09-01"
              value={query.dateFrom ?? ""}
              onChange={(e) => onChange({ ...query, dateFrom: e.target.value || null })}
            />
            <TextField
              label="日期迄"
              placeholder="2025-09-30"
              value={query.dateTo ?? ""}
              onChange={(e) => onChange({ ...query, dateTo: e.target.value || null })}
            />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => {
                const range = monthRange(roc.year, roc.month);
                onChange({ ...query, dateFrom: range.from, dateTo: range.to });
              }}
            >
              本月
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                const prevMonth = roc.month === 1 ? 12 : roc.month - 1;
                const prevYear = roc.month === 1 ? roc.year - 1 : roc.year;
                const range = monthRange(prevYear, prevMonth);
                onChange({ ...query, dateFrom: range.from, dateTo: range.to });
              }}
            >
              上月
            </Button>
          </Stack>
          <div>
            <Typography variant="caption" color="text.secondary">
              品項
            </Typography>
            <Stack direction="row" sx={{ mt: 0.5, flexWrap: "wrap", gap: 1 }}>
              {items.map((item) => (
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
          <Accordion disableGutters elevation={0} sx={{ "&:before": { display: "none" }, border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography>進階條件</Typography>
                {advancedOn ? <Chip size="small" color="primary" label="已套用" /> : null}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField label="金額最小" inputMode="numeric" value={query.amountMin ?? ""} onChange={(e) => onChange({ ...query, amountMin: num(e.target.value) })} />
                  <TextField label="金額最大" inputMode="numeric" value={query.amountMax ?? ""} onChange={(e) => onChange({ ...query, amountMax: num(e.target.value) })} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField label="基準數量最小" inputMode="decimal" value={query.qtyMin ?? ""} onChange={(e) => onChange({ ...query, qtyMin: num(e.target.value) })} />
                  <TextField label="基準數量最大" inputMode="decimal" value={query.qtyMax ?? ""} onChange={(e) => onChange({ ...query, qtyMax: num(e.target.value) })} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField label="單價最小" inputMode="numeric" value={query.unitPriceMin ?? ""} onChange={(e) => onChange({ ...query, unitPriceMin: num(e.target.value) })} />
                  <TextField label="單價最大" inputMode="numeric" value={query.unitPriceMax ?? ""} onChange={(e) => onChange({ ...query, unitPriceMax: num(e.target.value) })} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    select
                    label="品級"
                    value={query.grade === null ? "__any__" : query.grade === "" ? "__empty__" : query.grade}
                    onChange={(e) => {
                      const value = e.target.value;
                      onChange({
                        ...query,
                        grade: value === "__any__" ? null : value === "__empty__" ? "" : value,
                      });
                    }}
                  >
                    <MenuItem value="__any__">不限</MenuItem>
                    <MenuItem value="__empty__">未分級</MenuItem>
                    <MenuItem value="醜">醜</MenuItem>
                  </TextField>
                  <TextField label="備註關鍵字" value={query.noteKeyword} onChange={(e) => onChange({ ...query, noteKeyword: e.target.value })} />
                </Stack>
                <TextField
                  select
                  label="排序"
                  value={`${query.sortField}:${query.sortDir}`}
                  onChange={(e) => {
                    const [sortField, sortDir] = e.target.value.split(":") as [InboundQuery["sortField"], InboundQuery["sortDir"]];
                    onChange({ ...query, sortField, sortDir });
                  }}
                >
                  <MenuItem value="date:desc">日期新到舊</MenuItem>
                  <MenuItem value="date:asc">日期舊到新</MenuItem>
                  <MenuItem value="amount:desc">金額高到低</MenuItem>
                  <MenuItem value="amount:asc">金額低到高</MenuItem>
                  <MenuItem value="qtyInBase:desc">數量高到低</MenuItem>
                  <MenuItem value="qtyInBase:asc">數量低到高</MenuItem>
                  <MenuItem value="supplier:asc">供應商</MenuItem>
                </TextField>
                <FormControlLabel
                  control={<Switch checked={query.overriddenOnly} onChange={(e) => onChange({ ...query, overriddenOnly: e.target.checked })} />}
                  label="僅覆寫金額"
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
          <Button variant="text" onClick={() => onChange(emptyQuery())} sx={{ alignSelf: "flex-start" }}>
            清除查詢
          </Button>
        </Stack>
      </Paper>
      {isQueryActive(query) ? (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {tags.map((tag) => (
            <Chip key={tag.key} label={tag.label} onDelete={() => onChange(tag.clear())} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
