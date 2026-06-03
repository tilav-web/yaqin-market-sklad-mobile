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
  setEnabled: (shopId: string, enabled: boolean) => void;
  setMode: (shopId: string, mode: AlarmMode) => void;
}

export const useAlarmSettingsStore = create<AlarmState>()(
  persist(
    (set) => ({
      byShop: {},
      setEnabled: (shopId, enabled) =>
        set((s) => ({
          byShop: { ...s.byShop, [shopId]: { ...(s.byShop[shopId] ?? DEFAULT_ALARM), enabled } },
        })),
      setMode: (shopId, mode) =>
        set((s) => ({
          byShop: { ...s.byShop, [shopId]: { ...(s.byShop[shopId] ?? DEFAULT_ALARM), mode } },
        })),
    }),
    {
      name: 'yaqin-order-alarm',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ byShop: s.byShop }),
    },
  ),
);

/** Reactive per-shop alarm settings (falls back to the default). */
export function useShopAlarm(shopId: string | undefined): ShopAlarm {
  return useAlarmSettingsStore((s) => (shopId ? s.byShop[shopId] : undefined) ?? DEFAULT_ALARM);
}
