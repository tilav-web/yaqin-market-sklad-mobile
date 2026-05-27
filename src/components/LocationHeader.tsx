import { ChevronDown, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, radius, shadow, spacing, typography } from '@/theme';

interface Props {
  onPress?: () => void;
}

export function LocationHeader({ onPress }: Props) {
  const { tr } = useTranslation();
  const selected = useLocationStore((s) => s.selectedAddress);
  const coords = useEffectiveCoords();

  const label = selected ? selected.label : tr('home.locationLoading');
  const subLabel = selected
    ? selected.address
    : coords
      ? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`
      : '';

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <View style={styles.iconWrap}>
        <MapPin size={20} color={colors.brand.primary} strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>Yetkazib berish manzili</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {label}
          </Text>
          <ChevronDown size={16} color={colors.text.secondary} strokeWidth={2.4} />
        </View>
        {subLabel ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadow.xs,
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { ...typography.overline, color: colors.text.tertiary, fontSize: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  title: { ...typography.bodyStrong, flex: 1 },
  sub: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
});
