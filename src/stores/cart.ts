import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CartLine } from '@/lib/types';

interface CartState {
  // Map of shopId -> CartLine[]
  carts: Record<string, CartLine[]>;
  addItem: (line: CartLine) => void;
  removeItem: (shopId: string, variantId: string) => void;
  updateQty: (shopId: string, variantId: string, qty: number) => void;
  clearShop: (shopId: string) => void;
  clearAll: () => void;
  getShopTotal: (shopId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      carts: {},

      addItem(line) {
        set((state) => {
          const existing = state.carts[line.shopId] ?? [];
          const idx = existing.findIndex((l) => l.variantId === line.variantId);
          let next: CartLine[];
          if (idx === -1) {
            next = [...existing, line];
          } else {
            next = existing.map((l, i) =>
              i === idx ? { ...l, quantity: l.quantity + line.quantity } : l,
            );
          }
          return { carts: { ...state.carts, [line.shopId]: next } };
        });
      },

      removeItem(shopId, variantId) {
        set((state) => {
          const existing = state.carts[shopId] ?? [];
          const filtered = existing.filter((l) => l.variantId !== variantId);
          const next = { ...state.carts };
          if (filtered.length === 0) delete next[shopId];
          else next[shopId] = filtered;
          return { carts: next };
        });
      },

      updateQty(shopId, variantId, qty) {
        if (qty <= 0) {
          get().removeItem(shopId, variantId);
          return;
        }
        set((state) => {
          const existing = state.carts[shopId] ?? [];
          return {
            carts: {
              ...state.carts,
              [shopId]: existing.map((l) =>
                l.variantId === variantId ? { ...l, quantity: qty } : l,
              ),
            },
          };
        });
      },

      clearShop(shopId) {
        set((state) => {
          const next = { ...state.carts };
          delete next[shopId];
          return { carts: next };
        });
      },

      clearAll() {
        set({ carts: {} });
      },

      getShopTotal(shopId) {
        const lines = get().carts[shopId] ?? [];
        return lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      },
    }),
    {
      name: 'yaqin-cart-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
