const EUR = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatMoney(
  value: number | string | null | undefined,
): string {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return "—";
  return EUR.format(n);
}
