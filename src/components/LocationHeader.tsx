import { ChevronDown, MapPin } from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '@/i18n';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, hitSlop, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly onPress?: () => void;
}

function pickLabel(
  selected: ReturnType<typeof useLocationStore.getState>['selectedAddress'],
  hasCoords: boolean,
  loadingFallback: string,
): string {
  if (selected) return selected.label;
  if (hasCoords) return 'Joriy lokatsiya';
  return loadingFallback;
}

/**
 * Compact, always-visible location chip for the top of screens.
 *
 * - Shows a small spinner + label while GPS is loading.
 * - Shows the selected address label when one is picked, or a compact
 *   "Current location" hint otherwise.
 * - Stays small (single line, ~32px tall) so the screen below has room to
 *   breathe.
 */
export function LocationHeader({ onPress }: Props) {
  const { tr } = useTranslation();
  const selected = useLocationStore((s) => s.selectedAddress);
  const loading = useLocationStore((s) => s.loading);
  const coords = useEffectiveCoords();

  const isLoading = loading && !coords;
  const label = pickLabel(selected, !!coords, tr('home.locationLoading'));

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      hitSlop={hitSlop}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}>
      <View style={styles.iconWrap}>
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.brand.primary} />
        ) : (
          <MapPin size={14} color={colors.brand.primary} strokeWidth={2.6} />
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <ChevronDown size={14} color={colors.text.tertiary} strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignSelf: 'flex-start',
    maxWidth: 240,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
  },
});
