import { ChevronRight, Clock, MapPin, Star, Store } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { resolveMedia } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly shop: PublicShop;
  readonly onPress: () => void;
}

/**
 * Full-width shop card shown inline between product rows on the Home feed
 * (UI adapted from the legacy app's "prime store" card). Uses the shop's first
 * photo as a banner with a dark overlay; logo, name, distance/open state, and a
 * chevron sit at the bottom.
 *
 * For now every nearby shop is surfaced this way; later a "premium" subset can
 * be promoted here instead.
 */
export function StoreFeedCard({ shop, onPress }: Props) {
  const banner = shop.photos?.[0];
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
      {banner ? (
        <Image source={{ uri: resolveMedia(banner) }} style={styles.banner} resizeMode="cover" />
      ) : (
        <View style={[styles.banner, styles.bannerPlaceholder]}>
          <Store size={32} color={colors.brand.primary} strokeWidth={1.5} />
        </View>
      )}
      <View style={styles.overlay} />

      <View style={styles.topRow}>
        <View style={styles.tagChip}>
          <Store size={11} color={colors.brand.primary} strokeWidth={2.6} />
          <Text style={styles.tagText}>Do‘kon</Text>
        </View>
        {shop.ratingCount > 0 && (
          <View style={styles.ratingChip}>
            <Star size={11} color={colors.feedback.warning} fill={colors.feedback.warning} />
            <Text style={styles.ratingText}>{shop.ratingAverage.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.logo}>
          <Text style={styles.logoLetter}>{shop.name[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {shop.name}
          </Text>
          <View style={styles.metaRow}>
            {shop.distanceKm !== undefined && (
              <View style={styles.metaItem}>
                <MapPin size={11} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
                <Text style={styles.metaText}>{shop.distanceKm.toFixed(1)} km</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Clock size={11} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
              <Text style={styles.metaText}>{shop.isOpenManual ? 'Ochiq' : 'Yopiq'}</Text>
            </View>
          </View>
        </View>
        <View style={styles.arrow}>
          <ChevronRight size={16} color={colors.text.onPrimary} strokeWidth={2.6} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 150,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.bg.surface,
    ...shadow.md,
  },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primarySurface,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  tagText: { ...typography.caption, fontSize: 10, color: colors.brand.primary, fontWeight: '800' },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  ratingText: { ...typography.caption, fontSize: 10, color: colors.text.primary, fontWeight: '800' },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.text.onPrimary,
  },
  logoLetter: { color: colors.text.onPrimary, fontSize: 16, fontWeight: '800' },
  name: { ...typography.h4, color: colors.text.onPrimary },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.caption, fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
