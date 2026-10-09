import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Check, MapPin, Plus, Star } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { UserAddress } from '@/lib/types';
import { colors, typography } from '@/theme';
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
 * Saved-address switcher scoped to checkout
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
      handleIndicatorStyle={{ backgroundColor: colors.border.strong, width: 40 }}
      backgroundStyle={{ backgroundColor: colors.bg.surface }}>
      <BottomSheetFlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}
        ListHeaderComponent={<Text className="mb-2" style={[typography.h4, { color: colors.text.primary }]}>{tr('checkout.chooseAddress')}</Text>}
        renderItem={({ item }) => {
          const active = item.id === selectedId;
          return (
            <Pressable
              className="flex-row items-center gap-3 p-3 rounded-xl border-[1.5px] mb-2"
              style={{
                borderColor: active ? colors.brand.primary : colors.border.subtle,
                backgroundColor: active ? colors.brand.primarySurface : 'transparent',
              }}
              onPress={() => {
                haptics.selection();
                onSelect(item);
              }}>
              <View
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: active ? colors.brand.primary : colors.brand.primarySurface }}
              >
                <MapPin
                  size={18}
                  color={active ? colors.text.onPrimary : colors.brand.primary}
                  strokeWidth={2.4}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <Text style={[typography.bodyStrong, { color: colors.text.primary }]}>{item.label}</Text>
                  {item.isDefault && (
                    <Star size={11} color={colors.brand.primary} fill={colors.brand.primary} />
                  )}
                </View>
                <Text className="mt-0.5" style={[typography.caption, { color: colors.text.secondary }]} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              {active && <Check size={18} color={colors.brand.primary} strokeWidth={2.6} />}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <Pressable
            className="flex-row items-center justify-center gap-2 py-3 rounded-xl border-[1.5px] border-dashed mt-1"
            style={{
              borderColor: colors.brand.primaryBorder,
            }}
            onPress={() => {
              onClose();
              router.push('/addresses');
            }}>
            <Plus size={18} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={[typography.bodyStrong, { color: colors.brand.primary }]}>{tr('addr.add')}</Text>
          </Pressable>
        }
      />
    </BottomSheet>
  );
}
