export class InvalidDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDateError";
  }
}

export function rocToIso(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || year < 1) {
    throw new InvalidDateError("民國年無效");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new InvalidDateError("月份無效");
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new InvalidDateError("日期無效");
  }
  const gregorian = year + 1911;
  const date = new Date(Date.UTC(gregorian, month - 1, day));
  if (
    date.getUTCFullYear() !== gregorian ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new InvalidDateError("不是有效日曆日");
  }
  return `${gregorian}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isoToRoc(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new InvalidDateError("ISO 日期格式無效");
  }
  const gregorian = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  rocToIso(gregorian - 1911, month, day);
  return { year: gregorian - 1911, month, day };
}

export function isValidIsoDate(iso: string): boolean {
  try {
    isoToRoc(iso);
    return true;
  } catch {
    return false;
  }
}

export function formatRoc(iso: string): string {
  const { year, month, day } = isoToRoc(iso);
  return `${year}/${month}/${day}`;
}

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayRoc(): { year: number; month: number; day: number } {
  return isoToRoc(todayIso());
}

export function daysInMonth(rocYear: number, month: number): number {
  const iso = rocToIso(rocYear, month, 1);
  const [g] = iso.split("-").map(Number);
  return new Date(g, month, 0).getDate();
}

export function monthRange(rocYear: number, month: number): { from: string; to: string } {
  const last = daysInMonth(rocYear, month);
  return {
    from: rocToIso(rocYear, month, 1),
    to: rocToIso(rocYear, month, last),
  };
}
