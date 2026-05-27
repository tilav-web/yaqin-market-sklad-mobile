/**
 * Yaqin Market color system.
 *
 * Built around a boxing-inspired identity: blue (trust), red (energy), white.
 * Tokens are semantic — components reference `colors.bg.surface` not `#fff`,
 * so future theming/dark-mode work changes only this file.
 */

const palette = {
  // Brand
  blue: '#0046AD',
  blueDark: '#003687',
  blueLight: '#3F73D4',
  blueSurface: '#EAF1FC',
  blueBorder: '#C9DBF5',

  red: '#E1251B',
  redDark: '#B81B14',
  redLight: '#EF4D44',
  redSurface: '#FFEAE9',
  redBorder: '#F8C6C2',

  // Neutrals (10-step gray ramp)
  white: '#FFFFFF',
  gray50: '#F7F8FA',
  gray100: '#EDEFF3',
  gray200: '#DDE1E8',
  gray300: '#C2C7D0',
  gray400: '#A0A6B1',
  gray500: '#7C8390',
  gray600: '#5F6671',
  gray700: '#444A55',
  gray800: '#2B2F37',
  gray900: '#15171C',
  black: '#0A0B0E',

  // Semantic
  success: '#19A974',
  successSurface: '#E4F6EE',
  warning: '#F4B400',
  warningSurface: '#FEF5DA',
  danger: '#E1251B',
  dangerSurface: '#FFEAE9',
  info: '#2E7CF0',
  infoSurface: '#E6F0FE',
};

export const colors = {
  palette,
  brand: {
    primary: palette.blue,
    primaryDark: palette.blueDark,
    primaryLight: palette.blueLight,
    primarySurface: palette.blueSurface,
    primaryBorder: palette.blueBorder,
    accent: palette.red,
    accentDark: palette.redDark,
    accentLight: palette.redLight,
    accentSurface: palette.redSurface,
    accentBorder: palette.redBorder,
  },
  bg: {
    canvas: palette.gray50,
    surface: palette.white,
    surfaceMuted: palette.gray100,
    surfaceElevated: palette.white,
    inversePrimary: palette.blue,
    inverseAccent: palette.red,
  },
  text: {
    primary: palette.gray900,
    secondary: palette.gray600,
    tertiary: palette.gray500,
    hint: palette.gray400,
    onPrimary: palette.white,
    onAccent: palette.white,
    onDark: palette.white,
    link: palette.blue,
    danger: palette.red,
    success: palette.success,
  },
  border: {
    subtle: palette.gray100,
    default: palette.gray200,
    strong: palette.gray300,
    focus: palette.blue,
    danger: palette.red,
  },
  status: {
    // Order status colors
    new: palette.warning,
    accepted: palette.info,
    preparing: '#8B5CF6',
    delivering: palette.blue,
    delivered: palette.success,
    cancelled: palette.gray500,
  },
  feedback: {
    success: palette.success,
    successSurface: palette.successSurface,
    warning: palette.warning,
    warningSurface: palette.warningSurface,
    danger: palette.danger,
    dangerSurface: palette.dangerSurface,
    info: palette.info,
    infoSurface: palette.infoSurface,
  },
  overlay: {
    scrim: 'rgba(10, 11, 14, 0.55)',
    light: 'rgba(255, 255, 255, 0.88)',
  },
} as const;

export type ColorTokens = typeof colors;
