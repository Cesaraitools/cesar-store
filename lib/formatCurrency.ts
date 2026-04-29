export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-EG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}