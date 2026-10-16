export function formatTaka(amount: number): string {
  const formatted = new Intl.NumberFormat("en-BD", {
    maximumFractionDigits: 0,
  }).format(amount);

  return `৳${formatted}`;
}
