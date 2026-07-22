export type CardBrand = 'uzcard' | 'humo' | null;

/**
 * Uzbek bank cards are identified by their leading digits (BIN): Uzcard issues
 * under 8600, Humo under 9860. Works on a masked number too (e.g.
 * "8600 **** **** 1234") since Click/banks always leave the BIN visible.
 */
export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('8600')) return 'uzcard';
  if (digits.startsWith('9860')) return 'humo';
  return null;
}

export const CARD_BRAND_LABEL: Record<Exclude<CardBrand, null>, string> = {
  uzcard: 'UZCARD',
  humo: 'HUMO',
};
