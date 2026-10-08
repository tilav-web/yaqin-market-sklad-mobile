import { create } from 'zustand';

interface SearchModalState {
  isOpen: boolean;
  initialQuery: string;
  initialCategory: string | null;
  open: (query?: string, category?: string | null) => void;
  close: () => void;
}

export const useSearchModalStore = create<SearchModalState>((set) => ({
  isOpen: false,
  initialQuery: '',
  initialCategory: null,
  open: (query = '', category = null) =>
    set({ isOpen: true, initialQuery: query, initialCategory: category }),
  close: () => set({ isOpen: false, initialQuery: '', initialCategory: null }),
}));
