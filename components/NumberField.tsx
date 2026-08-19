"use client";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  integer?: boolean;
};

export default function NumberField({ label, value, onChange, integer }: Props) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3"
        inputMode={integer ? "numeric" : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
