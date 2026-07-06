/**
 * Parses a user-typed money/quantity string into a number, tolerating stray
 * separators — without misreading them as a decimal point.
 *
 * Everywhere in this app, amounts are DISPLAYED grouped with spaces (e.g.
 * `50000..toLocaleString('ru-RU')` -> "50 000"), never with a decimal point.
 * So when a user types "50.000" — almost always meaning "fifty thousand"
 * copied out of a receipt or muscle memory from a different locale — a naive
 * `parseFloat`/`Number` reads it as 50, silently losing three zeros. Since a
 * "." is never a legitimate decimal separator for these fields, it's treated
 * as a mis-typed thousands separator and stripped along with spaces.
 *
 * Only use this for money/whole-quantity fields formatted this way — NOT for
 * fields that display genuine decimals (e.g. a variant's `unitSize` in kg,
 * like "0.5"), where "." is a real decimal point and must be preserved.
 */
export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/[\s.]/g, '');
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}
