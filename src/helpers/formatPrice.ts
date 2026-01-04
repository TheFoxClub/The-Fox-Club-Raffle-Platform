export const formatPrice = (value: number | string) => {
  if (value === null || value === undefined) return "";

  const str = value.toString();

  // Remove trailing zeros but keep meaningful decimals
  return str.replace(/(\.\d*?[1-9])0+$/g, "$1").replace(/\.0+$/, "");
};
