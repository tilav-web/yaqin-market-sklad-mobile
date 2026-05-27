import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { PublicShop } from '@/lib/types';

export default function SellerSettingsScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [minOrder, setMinOrder] = useState('');
  const [maxKm, setMaxKm] = useState('');
  const [freeKm, setFreeKm] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState<'flat' | 'per_km' | 'per_500m'>('flat');

  const shopQuery = useQuery({
    queryKey: ['seller-shop', shopId],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/seller/shops/${shopId}`);
      const s = res.data;
      setMinOrder(String(s.minOrderPrice));
      setMaxKm(String(s.deliveryZone.maxKm));
      setFreeKm(String(s.deliveryZone.freeKm));
      setPrice(String(s.deliveryZone.pricePerStep));
      setPricingType(s.deliveryZone.pricingType);
      return s;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<PublicShop>(`/seller/shops/${shopId}`, {
        minOrderPrice: Number(minOrder),
        deliveryZone: {
          maxKm: Number(maxKm),
          freeKm: Number(freeKm),
          pricingType,
          pricePerStep: Number(price),
        },
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Saqlandi', 'Sozlamalar yangilandi');
      qc.invalidateQueries({ queryKey: ['seller-shop', shopId] });
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await api.post(`/seller/shops/${shopId}/toggle-open`, { isOpen });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-shop', shopId] }),
  });

  if (shopQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.red} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Do&apos;kon holati</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>
              {shopQuery.data?.isOpenManual ? '✅ Ochiq' : '⛔ Yopiq'}
            </Text>
            <Switch
              value={shopQuery.data?.isOpenManual}
              onValueChange={(v) => toggleOpen.mutate(v)}
              trackColor={{ true: Brand.success }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minimal buyurtma narxi</Text>
          <TextInput
            style={styles.input}
            value={minOrder}
            onChangeText={setMinOrder}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yetkazib berish zonasi</Text>
          <Field label="Maksimal radius (km)">
            <TextInput
              style={styles.input}
              value={maxKm}
              onChangeText={setMaxKm}
              keyboardType="numeric"
              placeholder="4"
            />
          </Field>
          <Field label="Bepul radius (km)">
            <TextInput
              style={styles.input}
              value={freeKm}
              onChangeText={setFreeKm}
              keyboardType="numeric"
              placeholder="2"
            />
          </Field>
          <Field label="Narx hisobi turi">
            <View style={styles.pricingRow}>
              {(['flat', 'per_km', 'per_500m'] as const).map((t) => (
                <Text
                  key={t}
                  onPress={() => setPricingType(t)}
                  style={[styles.pricingChip, pricingType === t && styles.pricingChipActive]}>
                  {t === 'flat' ? 'Doimiy' : t === 'per_km' ? 'Har km' : 'Har 500m'}
                </Text>
              ))}
            </View>
          </Field>
          <Field label="Narxi (so'm)">
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              keyboardType="number-pad"
              placeholder="5000"
            />
          </Field>
        </View>

        <BrandButton
          label="Saqlash"
          onPress={() => updateMutation.mutate()}
          loading={updateMutation.isPending}
          variant="accent"
        />
        <BrandButton
          label="← Customer rejimga qaytish"
          onPress={() => router.replace('/(tabs)')}
          variant="ghost"
          style={{ marginTop: Spacing.three }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.four },
  section: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Brand.red, textTransform: 'uppercase' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  field: { gap: 4 },
  fieldLabel: { fontSize: 13, color: Brand.gray600, fontWeight: '600' },
  input: { backgroundColor: Brand.gray50, borderRadius: Radius.md, paddingHorizontal: Spacing.four, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: Brand.gray200 },
  pricingRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pricingChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Brand.gray50,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Brand.gray200,
    color: Brand.gray800,
  },
  pricingChipActive: { backgroundColor: Brand.red, color: Brand.white, borderColor: Brand.red, fontWeight: '700' },
});
