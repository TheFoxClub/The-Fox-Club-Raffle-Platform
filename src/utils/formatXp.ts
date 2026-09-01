export const formatXp = (value: number | string | null | undefined) => {
  const xp = Number(value);

  if (!Number.isFinite(xp)) {
    return "0,0";
  }

  return xp.toLocaleString("nb-NO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};