"use client";

import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
    <Stack spacing={1}>
      <Stack direction="row" spacing={1.5}>
        <TextField
          label="民國年"
          value={roc.year}
          inputMode="numeric"
          onChange={(e) => update({ year: Number(e.target.value) || 0 })}
        />
        <TextField
          label="月"
          value={roc.month}
          inputMode="numeric"
          onChange={(e) => update({ month: Number(e.target.value) || 0 })}
        />
        <TextField
          label="日"
          value={roc.day}
          inputMode="numeric"
          onChange={(e) => update({ day: Number(e.target.value) || 0 })}
        />
      </Stack>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}
