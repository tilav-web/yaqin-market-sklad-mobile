import { Clock, MapPin, Star, Truck } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  shop: PublicShop;
  onPress: () => void;
}

export function ShopCard({ shop, onPress }: Props) {
  const { tr } = useTranslation();

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <View style={styles.imageWrap}>
        {shop.photos[0] ? (
          <Image source={{ uri: resolveMedia(shop.photos[0]) }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <MapPin size={36} color={colors.brand.primary} strokeWidth={1.6} />
          </View>
        )}
        {!shop.isOpenManual && (
          <View style={styles.closedOverlay}>
            <Badge label={tr('home.closed')} tone="danger" size="md" />
          </View>
        )}
        {shop.ratingAverage > 0 && (
          <View style={styles.ratingBadge}>
            <Star size={12} color={colors.feedback.warning} fill={colors.feedback.warning} />
            <Text style={styles.ratingText}>{shop.ratingAverage.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {shop.name}
          </Text>
          {shop.distanceKm !== undefined && (
            <View style={styles.distanceChip}>
              <MapPin size={11} color={colors.text.secondary} strokeWidth={2.4} />
              <Text style={styles.distanceText}>{shop.distanceKm.toFixed(1)} km</Text>
            </View>
          )}
        </View>

        {shop.description && (
          <Text style={styles.desc} numberOfLines={1}>
            {shop.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Truck size={14} color={colors.feedback.success} strokeWidth={2.2} />
            <Text style={styles.metaText}>
              {shop.deliveryFeeAtUser === 0
                ? tr('home.deliveryFree')
                : tr('home.deliveryFee', {
                    price: (shop.deliveryFeeAtUser ?? 0).toLocaleString(),
                  })}
            </Text>
          </View>

          {shop.minOrderPrice > 0 && (
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.text.secondary} strokeWidth={2.2} />
              <Text style={styles.metaText}>
                {tr('home.minOrder', { price: shop.minOrderPrice.toLocaleString() })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.xs,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  imageWrap: { position: 'relative', height: 160, backgroundColor: colors.bg.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  closedOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    ...shadow.sm,
  },
  ratingText: { ...typography.caption, color: colors.text.primary, fontWeight: '700' },
  body: { padding: spacing.lg, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.h4, flex: 1 },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  distanceText: { ...typography.caption, color: colors.text.secondary, fontWeight: '700' },
  desc: { ...typography.bodySmall, color: colors.text.secondary },
  metaRow: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', marginTop: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...typography.bodySmall, color: colors.text.secondary, fontWeight: '600' },
});
