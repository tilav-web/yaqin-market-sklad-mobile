import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { UserAddress } from '@/lib/types';

interface LocationState {
  coords: { latitude: number; longitude: number } | null;
  selectedAddress: UserAddress | null;
  permissionStatus: Location.PermissionStatus | null;
  loading: boolean;
  /** True once the persisted selectedAddress has finished loading from AsyncStorage. */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  requestPermission: () => Promise<boolean>;
  refresh: () => Promise<void>;
  /** Pick a saved address as the active location, or null to fall back to GPS. */
  setSelectedAddress: (address: UserAddress | null) => void;
  /** Switch back to the device's live GPS location. */
  useCurrentLocation: () => void;
  /** Drop the selected address on sign-out so the next user on this device
   *  doesn't inherit the previous account's saved delivery address. */
  reset: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      coords: null,
      selectedAddress: null,
      permissionStatus: null,
      loading: false,
      hasHydrated: false,
      setHasHydrated(v) {
        set({ hasHydrated: v });
      },

      async requestPermission() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        set({ permissionStatus: status });
        return status === 'granted';
      },

      async refresh() {
        set({ loading: true });
        try {
          let granted = get().permissionStatus === 'granted';
          if (!granted) {
            granted = await get().requestPermission();
          }
          if (!granted) {
            set({ loading: false });
            return;
          }
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          set({
            coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
            loading: false,
          });
        } catch {
          set({ loading: false });
        }
      },

      setSelectedAddress(address) {
        set({ selectedAddress: address });
      },

      useCurrentLocation() {
        set({ selectedAddress: null });
        void get().refresh();
      },

      reset() {
        set({ selectedAddress: null, coords: null });
      },
    }),
    {
      name: 'yaqin-location',
      storage: createJSONStorage(() => AsyncStorage),
      // Only the chosen address survives restarts; GPS coords/permission are
      // re-resolved live on every launch.
      partialize: (s) => ({ selectedAddress: s.selectedAddress }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * The coordinates the app should query against: a manually picked saved
 * address takes priority over live GPS, otherwise we fall back to GPS.
 */
export function useEffectiveCoords(): { latitude: number; longitude: number } | null {
  const coords = useLocationStore((s) => s.coords);
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  if (selectedAddress) {
    return { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude };
  }
  return coords;
}
