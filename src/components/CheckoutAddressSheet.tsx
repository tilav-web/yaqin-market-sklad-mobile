import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Check, MapPin, Plus, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { UserAddress } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

type BottomSheetRef = React.ElementRef<typeof BottomSheet>;

interface Props {
  readonly visible: boolean;
  readonly addresses: UserAddress[];
  readonly selectedId: string | null;
  readonly onSelect: (address: UserAddress) => void;
  readonly onClose: () => void;
}

/**
 * Saved-address switcher scoped to checkout — unlike the home tab's
 * `AddressPickerSheet` (a plain Modal that also offers "current GPS" and
 * writes to the app-wide `useLocationStore`), this only ever picks one of the
 * customer's SAVED addresses (an order needs a concrete `deliveryAddressId`,
 * GPS alone isn't a valid delivery target) and reports the pick back via
 * `onSelect` rather than mutating global state itself.
 */
export function CheckoutAddressSheet({ visible, addresses, selectedId, onSelect, onClose }: Props) {
  const { tr } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  useEffect(() => {
    if (visible) sheetRef.current?.snapToIndex(0);
    else sheetRef.current?.close();
  }, [visible]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
      )}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}>
      <BottomSheetFlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>{tr('checkout.chooseAddress')}</Text>}
        renderItem={({ item }) => {
          const active = item.id === selectedId;
          return (
            <Pressable
              style={[styles.row, active && styles.rowActive]}
              onPress={() => {
                haptics.selection();
                onSelect(item);
              }}>
              <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                <MapPin
                  size={18}
                  color={active ? colors.text.onPrimary : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>{item.label}</Text>
                  {item.isDefault && (
                    <Star size={11} color={colors.brand.primary} fill={colors.brand.primary} />
                  )}
                </View>
                <Text style={styles.address} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              {active && <Check size={18} color={colors.brand.primary} strokeWidth={2.6} />}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            style={styles.addRow}
            onPress={() => {
              onClose();
              router.push('/addresses');
            }}>
            <Plus size={18} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.addText}>{tr('addr.add')}</Text>
          </Pressable>
        }
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.bg.surface },
  handleIndicator: { backgroundColor: colors.border.strong, width: 40 },
  list: { padding: layout.screenPadding, paddingBottom: spacing['3xl'], gap: spacing.sm },
  title: { ...typography.h4, color: colors.text.primary, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    marginBottom: spacing.sm,
  },
  rowActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.brand.primary },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { ...typography.bodyStrong },
  address: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
    marginTop: spacing.xs,
  },
  addText: { ...typography.bodyStrong, color: colors.brand.primary },
});
