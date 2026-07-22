/**
 * Yaqin Market color system.
 *
 * Single-accent identity: a confident, warm RED carries the brand. Everything
 * else is a calm neutral ramp + warm off-white surfaces, so the red always
 * reads as the action color. No competing blue.
 *
 * Tokens are semantic — components reference `colors.brand.primary`, never a
 * raw hex — so re-theming touches only this file.
 */

const palette = {
  // Brand red (warm, premium — close to a ripe tomato, not fire-engine)
  red: '#E8392E',
  redDark: '#C42B22',
  redDarker: '#A11F18',
  red600: '#D62F26',
  redLight: '#F36458',
  redTint: '#FDECEA', // surfaces
  redTintStrong: '#FBD9D5', // borders
  redGlow: 'rgba(232, 57, 46, 0.16)',

  // Warm neutrals — slightly warm gray ramp so it sits well next to red
  white: '#FFFFFF',
  cream: '#FCFAF8', // app canvas (warm off-white)
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

  // Semantic (kept distinct from brand red)
  success: '#1F9D63',
  successSurface: '#E3F5EC',
  warning: '#E8951F',
  warningSurface: '#FCEFD8',
  danger: '#E8392E',
  dangerSurface: '#FDECEA',
  info: '#3D6B8E', // muted slate-blue for neutral info only (rarely used)
  infoSurface: '#E9EFF4',
} as const;

export const colors = {
  palette,
  brand: {
    primary: palette.red,
    primaryDark: palette.redDark,
    primaryDarker: palette.redDarker,
    primaryLight: palette.redLight,
    primarySurface: palette.redTint,
    primaryBorder: palette.redTintStrong,
    primaryGlow: palette.redGlow,
    // accent kept identical-family for a single-color identity; use the deep
    // red for secondary emphasis (e.g. "danger"/destructive reads the same).
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
  // Bank-card mockup faces — keyed by the detected BIN brand (see
  // utils/cardBrand.ts). `unknown` covers a card number not yet long enough
  // to classify (or a foreign BIN outside Uzcard/Humo).
  cardBrand: {
    uzcard: { base: '#1E5FBF', dark: '#123D7D', text: '#FFFFFF' },
    humo: { base: '#0EA37A', dark: '#0B6E54', text: '#FFFFFF' },
    unknown: { base: palette.gray700, dark: palette.gray900, text: '#FFFFFF' },
  },
} as const;

export type ColorTokens = typeof colors;
