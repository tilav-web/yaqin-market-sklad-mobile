import * as Location from 'expo-location';
import { create } from 'zustand';

import { UserAddress } from '@/lib/types';

interface LocationState {
  coords: { latitude: number; longitude: number } | null;
  selectedAddress: UserAddress | null;
  permissionStatus: Location.PermissionStatus | null;
  loading: boolean;
  requestPermission: () => Promise<boolean>;
  refresh: () => Promise<void>;
  setSelectedAddress: (address: UserAddress | null) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: null,
  selectedAddress: null,
  permissionStatus: null,
  loading: false,

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
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
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
}));

export function useEffectiveCoords(): { latitude: number; longitude: number } | null {
  const { coords, selectedAddress } = useLocationStore();
  if (selectedAddress) {
    return { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude };
  }
  return coords;
}
