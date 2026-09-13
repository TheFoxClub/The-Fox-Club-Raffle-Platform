export const formatPrice = (value: number | string) => {
  if (value === null || value === undefined) return "";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(numericValue);
};
