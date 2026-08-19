export function computedAmount(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

export function amountDiff(amount: number, computed: number): number {
  return amount - computed;
}

export function isAmountOverridden(amount: number, computed: number): 0 | 1 {
  return amount !== computed ? 1 : 0;
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("zh-TW");
}

export function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return qty.toLocaleString("zh-TW");
  const rounded = Math.round(qty * 100) / 100;
  return rounded.toLocaleString("zh-TW", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
