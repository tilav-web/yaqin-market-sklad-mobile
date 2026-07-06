import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AlarmMode = 'short' | 'long';

export interface ShopAlarm {
  /** Whether the new-order alarm rings for this shop on this device. */
  enabled: boolean;
  /** 'short' = one alert; 'long' = rings until the order is seen. */
  mode: AlarmMode;
}

// On by default with the "long" (ring-until-seen) mode — a shop wants to hear
// every incoming order. The seller can turn it off or shorten it per shop.
export const DEFAULT_ALARM: ShopAlarm = { enabled: true, mode: 'long' };

interface AlarmState {
  byShop: Record<string, ShopAlarm>;
  /** True once the persisted alarm settings finished loading from AsyncStorage. */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setEnabled: (shopId: string, enabled: boolean) => void;
  setMode: (shopId: string, mode: AlarmMode) => void;
  /** Drop per-shop alarm prefs on sign-out — a different seller logging in on
   *  this device shouldn't inherit the previous account's shop settings. */
  reset: () => void;
}

export const useAlarmSettingsStore = create<AlarmState>()(
  persist(
    (set) => ({
      byShop: {},
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setEnabled: (shopId, enabled) =>
        set((s) => ({
          byShop: { ...s.byShop, [shopId]: { ...(s.byShop[shopId] ?? DEFAULT_ALARM), enabled } },
        })),
      setMode: (shopId, mode) =>
        set((s) => ({
          byShop: { ...s.byShop, [shopId]: { ...(s.byShop[shopId] ?? DEFAULT_ALARM), mode } },
        })),
      reset: () => set({ byShop: {} }),
    }),
    {
      name: 'yaqin-order-alarm',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ byShop: s.byShop }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** Reactive per-shop alarm settings (falls back to the default). */
export function useShopAlarm(shopId: string | undefined): ShopAlarm {
  return useAlarmSettingsStore((s) => (shopId ? s.byShop[shopId] : undefined) ?? DEFAULT_ALARM);
}
