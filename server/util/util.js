export const safeRound = (num) => {
  return Math.round((num + Number.EPSILON) * 1e12) / 1e12;
}