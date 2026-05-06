// ============================================================
// Formatting Utilities
// ============================================================

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 1_000_000) + "M";
    }
    if (Math.abs(value) >= 1_000) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 1_000) + "K";
    }
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return (value * 100).toFixed(decimals) + "%";
}

export function formatAge(birthYear: number, year: number): number {
  return year - birthYear;
}

export function formatYear(year: number): string {
  return year.toString();
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
