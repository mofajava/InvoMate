"use client";

import TextField from "@mui/material/TextField";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  integer?: boolean;
};

export default function NumberField({ label, value, onChange, integer }: Props) {
  return (
    <TextField
      label={label}
      value={value}
      inputMode={integer ? "numeric" : "decimal"}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
