import { Star } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { CARD_BRAND_LABEL, CardBrand } from '@/utils/cardBrand';

interface Props {
  readonly brand: CardBrand;
  /** Formatted card number to display, e.g. "8600 12•• •••• 1234" or the live-typed value. */
  readonly numberText: string;
  readonly label?: string | null;
  readonly expiry?: string | null;
  readonly fallbackLabel: string;
  /** Shows a small badge on the card face — the default indicator lives on
   * the card itself rather than a separate row underneath it. */
  readonly isDefault?: boolean;
  /** 'full' — bank-card mockup (saved-cards list, add-card preview). 'mini' — small pill badge for compact rows. */
  readonly size?: 'full' | 'mini';
}

/** Realistic bank-card mockup whose color follows the detected Uzcard/Humo brand. */
export function CardVisual({ brand, numberText, label, expiry, fallbackLabel, isDefault, size = 'full' }: Props) {
  const tone = colors.cardBrand[brand ?? 'unknown'];
  const brandLabel = brand ? CARD_BRAND_LABEL[brand] : null;

  if (size === 'mini') {
    return (
      <View style={[miniStyles.wrap, { backgroundColor: tone.base }]}>
        <View style={[miniStyles.sheen, { backgroundColor: tone.dark }]} />
        <Text style={[miniStyles.text, { color: tone.text }]} numberOfLines={1}>
          {brandLabel ?? '••••'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: tone.base }]}>
      <View style={[styles.sheen, { backgroundColor: tone.dark }]} />
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: tone.text }]} numberOfLines={1}>
          {label || fallbackLabel}
        </Text>
        <View style={styles.topRight}>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Star size={11} color={tone.base} fill={tone.base} />
            </View>
          )}
          {brandLabel && (
            <Text style={[styles.brand, { color: tone.text }]} numberOfLines={1}>
              {brandLabel}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.chip}>
        <View style={styles.chipLine} />
        <View style={[styles.chipLine, styles.chipLineGap]} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.number, { color: tone.text }]} numberOfLines={1}>
          {numberText}
        </Text>
        {!!expiry && (
          <Text style={[styles.expiry, { color: tone.text }]} numberOfLines={1}>
            {expiry}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    height: 168,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.35,
    top: -110,
    right: -60,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  defaultBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  brand: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  chip: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 5,
    justifyContent: 'center',
  },
  chipLine: { height: 2.5, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.25)' },
  chipLineGap: { marginTop: 3 },
  bottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  number: { fontSize: 17, fontWeight: '700', letterSpacing: 1.5, flexShrink: 1 },
  expiry: { fontSize: 13, fontWeight: '700', opacity: 0.9 },
});

const miniStyles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.35,
    top: -18,
    right: -12,
  },
  text: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
});
