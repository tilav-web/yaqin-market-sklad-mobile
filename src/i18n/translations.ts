import { uz } from './locales/uz';
import { uz_cyrl } from './locales/uz_cyrl';
import { ru } from './locales/ru';

export type Lang = 'uz' | 'uz_cyrl' | 'ru';

export type TName =
  | string
  | { uz?: string; kr?: string; uz_cyrl?: string; ru?: string }
  | null
  | undefined;

export const translations = {
  uz,
  uz_cyrl,
  ru,
} as const;

export type TranslationKey = keyof typeof translations.uz;
