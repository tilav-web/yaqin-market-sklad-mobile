import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRight, CreditCard, MapPin, Minus, Phone, Plus, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutAddressSheet } from '@/components/CheckoutAddressSheet';
import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { startOrderActivity } from '@/lib/useOrderLiveActivity';
import { Order, PublicShop, UserAddress } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function CheckoutScreen() {
  const { id: shopId } = useLocalSearchParams<{ id: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const coords = useEffectiveCoords();
  const cartLines = useCartStore((s) => s.carts[shopId ?? ''] ?? EMPTY_CART);
  const clearShop = useCartStore((s) => s.clearShop);
  const updateQty = useCartStore((s) => s.updateQty);
  const lastUsedAddress = useLocationStore((s) => s.selectedAddress);
  const setLastUsedAddress = useLocationStore((s) => s.setSelectedAddress);
  const authPhone = useAuthStore((s) => s.user?.phone);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(lastUsedAddress?.id ?? null);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [intercom, setIntercom] = useState('');
  const [courierComment, setCourierComment] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'click_online'>('cash');

  const addressesQuery = useQuery({
    queryKey: ['my-addresses'],
    queryFn: async () => {
      const res = await api.get<UserAddress[]>('/users/me/addresses');
      const list = res.data;
      // The last address used anywhere in the app (home tab's location
      // switcher, or a previous checkout) wins over the account default —
      // that's the "auto-select the last used location" behavior.
      const preferred = list.find((a) => a.id === lastUsedAddress?.id) ?? list.find((a) => a.isDefault) ?? list[0];
      if (preferred && !selectedAddressId) setSelectedAddressId(preferred.id);
      return list;
    },
  });

  // The delivery zone/fee check must be run against the SELECTED delivery
  // address's coordinates, not the device's live GPS — otherwise switching
  // between saved addresses (Home/Work, possibly different delivery zones)
  // never refetches the zone/fee check and shows stale data for the wrong
  // address.
  const selectedAddress = addressesQuery.data?.find((a) => a.id === selectedAddressId);
  const zoneCheckCoords = selectedAddress
    ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
    : coords;

  // Prefill the apartment-detail fields from whichever address is selected —
  // re-runs only when the SELECTED ADDRESS changes (not on every render), so
  // it doesn't clobber the courier/details the user is actively editing.
  useEffect(() => {
    if (!selectedAddress) return;
    setEntrance(selectedAddress.entrance ?? '');
    setFloor(selectedAddress.floor ?? '');
    setApartment(selectedAddress.apartment ?? '');
    setIntercom(selectedAddress.intercom ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.id]);

  // One-time prefill from the account's own phone — the field stays editable
  // afterwards (e.g. ordering for someone else) without being reset.
  const phonePrefilled = useRef(false);
  useEffect(() => {
    if (!phonePrefilled.current && authPhone) {
      setRecipientPhone(authPhone);
      phonePrefilled.current = true;
    }
  }, [authPhone]);

  const selectAddress = (addr: UserAddress) => {
    setSelectedAddressId(addr.id);
    setAddressSheetVisible(false);
    setLastUsedAddress(addr);
  };

  const shopQuery = useQuery({
    queryKey: ['shop', shopId, selectedAddressId, zoneCheckCoords?.latitude, zoneCheckCoords?.longitude],
    queryFn: async () => {
      const res = await api.get<PublicShop>(`/shops/${shopId}`, {
        params: zoneCheckCoords ? { lat: zoneCheckCoords.latitude, lng: zoneCheckCoords.longitude } : undefined,
      });
      return res.data;
    },
    enabled: !!shopId,
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      // Apartment details are address-level (reused next time this address
      // is picked) — best-effort save them if the customer changed anything
      // at checkout, without blocking order placement if it fails.
      if (
        selectedAddress &&
        (entrance.trim() !== (selectedAddress.entrance ?? '') ||
          floor.trim() !== (selectedAddress.floor ?? '') ||
          apartment.trim() !== (selectedAddress.apartment ?? '') ||
          intercom.trim() !== (selectedAddress.intercom ?? ''))
      ) {
        try {
          await api.patch(`/users/me/addresses/${selectedAddress.id}`, {
            entrance: entrance.trim(),
            floor: floor.trim(),
            apartment: apartment.trim(),
            intercom: intercom.trim(),
          });
          qc.invalidateQueries({ queryKey: ['my-addresses'] });
        } catch {
          // Non-fatal — the order still gets these values below.
        }
      }
      const res = await api.post<Order>('/orders', {
        shopId,
        deliveryAddressId: selectedAddressId,
        items: cartLines.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity })),
        paymentMethod,
        recipientPhone: recipientPhone.trim() || undefined,
        courierComment: courierComment.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async (order) => {
      clearShop(shopId!);
      qc.invalidateQueries({ queryKey: ['orders'] });
      if (selectedAddress) setLastUsedAddress(selectedAddress);
      void startOrderActivity({
        orderNumber: order.orderNumber,
        shopName: order.shop?.name ?? shop?.name ?? '',
        status: 'new',
      });

      if (paymentMethod === 'click_online') {
        // Open Click payment page before navigating to order detail
        try {
          const { data } = await api.get<{ url: string }>(`/click/orders/${order.id}/url`);
          await WebBrowser.openBrowserAsync(data.url, { showTitle: true });
        } catch {
          toast.error("Click sahifasini ochib bo'lmadi. Buyurtmangizdan to'lang.");
        }
      } else {
        toast.success('Buyurtma yuborildi!');
      }
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
        <Text style={styles.dim}>Savat bo'sh</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Qayerda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tr('checkout.where')}</Text>
          {addressesQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} />
          ) : selectedAddress ? (
            <Pressable style={styles.whereRow} onPress={() => setAddressSheetVisible(true)}>
              <View style={styles.whereIcon}>
                <MapPin size={18} color={colors.brand.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {selectedAddress.address}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.text.tertiary} strokeWidth={2.4} />
            </Pressable>
          ) : (
            <Pressable style={styles.addAddressBtn} onPress={() => router.push('/addresses')}>
              <MapPin size={16} color={colors.brand.primary} strokeWidth={2.4} />
              <Text style={styles.addAddressText}>Manzil qo'shish</Text>
            </Pressable>
          )}
        </View>

        {/* Manzil detali + oluvchi */}
        {selectedAddress && (
          <View style={styles.section}>
            <View style={styles.detailsGrid}>
              <TextInput
                style={[styles.input, styles.detailsInput]}
                placeholder={tr('addr.entrance')}
                value={entrance}
                onChangeText={setEntrance}
                placeholderTextColor={colors.text.hint}
              />
              <TextInput
                style={[styles.input, styles.detailsInput]}
                placeholder={tr('addr.floor')}
                value={floor}
                onChangeText={setFloor}
                placeholderTextColor={colors.text.hint}
              />
              <TextInput
                style={[styles.input, styles.detailsInput]}
                placeholder={tr('addr.apartment')}
                value={apartment}
                onChangeText={setApartment}
                placeholderTextColor={colors.text.hint}
              />
              <TextInput
                style={[styles.input, styles.detailsInput]}
                placeholder={tr('addr.intercom')}
                value={intercom}
                onChangeText={setIntercom}
                placeholderTextColor={colors.text.hint}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder={tr('checkout.courierComment')}
              value={courierComment}
              onChangeText={setCourierComment}
              placeholderTextColor={colors.text.hint}
            />
            <View style={styles.phoneRow}>
              <Phone size={16} color={colors.text.tertiary} strokeWidth={2.2} />
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder={tr('checkout.recipientPhone')}
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.text.hint}
              />
            </View>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {shop?.name ?? 'Mahsulotlar'} · {cartLines.length} ta
          </Text>
          {cartLines.map((line) => (
            <View key={line.variantId} style={styles.cartItem}>
              <View style={styles.itemThumb}>
                {line.photoUrl ? (
                  <Image source={{ uri: resolveMedia(line.photoUrl) }} style={styles.itemImg} />
                ) : (
                  <View style={[styles.itemImg, styles.itemImgPlaceholder]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {line.productName}
                </Text>
                <Text style={styles.itemPrice}>
                  {(line.unitPrice * line.quantity).toLocaleString()} so'm
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
          <Text style={styles.sectionTitle}>To'lov turi</Text>
          <Pressable
            style={[styles.payRow, paymentMethod === 'cash' && styles.payRowActive]}
            onPress={() => setPaymentMethod('cash')}>
            <Wallet size={18} color={paymentMethod === 'cash' ? colors.brand.primary : colors.text.tertiary} strokeWidth={2.2} />
            <Text style={[styles.payText, paymentMethod === 'cash' && { color: colors.brand.primary }]}>Naqd pul</Text>
            {paymentMethod === 'cash' && <View style={styles.payCheck} />}
          </Pressable>
          <Pressable
            style={[styles.payRow, paymentMethod === 'click_online' && styles.payRowActive]}
            onPress={() => setPaymentMethod('click_online')}>
            <CreditCard size={18} color={paymentMethod === 'click_online' ? colors.brand.primary : colors.text.tertiary} strokeWidth={2.2} />
            <Text style={[styles.payText, paymentMethod === 'click_online' && { color: colors.brand.primary }]}>Click orqali</Text>
            {paymentMethod === 'click_online' && <View style={styles.payCheck} />}
          </Pressable>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Row label="Mahsulotlar" value={`${subTotal.toLocaleString()} so'm`} />
          <Row
            label="Yetkazib berish"
            value={deliveryFee === 0 ? 'Tekin' : `${deliveryFee.toLocaleString()} so'm`}
          />
          <View style={styles.divider} />
          <Row label="Jami" value={`${total.toLocaleString()} so'm`} bold />
        </View>

        {belowMin && (
          <Text style={styles.warn}>
            Minimal buyurtma {minOrder.toLocaleString()} so'm. Yana{' '}
            {(minOrder - subTotal).toLocaleString()} so'm qo'shing.
          </Text>
        )}
        {outOfZone && (
          <Text style={styles.warn}>Manzil do'konning yetkazib berish zonasidan tashqarida.</Text>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Jami</Text>
          <Text style={styles.footerTotalValue}>{total.toLocaleString()} so'm</Text>
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

      <CheckoutAddressSheet
        visible={addressSheetVisible}
        addresses={addressesQuery.data ?? []}
        selectedId={selectedAddressId}
        onSelect={selectAddress}
        onClose={() => setAddressSheetVisible(false)}
      />
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
  whereRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  whereIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressLabel: { ...typography.bodyStrong },
  addressText: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  detailsInput: { flexBasis: '47%', flexGrow: 1 },
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
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  phoneInput: { flex: 1 },
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
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  payRowActive: {
    borderColor: colors.brand.primary,
    backgroundColor: `${colors.brand.primary}10`,
  },
  payText: { ...typography.body, fontWeight: '600', flex: 1 },
  payCheck: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.primary,
  },
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
    paddingBottom: spacing.sm,
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
