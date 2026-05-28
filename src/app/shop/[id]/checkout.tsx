import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronRight, MapPin, Minus, Plus, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, PublicShop, UserAddress } from '@/lib/types';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function CheckoutScreen() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const coords = useEffectiveCoords();
  const cartLines = useCartStore((s) => s.carts[shopId ?? ''] ?? EMPTY_CART);
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
      toast.success('Buyurtma yuborildi!');
      router.replace(`/orders/${order.id}`);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const shop = shopQuery.data;
  const subTotal = cartLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const deliveryFee = shop?.deliveryFeeAtUser ?? 0;
  const total = subTotal + deliveryFee;
  const minOrder = shop?.minOrderPrice ?? 0;
  const belowMin = minOrder > 0 && subTotal < minOrder;
  const outOfZone = shop ? shop.isWithinZone === false : false;
  const canOrder = !!selectedAddressId && cartLines.length > 0 && !belowMin && !outOfZone;

  if (!cartLines.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.dim}>Savat bo‘sh</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yetkazib berish manzili</Text>
          {addressesQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} />
          ) : addressesQuery.data && addressesQuery.data.length > 0 ? (
            addressesQuery.data.map((addr) => {
              const active = selectedAddressId === addr.id;
              return (
                <Pressable
                  key={addr.id}
                  style={[styles.addressRow, active && styles.addressRowActive]}
                  onPress={() => setSelectedAddressId(addr.id)}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLabel}>{addr.label}</Text>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {addr.address}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <Pressable style={styles.addAddressBtn} onPress={() => router.push('/addresses')}>
              <MapPin size={16} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.addAddressText}>Manzil qo‘shish</Text>
            </Pressable>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {shop?.name ?? 'Mahsulotlar'} · {cartLines.length} ta
          </Text>
          {cartLines.map((line) => (
            <View key={line.variantId} style={styles.cartItem}>
              <View style={styles.itemThumb}>
                {line.photoUrl ? (
                  <Image source={{ uri: line.photoUrl }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, styles.itemImgPlaceholder]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {line.productName}
                </Text>
                <Text style={styles.itemPrice}>
                  {(line.unitPrice * line.quantity).toLocaleString()} so‘m
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => updateQty(shopId!, line.variantId, line.quantity - 1)}>
                  <Minus size={16} color={colors.brand.primary} strokeWidth={3} />
                </Pressable>
                <Text style={styles.qty}>{line.quantity}</Text>
                <Pressable
                  style={styles.qtyBtn}
                  onPress={() => updateQty(shopId!, line.variantId, line.quantity + 1)}>
                  <Plus size={16} color={colors.brand.primary} strokeWidth={3} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To‘lov turi</Text>
          <View style={styles.payRow}>
            <Wallet size={18} color={colors.feedback.success} strokeWidth={2.2} />
            <Text style={styles.payText}>Naqd pul</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Row label="Mahsulotlar" value={`${subTotal.toLocaleString()} so‘m`} />
          <Row
            label="Yetkazib berish"
            value={deliveryFee === 0 ? 'Tekin' : `${deliveryFee.toLocaleString()} so‘m`}
          />
          <View style={styles.divider} />
          <Row label="Jami" value={`${total.toLocaleString()} so‘m`} bold />
        </View>

        {belowMin && (
          <Text style={styles.warn}>
            Minimal buyurtma {minOrder.toLocaleString()} so‘m. Yana{' '}
            {(minOrder - subTotal).toLocaleString()} so‘m qo‘shing.
          </Text>
        )}
        {outOfZone && (
          <Text style={styles.warn}>Manzil do‘konning yetkazib berish zonasidan tashqarida.</Text>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Jami</Text>
          <Text style={styles.footerTotalValue}>{total.toLocaleString()} so‘m</Text>
        </View>
        <Pressable
          onPress={() => createOrder.mutate()}
          disabled={!canOrder || createOrder.isPending}
          style={[styles.orderBtn, (!canOrder || createOrder.isPending) && styles.orderBtnDisabled]}>
          {createOrder.isPending ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.orderBtnText}>
              {!selectedAddressId
                ? 'Manzil tanlang'
                : belowMin
                  ? 'Minimal summaga yetmadi'
                  : outOfZone
                    ? 'Zonadan tashqarida'
                    : 'Buyurtma berish'}
            </Text>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Row({ label, value, bold }: { readonly label: string; readonly value: string; readonly bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  dim: { ...typography.body, color: colors.text.secondary },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['4xl'] },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: { ...typography.overline, color: colors.text.tertiary, marginBottom: spacing.xs },
  addressRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addressRowActive: { backgroundColor: colors.brand.primarySurface },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.brand.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand.primary },
  addressLabel: { ...typography.bodyStrong },
  addressText: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  addAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  addAddressText: { ...typography.bodyStrong, color: colors.brand.primary },
  cartItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, alignItems: 'center' },
  itemThumb: { width: 48, height: 48, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg.surfaceMuted },
  itemImg: { width: '100%', height: '100%' },
  itemImgPlaceholder: { backgroundColor: colors.brand.primarySurface },
  itemName: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600' },
  itemPrice: { ...typography.priceSmall, marginTop: 2 },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.full,
    paddingHorizontal: 4,
  },
  qtyBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  qty: { ...typography.bodyStrong, color: colors.brand.primary, minWidth: 20, textAlign: 'center' },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  payText: { ...typography.body, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowLabelBold: { color: colors.text.primary, fontWeight: '700' },
  rowValue: { ...typography.body, fontWeight: '600' },
  rowValueBold: { ...typography.h3, color: colors.brand.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.xs },
  warn: {
    ...typography.bodySmall,
    color: colors.feedback.warning,
    backgroundColor: colors.feedback.warningSurface,
    padding: spacing.md,
    borderRadius: radius.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    ...shadow.lg,
  },
  footerTotal: {},
  footerTotalLabel: { ...typography.caption, color: colors.text.tertiary },
  footerTotalValue: { ...typography.h3, color: colors.text.primary },
  orderBtn: {
    flex: 1,
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: { backgroundColor: colors.text.hint },
  orderBtnText: { ...typography.button, color: colors.text.onPrimary },
});
