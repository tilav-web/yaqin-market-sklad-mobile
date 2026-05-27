/**
 * Typography scale.
 *
 * Sizes calibrated for Android/iOS readability at default DPI.
 * Use semantic names (`display`, `title`, `body`) — not raw fontSize.
 */

import { Platform, TextStyle } from 'react-native';

import { colors } from './colors';

const baseFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const baseSemiBold = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

const baseBold = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'bodySmall'
  | 'caption'
  | 'overline'
  | 'price'
  | 'priceSmall'
  | 'button'
  | 'buttonSmall';

export const typography: Record<Variant, TextStyle> = {
  display: {
    fontFamily: baseBold,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 40,
    color: colors.text.primary,
  },
  h1: {
    fontFamily: baseBold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
    color: colors.text.primary,
  },
  h2: {
    fontFamily: baseBold,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 28,
    color: colors.text.primary,
  },
  h3: {
    fontFamily: baseSemiBold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: colors.text.primary,
  },
  h4: {
    fontFamily: baseSemiBold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: baseSemiBold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: colors.text.primary,
  },
  body: {
    fontFamily: baseFontFamily,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: colors.text.primary,
  },
  bodyStrong: {
    fontFamily: baseSemiBold,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.text.primary,
  },
  bodySmall: {
    fontFamily: baseFontFamily,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: colors.text.secondary,
  },
  caption: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: colors.text.tertiary,
  },
  overline: {
    fontFamily: baseSemiBold,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
  },
  price: {
    fontFamily: baseBold,
    fontSize: 18,
    fontWeight: '800',
    color: colors.brand.primary,
  },
  priceSmall: {
    fontFamily: baseSemiBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  button: {
    fontFamily: baseSemiBold,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonSmall: {
    fontFamily: baseSemiBold,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
};

export type TypographyVariant = Variant;
