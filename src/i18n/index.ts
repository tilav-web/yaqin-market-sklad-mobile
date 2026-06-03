import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Lang, TName, TranslationKey, translations } from './translations';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'uz',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'yaqin-lang-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function tr(key: TranslationKey, params?: Record<string, string | number>, lang?: Lang): string {
  const l = lang ?? useLangStore.getState().lang;
  const dict = translations[l] as Record<string, string> | undefined;
  let str = dict?.[key] ?? translations.uz[key] ?? String(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function t(name: TName, lang?: Lang): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  const l = lang ?? useLangStore.getState().lang;
  if (l === 'ru') return name.ru || name.uz || '';
  if (l === 'uz_cyrl') return name.uz_cyrl || name.uz || '';
  return name.uz || name.ru || '';
}

/** Localize a category's name (which stores all three scripts as flat fields). */
export function catName(
  c: { nameUzLatn: string; nameUzCyrl: string; nameRu: string },
  lang?: Lang,
): string {
  return t({ uz: c.nameUzLatn, uz_cyrl: c.nameUzCyrl, ru: c.nameRu }, lang);
}

export function useTranslation() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  return {
    lang,
    setLang,
    tr: (key: TranslationKey, params?: Record<string, string | number>) => tr(key, params, lang),
    t: (name: TName) => t(name, lang),
    catName: (c: { nameUzLatn: string; nameUzCyrl: string; nameRu: string }) => catName(c, lang),
  };
}

export type { Lang, TName, TranslationKey };
