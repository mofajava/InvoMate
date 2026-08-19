"use client";

import { isoToRoc, rocToIso, todayRoc } from "@/lib/calendar";

type Props = {
  iso: string;
  onChange: (iso: string) => void;
  error?: string;
};

export default function RocDateFields({ iso, onChange, error }: Props) {
  const roc = (() => {
    try {
      return isoToRoc(iso);
    } catch {
      return todayRoc();
    }
  })();

  function update(partial: Partial<typeof roc>) {
    const next = { ...roc, ...partial };
    try {
      onChange(rocToIso(next.year, next.month, next.day));
    } catch {
      onChange(`${next.year}-${String(next.month).padStart(2, "0")}-${String(next.day).padStart(2, "0")}`);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-sm">
          民國年
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2"
            inputMode="numeric"
            value={roc.year}
            onChange={(e) => update({ year: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block text-sm">
          月
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2"
            inputMode="numeric"
            value={roc.month}
            onChange={(e) => update({ month: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block text-sm">
          日
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2"
            inputMode="numeric"
            value={roc.day}
            onChange={(e) => update({ day: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
