/**
 * Yaqin Market color system.
 *
 * Single-accent identity: a confident, warm RED carries the brand.
 * Supports both Light mode (original white + red) and Dark mode (black + red).
 */

const palette = {
  // Brand red (warm, premium)
  red: '#E8392E',
  redDark: '#C42B22',
  redDarker: '#A11F18',
  red600: '#D62F26',
  redLight: '#F36458',
  redTint: '#FDECEA', // light mode surface
  redTintStrong: '#FBD9D5', // light mode border
  redGlow: 'rgba(232, 57, 46, 0.16)',

  // Warm neutrals
  white: '#FFFFFF',
  cream: '#FCFAF8', // light mode canvas
  gray50: '#F6F4F2',
  gray100: '#ECE9E6',
  gray200: '#DEDAD6',
  gray300: '#C5BFB9',
  gray400: '#A39D96',
  gray500: '#7E7872',
  gray600: '#605B56',
  gray700: '#46423E',
  gray800: '#2C2A27',
  gray900: '#191715',
  black: '#0D0C0B',

  // Dark neutrals
  darkBg: '#000000',
  darkSurface: '#121214',
  darkSurfaceMuted: '#1C1C1E',
  darkSurfaceElevated: '#242428',
  darkBorderSubtle: '#1F2937',
  darkBorderDefault: '#2D3748',

  // Semantic
  success: '#1F9D63',
  successSurface: '#E3F5EC',
  warning: '#E8951F',
  warningSurface: '#FCEFD8',
  danger: '#E8392E',
  dangerSurface: '#FDECEA',
  info: '#3D6B8E',
  infoSurface: '#E9EFF4',
} as const;

export const lightColors = {
  palette,
  brand: {
    primary: palette.red,
    primaryDark: palette.redDark,
    primaryDarker: palette.redDarker,
    primaryLight: palette.redLight,
    primarySurface: palette.redTint,
    primaryBorder: palette.redTintStrong,
    primaryGlow: palette.redGlow,
    accent: palette.red,
    accentDark: palette.redDark,
    accentLight: palette.redLight,
    accentSurface: palette.redTint,
    accentBorder: palette.redTintStrong,
  },
  bg: {
    canvas: palette.cream,
    surface: palette.white,
    surfaceMuted: palette.gray50,
    surfaceElevated: palette.white,
    tabBar: palette.white,
    tabBarBorder: palette.gray200,
    inversePrimary: palette.red,
    inverseAccent: palette.redDark,
  },
  text: {
    primary: palette.gray900,
    secondary: palette.gray600,
    tertiary: palette.gray500,
    hint: palette.gray400,
    onPrimary: palette.white,
    onAccent: palette.white,
    onDark: palette.white,
    link: palette.red,
    danger: palette.red,
    success: palette.success,
  },
  border: {
    subtle: palette.gray100,
    default: palette.gray200,
    strong: palette.gray300,
    focus: palette.red,
    danger: palette.red,
  },
  status: {
    new: palette.warning,
    accepted: palette.info,
    preparing: palette.redLight,
    delivering: palette.red,
    delivered: palette.success,
    cancelled: palette.gray500,
    seller_no_response: palette.warning,
    seller_rejected: palette.warning,
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
    scrim: 'rgba(13, 12, 11, 0.55)',
    light: 'rgba(255, 255, 255, 0.9)',
  },
  cardBrand: {
    uzcard: { base: '#1E5FBF', dark: '#123D7D', text: '#FFFFFF' },
    humo: { base: '#0EA37A', dark: '#0B6E54', text: '#FFFFFF' },
    unknown: { base: palette.gray700, dark: palette.gray900, text: '#FFFFFF' },
  },
} as const;

export const darkColors = {
  palette,
  brand: {
    primary: palette.red,
    primaryDark: palette.redDark,
    primaryDarker: palette.redDarker,
    primaryLight: palette.redLight,
    primarySurface: 'rgba(232, 57, 46, 0.18)',
    primaryBorder: 'rgba(232, 57, 46, 0.35)',
    primaryGlow: palette.redGlow,
    accent: palette.red,
    accentDark: palette.redDark,
    accentLight: palette.redLight,
    accentSurface: 'rgba(232, 57, 46, 0.18)',
    accentBorder: 'rgba(232, 57, 46, 0.35)',
  },
  bg: {
    canvas: palette.darkBg,
    surface: palette.darkSurface,
    surfaceMuted: palette.darkSurfaceMuted,
    surfaceElevated: palette.darkSurfaceElevated,
    tabBar: palette.darkSurfaceMuted,
    tabBarBorder: palette.darkBorderSubtle,
    inversePrimary: palette.red,
    inverseAccent: palette.redDark,
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#9CA3AF',
    tertiary: '#6B7280',
    hint: '#4B5563',
    onPrimary: palette.white,
    onAccent: palette.white,
    onDark: palette.white,
    link: palette.redLight,
    danger: palette.redLight,
    success: palette.success,
  },
  border: {
    subtle: palette.darkBorderSubtle,
    default: palette.darkBorderDefault,
    strong: '#374151',
    focus: palette.red,
    danger: palette.red,
  },
  status: {
    new: palette.warning,
    accepted: palette.info,
    preparing: palette.redLight,
    delivering: palette.red,
    delivered: palette.success,
    cancelled: palette.gray500,
    seller_no_response: palette.warning,
    seller_rejected: palette.warning,
  },
  feedback: {
    success: palette.success,
    successSurface: 'rgba(31, 157, 99, 0.2)',
    warning: palette.warning,
    warningSurface: 'rgba(232, 149, 31, 0.2)',
    danger: palette.danger,
    dangerSurface: 'rgba(232, 57, 46, 0.2)',
    info: palette.info,
    infoSurface: 'rgba(61, 107, 142, 0.2)',
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.75)',
    light: 'rgba(18, 18, 20, 0.9)',
  },
  cardBrand: {
    uzcard: { base: '#1E5FBF', dark: '#123D7D', text: '#FFFFFF' },
    humo: { base: '#0EA37A', dark: '#0B6E54', text: '#FFFFFF' },
    unknown: { base: palette.gray700, dark: palette.gray900, text: '#FFFFFF' },
  },
} as const;

// Default exported colors token
export const colors = darkColors;

export type ColorTokens = typeof colors;
