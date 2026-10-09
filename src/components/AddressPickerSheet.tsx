import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Check, ChevronRight, Crosshair, MapPin, Plus, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { UserAddress } from '@/lib/types';
import { useLocationStore } from '@/stores/location';
import { colors, shadow, typography } from '@/theme';
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
  const switchToCurrentLocation = useLocationStore((s) => s.switchToCurrentLocation);

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
    switchToCurrentLocation();
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
      <Pressable className="absolute inset-0" style={{ backgroundColor: colors.overlay.scrim }} onPress={onClose} />
      <SafeAreaView edges={['bottom']} className="flex-1 justify-end" pointerEvents="box-none">
        <View
          className="rounded-t-3xl px-4 pt-2 pb-4"
          style={[{ backgroundColor: colors.bg.surface }, shadow.xl]}
        >
          <View
            className="w-10 h-1 rounded-full self-center mb-3"
            style={{ backgroundColor: colors.border.default }}
          />
          <View className="flex-row items-center justify-between mb-2">
            <Text style={[typography.h4, { color: colors.text.primary }]}>{tr('picker.deliveryAddress')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.bg.surfaceMuted }}
            >
              <X size={20} color={colors.text.secondary} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {/* Live GPS option */}
            <Pressable className="flex-row items-center gap-3 py-3 border-b" style={{ borderBottomColor: colors.border.subtle }} onPress={pickGps}>
              <View
                className="w-9.5 h-9.5 rounded-full items-center justify-center"
                style={{ backgroundColor: usingGps ? colors.brand.primary : colors.brand.primarySurface }}
              >
                <Crosshair
                  size={18}
                  color={usingGps ? colors.text.onPrimary : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View className="flex-1">
                <Text className="font-semibold" style={[typography.body, { color: colors.text.primary }]}>
                  {tr('picker.currentLocation')}
                </Text>
                <Text className="mt-0.5" style={[typography.caption, { color: colors.text.tertiary }]}>
                  {tr('picker.gpsAuto')}
                </Text>
              </View>
              {usingGps && <Check size={20} color={colors.brand.primary} strokeWidth={2.6} />}
            </Pressable>

            {(addressesQuery.data ?? []).map((addr) => {
              const active = selectedAddress?.id === addr.id;
              return (
                <Pressable
                  key={addr.id}
                  className="flex-row items-center gap-3 py-3 border-b"
                  style={{ borderBottomColor: colors.border.subtle }}
                  onPress={() => pickAddress(addr)}
                >
                  <View
                    className="w-9.5 h-9.5 rounded-full items-center justify-center"
                    style={{ backgroundColor: active ? colors.brand.primary : colors.brand.primarySurface }}
                  >
                    <MapPin
                      size={18}
                      color={active ? colors.text.onPrimary : colors.brand.primary}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold" style={[typography.body, { color: colors.text.primary }]}>
                      {addr.label}
                      {addr.isDefault ? `  ·  ${tr('picker.main')}` : ''}
                    </Text>
                    <Text className="mt-0.5" style={[typography.caption, { color: colors.text.tertiary }]} numberOfLines={1}>
                      {addr.address}
                    </Text>
                  </View>
                  {active && <Check size={20} color={colors.brand.primary} strokeWidth={2.6} />}
                </Pressable>
              );
            })}

            {/* Add new */}
            <Pressable className="flex-row items-center gap-3 py-4" onPress={addNew}>
              <View
                className="w-9.5 h-9.5 rounded-full items-center justify-center border-[1.5px] border-dashed"
                style={{
                  borderColor: colors.brand.primaryBorder,
                  backgroundColor: colors.bg.surface,
                }}
              >
                <Plus size={18} color={colors.brand.primary} strokeWidth={2.6} />
              </View>
              <Text className="flex-1 font-semibold" style={[typography.body, { color: colors.brand.primary }]}>
                {tr('picker.addNew')}
              </Text>
              <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.4} />
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
