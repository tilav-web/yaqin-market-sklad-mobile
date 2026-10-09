/**
 * Shared validation and formatting utilities for Uzbekistan standard formats.
 */

/** Validates Uzbekistan phone number (e.g. +998901234567 or 901234567) */
export function isValidUzPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) return true;
  if (digits.length === 9) return true;
  return false;
}

/** Formats digits to standard +998XXXXXXXXX representation */
export function normalizeUzPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return phone.trim();
}

/** Validates 14-digit PINFL (JShShIR) */
export function isValidPinfl(pinfl: string): boolean {
  const clean = pinfl.trim();
  return /^\d{14}$/.test(clean);
}

/** Validates 9-digit STIR (INN) */
export function isValidStir(stir: string): boolean {
  const clean = stir.trim();
  return /^\d{9}$/.test(clean);
}

/** Validates price / monetary amount */
export function isValidAmount(val: unknown): boolean {
  const n = Number(val);
  return Number.isFinite(n) && n >= 0;
}
