import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Bell, ChevronRight, Clock, MapPin, Map, Store, Truck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { LocationPickerModal, PickedLocation } from '@/components/LocationPickerModal';
import { ImageUploader } from '@/components/seller/ImageUploader';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { WorkingHoursModal } from '@/components/seller/WorkingHoursModal';
import { api, extractErrorMessage } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { PublicShop } from '@/lib/types';
import { AlarmMode, useAlarmSettingsStore, useShopAlarm } from '@/stores/alarmSettings';
import { colors, layout, radius, spacing, typography } from '@/theme';
import { startOrderAlarm, stopOrderAlarm } from '@/utils/alarm';

type Pricing = 'flat' | 'per_km' | 'per_500m' | 'per_100m';

/** Mirror of the server's calcDeliveryFee (geo.util.ts) for the live preview. */
function calcFee(distanceKm: number, freeKm: number, type: Pricing, pricePerStep: number): number {
  if (distanceKm <= freeKm) return 0;
  const overKm = distanceKm - freeKm;
  switch (type) {
    case 'flat':
      return pricePerStep;
    case 'per_km':
      return Math.ceil(overKm) * pricePerStep;
    case 'per_500m':
      return Math.ceil(overKm * 2) * pricePerStep;
    case 'per_100m':
      return Math.ceil(overKm * 10) * pricePerStep;
    default:
      return pricePerStep;
  }
}

function pricingMeta(type: Pricing): { label: string; priceLabel: string; hint: string } {
  switch (type) {
    case 'per_km':
      return {
        label: tr('shopSet.perKm'),
        priceLabel: tr('shopSet.perKmPrice'),
        hint: tr('shopSet.perKmHint'),
      };
    case 'per_500m':
      return {
        label: tr('shopSet.per500m'),
        priceLabel: tr('shopSet.per500mPrice'),
        hint: tr('shopSet.per500mHint'),
      };
    case 'per_100m':
      return {
        label: tr('shopSet.per100m'),
        priceLabel: tr('shopSet.per100mPrice'),
        hint: tr('shopSet.per100mHint'),
      };
    case 'flat':
    default:
      return {
        label: tr('shopSet.flat'),
        priceLabel: tr('shopSet.flatPrice'),
        hint: tr('shopSet.flatHint'),
      };
  }
}

function fmtSom(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function ShopSettingsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  // Shop settings (name, address, delivery zone/pricing) are owner-only
  // server-side — skip the fetch once confirmed and explain why instead.
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
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
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
      setAddress(s.address);
      setDescription(s.description ?? '');
      setPhotos(s.photos ?? []);
      setCoords({ latitude: s.latitude, longitude: s.longitude });
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
        address: address.trim(),
        description: description.trim() || undefined,
        photos,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
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
        <Section title={tr('shopSet.statusSection')} icon={Store}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>{isOpen ? tr('shopSet.open') : tr('shopSet.closed')}</Text>
              <Text style={styles.toggleSub}>
                {isOpen ? tr('shopSet.openSub') : tr('shopSet.closedSub')}
              </Text>
            </View>
            <Switch
              value={isOpen}
              onValueChange={(v) => toggleOpen.mutate(v)}
              trackColor={{ true: colors.feedback.success }}
              thumbColor={colors.bg.surface}
            />
          </View>
        </Section>

        {/* Shop info */}
        <Section title={tr('shopSet.infoSection')} icon={Store}>
          <ImageUploader
            label={tr('shopSet.photosLabel')}
            hint={tr('shopSet.photosHint')}
            value={photos}
            onChange={setPhotos}
            max={5}
          />
          <Field label={tr('shopSet.nameLabel')}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.text.hint} />
          </Field>
          <Field label={tr('shopSet.addressLabel')}>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={address}
              onChangeText={setAddress}
              multiline
              placeholderTextColor={colors.text.hint}
            />
          </Field>
          <Field label={tr('shopSet.descLabel')}>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder={tr('shopSet.descPlaceholder')}
              placeholderTextColor={colors.text.hint}
            />
            <Text style={styles.hint}>{tr('shopSet.descHint')}</Text>
          </Field>
          <Field label={tr('shopSet.locationLabel')}>
            <Pressable style={styles.mapBtn} onPress={() => setPickerVisible(true)}>
              <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.mapBtnText}>{tr('shopSet.changeOnMap')}</Text>
            </Pressable>
            {coords ? (
              <Text style={styles.coordHint}>
                📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
            ) : null}
          </Field>
          <Field label={tr('shopSet.workingHours')}>
            <Pressable style={styles.mapBtn} onPress={() => setHoursOpen(true)}>
              <Clock size={18} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.mapBtnText}>{tr('shopSet.workingHoursBtn')}</Text>
            </Pressable>
            <Text style={styles.hint}>{tr('shopSet.workingHoursHint')}</Text>
          </Field>
        </Section>

        {/* Order alarm */}
        <Section title={tr('shopSet.alarmSection')} icon={Bell}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{alarm.enabled ? tr('shopSet.alarmOn') : tr('shopSet.alarmOff')}</Text>
            <Switch
              value={alarm.enabled}
              onValueChange={(v) => setAlarmEnabled(shopId, v)}
              trackColor={{ true: colors.feedback.success }}
              thumbColor={colors.bg.surface}
            />
          </View>
          {alarm.enabled ? (
            <>
              <View style={styles.chipRow}>
                {(['short', 'long'] as AlarmMode[]).map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setAlarmMode(shopId, m)}
                    style={[styles.chip, alarm.mode === m && styles.chipActive]}>
                    <Text style={[styles.chipText, alarm.mode === m && styles.chipTextActive]}>
                      {m === 'short' ? tr('shopSet.alarmShort') : tr('shopSet.alarmLong')}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>
                {alarm.mode === 'long'
                  ? tr('shopSet.alarmLongHint')
                  : tr('shopSet.alarmShortHint')}
              </Text>
              <Pressable style={styles.testBtn} onPress={testAlarm}>
                <Text style={styles.testText}>{tr('shopSet.alarmTest')}</Text>
              </Pressable>
            </>
          ) : null}
        </Section>

        {/* Delivery */}
        <Section title={tr('shopSet.deliverySection')} icon={Truck}>
          <Pressable
            style={styles.mapZoneBtn}
            onPress={() => router.push({ pathname: '/seller/[shopId]/delivery-zones', params: { shopId } } as never)}>
            <Map size={18} color={colors.brand.primary} strokeWidth={2} />
            <Text style={styles.mapZoneBtnText}>{tr('shopSet.drawZone')}</Text>
            <ChevronRight size={16} color={colors.text.tertiary} />
          </Pressable>

          <Field label={tr('shopSet.minOrder')}>
            <TextInput style={styles.input} value={minOrder} onChangeText={setMinOrder} keyboardType="number-pad" />
            <Text style={styles.hint}>{tr('shopSet.minOrderHint')}</Text>
          </Field>

          <Field label={tr('shopSet.maxKm')}>
            <TextInput style={styles.input} value={maxKm} onChangeText={setMaxKm} keyboardType="numeric" />
            <Text style={styles.hint}>{tr('shopSet.maxKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.freeKm')}>
            <TextInput style={styles.input} value={freeKm} onChangeText={setFreeKm} keyboardType="numeric" />
            <Text style={styles.hint}>{tr('shopSet.freeKmHint')}</Text>
          </Field>

          <Field label={tr('shopSet.pricingLabel')}>
            <View style={styles.chipRow}>
              {(['per_km', 'per_500m', 'per_100m', 'flat'] as Pricing[]).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setPricingType(t)}
                  style={[styles.chip, pricingType === t && styles.chipActive]}>
                  <Text style={[styles.chipText, pricingType === t && styles.chipTextActive]}>
                    {pricingMeta(t).label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>{pricingMeta(pricingType).hint}</Text>
          </Field>

          <Field label={pricingMeta(pricingType).priceLabel}>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="number-pad" />
          </Field>

          <DeliveryExample
            maxKm={Number(maxKm) || 0}
            freeKm={Number(freeKm) || 0}
            pricingType={pricingType}
            price={Number(price) || 0}
          />
        </Section>

        <Pressable
          style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
          disabled={!name.trim() || save.isPending}
          onPress={() => save.mutate()}>
          <Text style={styles.saveText}>{save.isPending ? tr('shopSet.saving') : tr('common.save')}</Text>
        </Pressable>
      </ScrollView>

      <LocationPickerModal
        visible={pickerVisible}
        initial={coords}
        onCancel={() => setPickerVisible(false)}
        onConfirm={(result: PickedLocation) => {
          setCoords({ latitude: result.latitude, longitude: result.longitude });
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

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon size={16} color={colors.brand.primary} strokeWidth={2.4} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Live, plain-language preview of what a customer would pay for delivery. */
function DeliveryExample({
  maxKm,
  freeKm,
  pricingType,
  price,
}: {
  maxKm: number;
  freeKm: number;
  pricingType: Pricing;
  price: number;
}) {
  if (maxKm <= 0) return null;

  // A customer sitting at the very edge of the delivery zone (worst case).
  const edgeFee = calcFee(maxKm, freeKm, pricingType, price);
  // A mid-zone customer, halfway between the free radius and the edge.
  const midDist = freeKm >= maxKm ? maxKm : (freeKm + maxKm) / 2;
  const midFee = calcFee(midDist, freeKm, pricingType, price);

  return (
    <View style={styles.exampleBox}>
      <Text style={styles.exampleTitle}>{tr('shopSet.exampleTitle')}</Text>

      {freeKm > 0 ? (
        <View style={styles.exampleRow}>
          <Text style={styles.exampleDist}>0 – {freeKm} km</Text>
          <Text style={styles.exampleFree}>{tr('shopSet.free')}</Text>
        </View>
      ) : null}

      {freeKm < maxKm ? (
        <>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleDist}>{midDist.toFixed(1)} km</Text>
            <Text style={styles.exampleFee}>{fmtSom(midFee)} {tr('common.som')}</Text>
          </View>
          <View style={styles.exampleRow}>
            <Text style={styles.exampleDist}>{tr('shopSet.edgeDist', { km: maxKm })}</Text>
            <Text style={styles.exampleFee}>{fmtSom(edgeFee)} {tr('common.som')}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.hint}>{tr('shopSet.allFree')}</Text>
      )}
    </View>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mapZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  mapZoneBtnText: { ...typography.bodyStrong, color: colors.brand.primary, flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['3xl'] },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { ...typography.overline, color: colors.brand.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { ...typography.bodyStrong, color: colors.text.primary },
  toggleSub: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  row: { flexDirection: 'row', gap: spacing.md },
  input: {
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
  },
  mapBtnText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  coordHint: { ...typography.caption, color: colors.text.tertiary, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.text.onPrimary },
  hint: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  exampleBox: {
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  exampleTitle: { ...typography.bodySmall, fontWeight: '800', color: colors.brand.primary, marginBottom: 2 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exampleDist: { ...typography.bodySmall, color: colors.text.secondary },
  exampleFee: { ...typography.bodySmall, fontWeight: '800', color: colors.text.primary },
  exampleFree: { ...typography.bodySmall, fontWeight: '800', color: colors.feedback.success },
  testBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
  },
  testText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
