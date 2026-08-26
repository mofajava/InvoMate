"use client";

import TextField from "@mui/material/TextField";
import { isValidIsoDate } from "@/lib/calendar";

type Props = {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
};

export default function DateField({ label = "日期", value, onChange, error }: Props) {
  return (
    <TextField
      type="date"
      label={label}
      value={isValidIsoDate(value) ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      error={Boolean(error)}
      helperText={error}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}
