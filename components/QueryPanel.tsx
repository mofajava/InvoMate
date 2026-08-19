"use client";

import { monthRange, todayRoc } from "@/lib/calendar";
import { emptyQuery, isQueryActive } from "@/lib/query";
import type { InboundQuery, Item, Supplier } from "@/lib/types";

type Props = {
  query: InboundQuery;
  onChange: (query: InboundQuery) => void;
  suppliers: Supplier[];
  items: Item[];
};

export default function QueryPanel({ query, onChange, suppliers, items }: Props) {
  const roc = todayRoc();

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
  if (query.overriddenOnly) {
    tags.push({ key: "ov", label: "僅覆寫", clear: () => ({ ...query, overriddenOnly: false }) });
  }

  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-[#fffcf6] p-3">
      <details className="md:open">
        <summary className="cursor-pointer text-sm font-medium">查詢</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm text-neutral-600">供應商</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {suppliers.map((s) => (
                <label key={s.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={query.supplierIds.includes(s.id)}
                    onChange={() => onChange({ ...query, supplierIds: toggle(query.supplierIds, s.id) })}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm text-neutral-600">品項</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {items.map((item) => (
                <label key={item.id} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={query.itemIds.includes(item.id)}
                    onChange={() => onChange({ ...query, itemIds: toggle(query.itemIds, item.id) })}
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm">
            日期起（ISO）
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-2"
              value={query.dateFrom ?? ""}
              placeholder="2025-09-01"
              onChange={(e) => onChange({ ...query, dateFrom: e.target.value || null })}
            />
          </label>
          <label className="text-sm">
            日期迄（ISO）
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 px-2"
              value={query.dateTo ?? ""}
              placeholder="2025-09-30"
              onChange={(e) => onChange({ ...query, dateTo: e.target.value || null })}
            />
          </label>
          <div className="flex flex-wrap gap-2 text-sm md:col-span-2">
            <button
              type="button"
              className="rounded-lg border px-3"
              onClick={() => {
                const range = monthRange(roc.year, roc.month);
                onChange({ ...query, dateFrom: range.from, dateTo: range.to });
              }}
            >
              本月
            </button>
            <button
              type="button"
              className="rounded-lg border px-3"
              onClick={() => {
                const prevMonth = roc.month === 1 ? 12 : roc.month - 1;
                const prevYear = roc.month === 1 ? roc.year - 1 : roc.year;
                const range = monthRange(prevYear, prevMonth);
                onChange({ ...query, dateFrom: range.from, dateTo: range.to });
              }}
            >
              上月
            </button>
          </div>
          <label className="text-sm">
            金額最小
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="numeric" value={query.amountMin ?? ""} onChange={(e) => onChange({ ...query, amountMin: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            金額最大
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="numeric" value={query.amountMax ?? ""} onChange={(e) => onChange({ ...query, amountMax: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            基準數量最小
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="decimal" value={query.qtyMin ?? ""} onChange={(e) => onChange({ ...query, qtyMin: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            基準數量最大
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="decimal" value={query.qtyMax ?? ""} onChange={(e) => onChange({ ...query, qtyMax: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            單價最小
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="numeric" value={query.unitPriceMin ?? ""} onChange={(e) => onChange({ ...query, unitPriceMin: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            單價最大
            <input className="mt-1 w-full rounded-lg border px-2" inputMode="numeric" value={query.unitPriceMax ?? ""} onChange={(e) => onChange({ ...query, unitPriceMax: num(e.target.value) })} />
          </label>
          <label className="text-sm">
            品級
            <select
              className="mt-1 w-full rounded-lg border px-2"
              value={query.grade === null ? "__any__" : query.grade === "" ? "__empty__" : query.grade}
              onChange={(e) => {
                const value = e.target.value;
                onChange({
                  ...query,
                  grade: value === "__any__" ? null : value === "__empty__" ? "" : value,
                });
              }}
            >
              <option value="__any__">不限</option>
              <option value="__empty__">未分級</option>
              <option value="醜">醜</option>
            </select>
          </label>
          <label className="text-sm">
            備註關鍵字
            <input className="mt-1 w-full rounded-lg border px-2" value={query.noteKeyword} onChange={(e) => onChange({ ...query, noteKeyword: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={query.overriddenOnly} onChange={(e) => onChange({ ...query, overriddenOnly: e.target.checked })} />
            僅覆寫金額
          </label>
          <label className="text-sm">
            排序
            <select
              className="mt-1 w-full rounded-lg border px-2"
              value={`${query.sortField}:${query.sortDir}`}
              onChange={(e) => {
                const [sortField, sortDir] = e.target.value.split(":") as [InboundQuery["sortField"], InboundQuery["sortDir"]];
                onChange({ ...query, sortField, sortDir });
              }}
            >
              <option value="date:desc">日期新到舊</option>
              <option value="date:asc">日期舊到新</option>
              <option value="amount:desc">金額高到低</option>
              <option value="amount:asc">金額低到高</option>
              <option value="qtyInBase:desc">數量高到低</option>
              <option value="qtyInBase:asc">數量低到高</option>
              <option value="supplier:asc">供應商</option>
            </select>
          </label>
        </div>
        <button type="button" className="mt-3 rounded-lg border px-3 text-sm" onClick={() => onChange(emptyQuery())}>
          清除查詢
        </button>
      </details>
      {isQueryActive(query) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button key={tag.key} type="button" className="rounded-full bg-stone-200 px-3 py-1 text-sm" onClick={() => onChange(tag.clear())}>
              {tag.label} ×
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
