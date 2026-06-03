import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, ChevronRight, Crosshair, MapPin, Plus, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { UserAddress } from '@/lib/types';
import { useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

interface Props {
  readonly visible: boolean;
  readonly onClose: () => void;
}

/**
 * Quick location switcher that slides up from the bottom. Lets the customer
 * jump between "current GPS location" and any saved address without leaving the
 * current screen — whatever they pick becomes the active location the whole app
 * queries against (feed, shops, map).
 */
export function AddressPickerSheet({ visible, onClose }: Props) {
  const { tr } = useTranslation();
  const selectedAddress = useLocationStore((s) => s.selectedAddress);
  const setSelectedAddress = useLocationStore((s) => s.setSelectedAddress);
  const useCurrentLocation = useLocationStore((s) => s.useCurrentLocation);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      return res.data;
    },
    enabled: visible,
  });

  const usingGps = !selectedAddress;

  const pickGps = () => {
    haptics.selection();
    useCurrentLocation();
    onClose();
  };

  const pickAddress = (addr: UserAddress) => {
    haptics.selection();
    setSelectedAddress(addr);
    onClose();
  };

  const addNew = () => {
    onClose();
    router.push('/addresses');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{tr('picker.deliveryAddress')}</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={20} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {/* Live GPS option */}
            <Pressable style={styles.row} onPress={pickGps}>
              <View style={[styles.iconWrap, usingGps && styles.iconWrapActive]}>
                <Crosshair
                  size={18}
                  color={usingGps ? colors.text.onPrimary : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{tr('picker.currentLocation')}</Text>
                <Text style={styles.rowSub}>{tr('picker.gpsAuto')}</Text>
              </View>
              {usingGps && <Check size={20} color={colors.brand.primary} strokeWidth={2.6} />}
            </Pressable>

            {(addressesQuery.data ?? []).map((addr) => {
              const active = selectedAddress?.id === addr.id;
              return (
                <Pressable key={addr.id} style={styles.row} onPress={() => pickAddress(addr)}>
                  <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                    <MapPin
                      size={18}
                      color={active ? colors.text.onPrimary : colors.brand.primary}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>
                      {addr.label}
                      {addr.isDefault ? `  ·  ${tr('picker.main')}` : ''}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {addr.address}
                    </Text>
                  </View>
                  {active && <Check size={20} color={colors.brand.primary} strokeWidth={2.6} />}
                </Pressable>
              );
            })}

            {/* Add new */}
            <Pressable style={styles.addRow} onPress={addNew}>
              <View style={styles.addIcon}>
                <Plus size={18} color={colors.brand.primary} strokeWidth={2.6} />
              </View>
              <Text style={styles.addText}>{tr('picker.addNew')}</Text>
              <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.4} />
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay.scrim,
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    ...shadow.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.brand.primary },
  rowTitle: { ...typography.body, fontWeight: '600', color: colors.text.primary },
  rowSub: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  addIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { flex: 1, ...typography.body, fontWeight: '600', color: colors.brand.primary },
});
