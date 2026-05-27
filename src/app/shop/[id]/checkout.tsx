import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

import { BrandButton } from '@/components/ui/brand-button';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, PublicShop, UserAddress } from '@/lib/types';
import { useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';

export default function CheckoutScreen() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const coords = useEffectiveCoords();
  const cartLines = useCartStore((s) => s.carts[shopId ?? ''] ?? []);
  const clearShop = useCartStore((s) => s.clearShop);
  const updateQty = useCartStore((s) => s.updateQty);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const addressesQuery = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      const list = res.data;
      const def = list.find((a) => a.isDefault) ?? list[0];
      if (def && !selectedAddressId) setSelectedAddressId(def.id);
      return list;
    },
  });

  const shopQuery = useQuery({
    queryKey: ['shop', shopId, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/shops/${shopId}`, {
        params: coords ? { lat: coords.latitude, lng: coords.longitude } : undefined,
      });
      return res.data;
    },
    enabled: !!shopId,
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      const res = await api.post<Order>('/orders', {
        shopId,
        deliveryAddressId: selectedAddressId,
        items: cartLines.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),
      });
      return res.data;
    },
    onSuccess: (order) => {
      clearShop(shopId!);
      qc.invalidateQueries({ queryKey: ['orders'] });
      router.replace(`/orders/${order.id}`);
    },
    onError: (err) => {
      Alert.alert('Xatolik', extractErrorMessage(err));
    },
  });

  const subTotal = cartLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const deliveryFee = shopQuery.data?.deliveryFeeAtUser ?? 0;
  const total = subTotal + deliveryFee;
  const canOrder =
    selectedAddressId && cartLines.length > 0 && (shopQuery.data?.isWithinZone ?? false);

  if (!cartLines.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Savat bo&apos;sh</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Yetkazib berish manzili">
          {addressesQuery.isLoading ? (
            <ActivityIndicator color={Brand.blue} />
          ) : addressesQuery.data && addressesQuery.data.length > 0 ? (
            addressesQuery.data.map((addr) => (
              <Pressable
                key={addr.id}
                style={[
                  styles.addressRow,
                  selectedAddressId === addr.id && styles.addressRowActive,
                ]}
                onPress={() => setSelectedAddressId(addr.id)}>
                <View style={styles.radio}>
                  {selectedAddressId === addr.id && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>{addr.label}</Text>
                  <Text style={styles.addressText}>{addr.address}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <View>
              <Text style={styles.dim}>Manzil yo&apos;q</Text>
              <Pressable
                style={styles.addAddressBtn}
                onPress={() => router.push('/addresses')}>
                <Text style={styles.addAddressText}>+ Manzil qo&apos;shish</Text>
              </Pressable>
            </View>
          )}
        </Section>

        <Section title="Mahsulotlar">
          {cartLines.map((line) => (
            <View key={line.variantId} style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{line.productName}</Text>
                <Text style={styles.itemPrice}>
                  {line.unitPrice.toLocaleString()} × {line.quantity} ={' '}
                  {(line.unitPrice * line.quantity).toLocaleString()} so&apos;m
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => updateQty(shopId!, line.variantId, line.quantity - 1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{line.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => updateQty(shopId!, line.variantId, line.quantity + 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Section>

        <View style={styles.summary}>
          <Row label="Mahsulotlar:" value={`${subTotal.toLocaleString()} so'm`} />
          <Row label="Yetkazib berish:" value={`${deliveryFee.toLocaleString()} so'm`} />
          <View style={styles.divider} />
          <Row label="Jami:" value={`${total.toLocaleString()} so'm`} bold />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <BrandButton
          label={canOrder ? 'Buyurtma berish' : 'Manzil tanlang'}
          onPress={() => createOrder.mutate()}
          loading={createOrder.isPending}
          disabled={!canOrder}
          variant="accent"
        />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && { fontWeight: '700', color: Brand.black }]}>{label}</Text>
      <Text style={[styles.rowValue, bold && { fontWeight: '800', fontSize: 18, color: Brand.blue }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.four, paddingBottom: 120 },
  section: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Brand.gray600, textTransform: 'uppercase', marginBottom: Spacing.two },
  addressRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  addressRowActive: { backgroundColor: Brand.gray50 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.blue },
  addressLabel: { fontSize: 15, fontWeight: '600', color: Brand.black },
  addressText: { fontSize: 13, color: Brand.gray600, marginTop: 2 },
  dim: { fontSize: 13, color: Brand.gray600 },
  addAddressBtn: { paddingVertical: Spacing.three, marginTop: Spacing.two, borderRadius: Radius.md, borderWidth: 1, borderColor: Brand.blue, alignItems: 'center' },
  addAddressText: { color: Brand.blue, fontWeight: '700' },
  cartItem: { flexDirection: 'row', gap: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: Brand.black },
  itemPrice: { fontSize: 12, color: Brand.gray600, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.gray50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Brand.gray200 },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: Brand.blue },
  qty: { minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  summary: { backgroundColor: Brand.white, borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14, color: Brand.gray600 },
  rowValue: { fontSize: 14, fontWeight: '600', color: Brand.black },
  divider: { height: 1, backgroundColor: Brand.gray100, marginVertical: 4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.four, backgroundColor: Brand.white, borderTopWidth: 1, borderTopColor: Brand.gray100 },
});
