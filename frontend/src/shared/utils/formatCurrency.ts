/** ₹ 34,999.00 */
export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value));

/** 34999 → "34,999" (no symbol) */
export const formatNumber = (value: number | string) =>
  new Intl.NumberFormat('en-IN').format(Number(value));
