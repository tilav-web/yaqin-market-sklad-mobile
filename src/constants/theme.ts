/**
 * Yaqin Market — Brand Theme
 *
 * Boxing-inspired color palette: Blue, Red, White.
 * Defines light + dark modes with semantic tokens used across the app.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Legacy palette — kept for older screens still importing `Brand`.
// `blue` is intentionally mapped to the red identity so the whole app reads as
// single-accent red. New screens should import from `@/theme` instead.
export const Brand = {
  blue: '#E8392E',
  blueDark: '#C42B22',
  blueLight: '#F36458',
  red: '#E8392E',
  redDark: '#C42B22',
  redLight: '#F36458',
  white: '#FFFFFF',
  black: '#191715',
  gray50: '#F6F4F2',
  gray100: '#ECE9E6',
  gray200: '#DEDAD6',
  gray400: '#A39D96',
  gray600: '#605B56',
  gray800: '#2C2A27',
  success: '#1F9D63',
  warning: '#E8951F',
  danger: '#E8392E',
} as const;

export const Colors = {
  light: {
    text: Brand.black,
    textSecondary: Brand.gray600,
    textOnPrimary: Brand.white,
    background: Brand.white,
    backgroundElement: Brand.gray50,
    backgroundSelected: Brand.gray100,
    border: Brand.gray200,
    primary: Brand.blue,
    primaryHover: Brand.blueDark,
    accent: Brand.red,
    accentHover: Brand.redDark,
    success: Brand.success,
    warning: Brand.warning,
    danger: Brand.danger,
    tint: Brand.blue,
    icon: Brand.gray600,
    tabIconDefault: Brand.gray400,
    tabIconSelected: Brand.blue,
  },
  dark: {
    text: Brand.white,
    textSecondary: '#B0B4BA',
    textOnPrimary: Brand.white,
    background: '#0B0B0D',
    backgroundElement: '#1A1A1F',
    backgroundSelected: '#2A2A30',
    border: Brand.gray800,
    primary: Brand.blueLight,
    primaryHover: Brand.blue,
    accent: Brand.redLight,
    accentHover: Brand.red,
    success: Brand.success,
    warning: Brand.warning,
    danger: Brand.redLight,
    tint: Brand.blueLight,
    icon: '#B0B4BA',
    tabIconDefault: Brand.gray400,
    tabIconSelected: Brand.blueLight,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
  eight: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
