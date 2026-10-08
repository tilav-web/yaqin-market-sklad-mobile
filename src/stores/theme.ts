import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { darkColors, lightColors } from '@/theme/colors';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark', // Default to dark mode matching user request
      setMode: (mode) => set({ mode }),
      toggleTheme: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: next });
      },
    }),
    {
      name: 'yaqin-market-theme-mode',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isDark =
    mode === 'dark' || (mode === 'system' && Appearance.getColorScheme() === 'dark');

  const activeColors = isDark ? darkColors : lightColors;

  return {
    mode,
    isDark,
    colors: activeColors,
    setMode,
    toggleTheme,
  };
}
