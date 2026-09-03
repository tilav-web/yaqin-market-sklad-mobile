/**
 * Safely resolves any string or localized object { uz, ru, kr } to a display string.
 * Prevents React Native "Objects are not valid as a React child" crashes.
 */
export function getLocalizedText(
  value: string | { uz?: string; ru?: string; kr?: string } | null | undefined,
  fallback = '',
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.uz || value.ru || value.kr || fallback;
  }
  return String(value);
}
