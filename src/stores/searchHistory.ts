import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MAX_TERMS = 12;

interface SearchHistoryState {
  terms: string[];
  /** True once the persisted search history finished loading from AsyncStorage. */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /** Record a performed search; moves it to the front, de-duped (case-insensitive). */
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      terms: [],
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      add(term) {
        const t = term.trim();
        if (!t) return;
        set((state) => {
          const without = state.terms.filter((x) => x.toLowerCase() !== t.toLowerCase());
          return { terms: [t, ...without].slice(0, MAX_TERMS) };
        });
      },
      remove(term) {
        set((state) => ({ terms: state.terms.filter((x) => x !== term) }));
      },
      clear() {
        set({ terms: [] });
      },
    }),
    {
      name: 'yaqin-search-history',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ terms: s.terms }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
