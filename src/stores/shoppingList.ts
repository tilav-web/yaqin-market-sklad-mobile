import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface ShoppingListState {
  items: ShoppingItem[];
  addItem: (text: string) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set) => ({
      items: [
        {
          id: 'sample-1',
          text: 'Non va sut',
          completed: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sample-2',
          text: '2 kg olma',
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],

      addItem(text: string) {
        const trimmed = text.trim();
        if (!trimmed) return;
        const newItem: ShoppingItem = {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          text: trimmed,
          completed: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ items: [newItem, ...state.items] }));
      },

      toggleItem(id: string) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item,
          ),
        }));
      },

      removeItem(id: string) {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearCompleted() {
        set((state) => ({
          items: state.items.filter((item) => !item.completed),
        }));
      },

      clearAll() {
        set({ items: [] });
      },
    }),
    {
      name: 'yaqin-shopping-list-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
