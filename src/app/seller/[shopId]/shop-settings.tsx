import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { WorkingHoursModal } from '@/components/seller/WorkingHoursModal';
import {
  Pricing,
  ShopAlarmSection,
  ShopDeliverySection,
  ShopInfoSection,
  ShopStatusSection,
} from '@/components/seller-settings';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { useAlarmSettingsStore, useShopAlarm } from '@/stores/alarmSettings';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { startOrderAlarm, stopOrderAlarm } from '@/utils/alarm';

export default function ShopSettingsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const isOwner = useIsShopOwner(shopId);

  const alarm = useShopAlarm(shopId);
  const setAlarmEnabled = useAlarmSettingsStore((s) => s.setEnabled);
  const setAlarmMode = useAlarmSettingsStore((s) => s.setMode);
  const testTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testAlarm = () => {
    startOrderAlarm(alarm.mode === 'long');
    if (testTimer.current) clearTimeout(testTimer.current);
    testTimer.current = setTimeout(() => stopOrderAlarm(), 2500);
  };
  useEffect(() => () => stopOrderAlarm(), []);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [coordsEvidence, setCoordsEvidence] = useState<PickedLocation['evidence']>(undefined);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [isDeliveryEnabled, setIsDeliveryEnabled] = useState(true);
  const [minOrder, setMinOrder] = useState('');
  const [maxKm, setMaxKm] = useState('');
  const [freeKm, setFreeKm] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState<Pricing>('flat');

  const shopQuery = useQuery({
    queryKey: ['seller-shop', shopId],
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/seller/shops/${shopId}`);
      const s = res.data;
      setName(s.name);
      setPhone(s.phone ?? '');
      setAddress(s.address);
      setDescription(s.description ?? '');
      setPhotos(s.photos ?? []);
      setCoords({ latitude: s.latitude, longitude: s.longitude });
      setIsDeliveryEnabled(s.isDeliveryEnabled ?? true);
      setMinOrder(String(s.minOrderPrice));
      setMaxKm(String(s.deliveryZone.maxKm));
      setFreeKm(String(s.deliveryZone.freeKm));
      setPrice(String(s.deliveryZone.pricePerStep));
      setPricingType(s.deliveryZone.pricingType);
      return s;
    },
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await api.post(`/seller/shops/${shopId}/toggle-open`, { isOpen });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-shop', shopId] }),
  });

  const save = useMutation({
    mutationFn: async () => {
      await api.patch<PublicShop>(`/seller/shops/${shopId}`, {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim(),
        description: description.trim() || undefined,
        photos,
        isDeliveryEnabled,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude, evidence: coordsEvidence } : {}),
        minOrderPrice: Number(minOrder) || 0,
        deliveryZone: {
          maxKm: Number(maxKm) || 1,
          freeKm: Number(freeKm) || 0,
          pricingType,
          pricePerStep: Number(price) || 0,
        },
      });
    },
    onSuccess: () => {
      Alert.alert(tr('common.saved'), tr('shopSet.savedMsg'));
      qc.invalidateQueries({ queryKey: ['seller-shop', shopId] });
      qc.invalidateQueries({ queryKey: ['shops', 'mine'] });
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  if (shopQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const isOpen = shopQuery.data?.isOpenManual;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Shop status */}
        <ShopStatusSection
          isOpen={isOpen}
          onToggleOpen={(open) => toggleOpen.mutate(open)}
        />

        {/* Shop info */}
        <ShopInfoSection
          photos={photos}
          onChangePhotos={setPhotos}
          name={name}
          onChangeName={setName}
          phone={phone}
          onChangePhone={setPhone}
          address={address}
          onChangeAddress={setAddress}
          description={description}
          onChangeDescription={setDescription}
          coords={coords}
          onOpenLocationPicker={() => setPickerVisible(true)}
          onOpenWorkingHours={() => setHoursOpen(true)}
        />

        {/* Order alarm */}
        <ShopAlarmSection
          enabled={alarm.enabled}
          mode={alarm.mode}
          onToggleEnabled={(enabled) => setAlarmEnabled(shopId, enabled)}
          onSelectMode={(m) => setAlarmMode(shopId, m)}
          onTestAlarm={testAlarm}
        />

        {/* Delivery zone & pricing */}
        <ShopDeliverySection
          shopId={shopId}
          isDeliveryEnabled={isDeliveryEnabled}
          onToggleDeliveryEnabled={setIsDeliveryEnabled}
          minOrder={minOrder}
          onChangeMinOrder={setMinOrder}
          maxKm={maxKm}
          onChangeMaxKm={setMaxKm}
          freeKm={freeKm}
          onChangeFreeKm={setFreeKm}
          pricingType={pricingType}
          onChangePricingType={setPricingType}
          price={price}
          onChangePrice={setPrice}
        />

        {/* Save button */}
        <Pressable
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          disabled={!name.trim() || save.isPending}
          onPress={() => save.mutate()}
        >
          <Text style={styles.saveText}>{save.isPending ? tr('shopSet.saving') : tr('common.save')}</Text>
        </Pressable>
      </ScrollView>

      <LocationPickerModal
        visible={pickerVisible}
        initial={coords}
        onCancel={() => setPickerVisible(false)}
        onConfirm={(result: PickedLocation) => {
          setCoords({ latitude: result.latitude, longitude: result.longitude });
          setCoordsEvidence(result.evidence);
          if (result.address) setAddress(result.address);
          setPickerVisible(false);
        }}
      />

      <WorkingHoursModal
        visible={hoursOpen}
        shopId={shopId}
        initialHours={shopQuery.data?.workingHours}
        initialHolidays={shopQuery.data?.holidays}
        onClose={() => setHoursOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.lg, paddingBottom: spacing['4xl'] },
  saveBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { ...typography.button, color: colors.text.onPrimary },
});
