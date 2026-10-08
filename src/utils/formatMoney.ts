/**
 * Format a number or string as money with space thousand separators.
 * e.g. 50000 -> "50 000"
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '0';
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (isNaN(num)) return '0';
  return Math.round(num).toLocaleString('ru-RU').replace(/,/g, ' ');
}
