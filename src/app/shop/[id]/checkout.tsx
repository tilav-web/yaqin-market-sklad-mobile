import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { AlertCircle, CreditCard, Minus, Plus, ShoppingBag, Store, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardVisual } from '@/components/CardVisual';
import { CheckoutAddressSheet } from '@/components/CheckoutAddressSheet';
import { CheckoutDeliveryCard } from '@/components/CheckoutDeliveryCard';
import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { startOrderActivity } from '@/lib/useOrderLiveActivity';
import { Order, PublicShop, SavedCard, UserAddress } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { detectCardBrand } from '@/utils/cardBrand';
import { haptics } from '@/utils/haptics';

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
  // Raw device fix (not `useEffectiveCoords`, which substitutes the picked
  // address) — the delivery card reports whether GPS itself resolved.
  const deviceCoords = useLocationStore((s) => s.coords);
  const gpsLoading = useLocationStore((s) => s.loading);
  const refreshGps = useLocationStore((s) => s.refresh);
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => (await api.get<SavedCard[]>('/click/cards')).data,
    enabled: paymentMethod === 'click_online',
  });
  const activeCards = (cardsQuery.data ?? []).filter((c) => c.status === 'active');

  // Pre-select the default saved card the first time the list loads — after
  // that the user's own tap (including explicitly picking "redirect" /
  // deselecting) is never overridden again. A card added on /add-card comes
  // back through the same path when it is the customer's first one.
  const cardsPrefilled = useRef(false);
  useEffect(() => {
    if (!cardsPrefilled.current && activeCards.length > 0) {
      setSelectedCardId(activeCards.find((c) => c.isDefault)?.id ?? activeCards[0].id);
      cardsPrefilled.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCards.length]);

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

  // Prefill the apartment-detail fields from whichever address is selected.
  // Done during render (not in an effect) so the fields never paint one frame
  // of the previous address's values, and keyed on the address id so it only
  // re-runs when the customer actually switches address — never clobbering
  // details they are in the middle of editing.
  const [detailsAddressId, setDetailsAddressId] = useState<string | null>(null);
  if (selectedAddress && selectedAddress.id !== detailsAddressId) {
    setDetailsAddressId(selectedAddress.id);
    setEntrance(selectedAddress.entrance ?? '');
    setFloor(selectedAddress.floor ?? '');
    setApartment(selectedAddress.apartment ?? '');
    setIntercom(selectedAddress.intercom ?? '');
  }

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

      if (paymentMethod === 'click_online' && selectedCardId) {
        // Charge the saved card directly — no redirect needed. Failure still
        // leaves the order placed (paymentStatus stays pending); the order
        // detail screen offers the same saved-card retry + the redirect.
        try {
          await api.post(`/click/orders/${order.id}/pay-with-card`, { cardId: selectedCardId });
          toast.success(tr('checkout.orderSent'));
        } catch (e) {
          toast.error(extractErrorMessage(e));
        }
      } else if (paymentMethod === 'click_online') {
        // Open Click payment page before navigating to order detail
        try {
          const { data } = await api.get<{ url: string }>(`/click/orders/${order.id}/url`);
          await WebBrowser.openBrowserAsync(data.url, { showTitle: true });
        } catch {
          toast.error(tr('checkout.paymentPageError'));
        }
      } else {
        toast.success(tr('checkout.orderSent'));
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

  // The single reason the order can't be placed, shown as a slim band above
  // the footer button. Min-order also carries a fill ratio so the customer
  // sees how close they are instead of only being told "not enough".
  // Stays silent while the saved addresses are still in flight — one of them
  // is about to be auto-selected, so "no address" would be a false alarm.
  const blocker = addressesQuery.isLoading
    ? null
    : !selectedAddressId
      ? { text: tr('checkout.noAddressTitle'), danger: false, progress: null }
      : outOfZone
        ? { text: tr('checkout.zoneOut'), danger: true, progress: null }
        : belowMin
          ? {
              text: tr('checkout.addMore', { rest: (minOrder - subTotal).toLocaleString() }),
              danger: false,
              progress: Math.min(100, Math.round((subTotal / minOrder) * 100)),
            }
          : null;

  if (!cartLines.length) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.emptyCartIcon}>
          <ShoppingBag size={30} color={colors.text.hint} strokeWidth={2} />
        </View>
        <Text style={styles.dim}>{tr('cart.empty.title')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* What you're buying comes first — it's what the customer opens this
              screen to check. The money rows live at the bottom of this same
              card instead of a separate summary block. */}
          <View style={styles.section}>
            <View style={styles.shopRow}>
              <View style={styles.shopIcon}>
                <Store size={16} color={colors.brand.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName} numberOfLines={1}>
                  {shop?.name ?? tr('checkout.itemsTitle')}
                </Text>
                <Text style={styles.shopMeta}>{tr('cart.itemsCount', { n: cartLines.length })}</Text>
              </View>
            </View>

            {cartLines.map((line, i) => (
              <View key={line.variantId} style={[styles.cartItem, i > 0 && styles.cartItemBordered]}>
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
                    {(line.unitPrice * line.quantity).toLocaleString()} {tr('common.som')}
                  </Text>
                </View>
                <View style={styles.qtyControls}>
                  <Pressable
                    style={styles.qtyBtn}
                    hitSlop={4}
                    onPress={() => {
                      haptics.light();
                      updateQty(shopId!, line.variantId, line.quantity - 1);
                    }}>
                    {line.quantity === 1 ? (
                      <Trash2 size={15} color={colors.brand.primary} strokeWidth={2.4} />
                    ) : (
                      <Minus size={16} color={colors.brand.primary} strokeWidth={3} />
                    )}
                  </Pressable>
                  <Text style={styles.qty}>{line.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    hitSlop={4}
                    onPress={() => {
                      haptics.light();
                      updateQty(shopId!, line.variantId, line.quantity + 1);
                    }}>
                    <Plus size={16} color={colors.brand.primary} strokeWidth={3} />
                  </Pressable>
                </View>
              </View>
            ))}

            <View style={styles.divider} />
            <Row label={tr('cart.subtotal')} value={`${subTotal.toLocaleString()} ${tr('common.som')}`} />
            {/* Until the shop (and with it the zone fee) has loaded the fee is
                simply unknown — showing the 0 default would advertise free
                delivery for a moment and then take it away. */}
            <Row
              label={tr('cart.deliveryFee')}
              value={
                !shop
                  ? '—'
                  : deliveryFee === 0
                    ? tr('shop.freeShort')
                    : `${deliveryFee.toLocaleString()} ${tr('common.som')}`
              }
              free={!!shop && deliveryFee === 0}
            />
          </View>

          <CheckoutDeliveryCard
            address={selectedAddress}
            loading={addressesQuery.isLoading}
            hasSavedAddresses={(addressesQuery.data?.length ?? 0) > 0}
            onChangeAddress={() => setAddressSheetVisible(true)}
            onAddAddress={() => router.push('/addresses')}
            gpsAvailable={!!deviceCoords}
            gpsLoading={gpsLoading}
            onEnableGps={() => void refreshGps()}
            entrance={entrance}
            floor={floor}
            apartment={apartment}
            intercom={intercom}
            phone={recipientPhone}
            comment={courierComment}
            onEntrance={setEntrance}
            onFloor={setFloor}
            onApartment={setApartment}
            onIntercom={setIntercom}
            onPhone={setRecipientPhone}
            onComment={setCourierComment}
          />

          {/* Payment */}
          <View style={styles.section}>
            <Pressable
              style={[styles.payRow, paymentMethod === 'cash' && styles.payRowActive]}
              onPress={() => {
                haptics.selection();
                setPaymentMethod('cash');
              }}>
              <Wallet
                size={18}
                color={paymentMethod === 'cash' ? colors.brand.primary : colors.text.tertiary}
                strokeWidth={2.2}
              />
              <Text style={[styles.payText, paymentMethod === 'cash' && styles.payTextActive]}>
                {tr('checkout.cash')}
              </Text>
              <View style={[styles.radio, paymentMethod === 'cash' && styles.radioActive]}>
                {paymentMethod === 'cash' && <View style={styles.radioDot} />}
              </View>
            </Pressable>
            <Pressable
              style={[styles.payRow, paymentMethod === 'click_online' && styles.payRowActive]}
              onPress={() => {
                haptics.selection();
                setPaymentMethod('click_online');
              }}>
              <CreditCard
                size={18}
                color={paymentMethod === 'click_online' ? colors.brand.primary : colors.text.tertiary}
                strokeWidth={2.2}
              />
              <Text style={[styles.payText, paymentMethod === 'click_online' && styles.payTextActive]}>
                {tr('checkout.cardPayment')}
              </Text>
              <View style={[styles.radio, paymentMethod === 'click_online' && styles.radioActive]}>
                {paymentMethod === 'click_online' && <View style={styles.radioDot} />}
              </View>
            </Pressable>

            {paymentMethod === 'click_online' && (
              <View style={styles.cardSubList}>
                {activeCards.map((card) => {
                  const active = selectedCardId === card.id;
                  const brand = detectCardBrand(card.cardNumberMasked ?? '');
                  return (
                    <Pressable
                      key={card.id}
                      style={styles.cardSubRow}
                      onPress={() => {
                        haptics.selection();
                        setSelectedCardId(card.id);
                      }}>
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                      <CardVisual
                        size="mini"
                        brand={brand}
                        numberText={card.cardNumberMasked ?? '••••'}
                        fallbackLabel={tr('cards.genericName')}
                      />
                      <Text style={styles.cardSubText} numberOfLines={1}>
                        {card.label || card.cardNumberMasked || '••••'}
                      </Text>
                      {card.isDefault && <Text style={styles.cardSubDefault}>{tr('cards.default')}</Text>}
                    </Pressable>
                  );
                })}
                <Pressable style={styles.cardSubRow} onPress={() => setSelectedCardId(null)}>
                  <View style={[styles.radio, !selectedCardId && styles.radioActive]}>
                    {!selectedCardId && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.cardSubText}>{tr('checkout.payWithRedirect')}</Text>
                </Pressable>
                {/* A pushed screen, not a sheet — the card mockup plus the
                    SMS-verify step never fit in one. */}
                <Pressable onPress={() => router.push('/add-card')}>
                  <Text style={styles.addCardLink}>{tr('cards.add')}</Text>
                </Pressable>
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {/* Why the button is off, stated once in a slim band — the button's
            own label stays "place order" so it never turns into a wall of
            text sitting where the primary action should be. */}
        {blocker && (
          <View style={[styles.blocker, blocker.danger && styles.blockerDanger]}>
            <View style={styles.blockerRow}>
              <AlertCircle
                size={14}
                color={blocker.danger ? colors.feedback.danger : colors.feedback.warning}
                strokeWidth={2.6}
              />
              <Text style={[styles.blockerText, blocker.danger && styles.blockerTextDanger]}>
                {blocker.text}
              </Text>
            </View>
            {blocker.progress != null && (
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${blocker.progress}%` }]} />
              </View>
            )}
          </View>
        )}
        <View style={styles.footerRow}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>{tr('cart.total')}</Text>
            <Text style={styles.footerTotalValue}>
              {total.toLocaleString()} {tr('common.som')}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.medium();
              createOrder.mutate();
            }}
            disabled={!canOrder || createOrder.isPending}
            style={[styles.orderBtn, (!canOrder || createOrder.isPending) && styles.orderBtnDisabled]}>
            {createOrder.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.orderBtnText}>{tr('cart.proceed')}</Text>
            )}
          </Pressable>
        </View>
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

function Row({
  label,
  value,
  free,
}: {
  readonly label: string;
  readonly value: string;
  readonly free?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, free && styles.rowValueFree]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.canvas,
  },
  emptyCartIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { ...typography.body, color: colors.text.secondary },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['5xl'] },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },

  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  shopIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...typography.h4, color: colors.text.primary },
  shopMeta: { ...typography.caption, color: colors.text.tertiary },

  cartItem: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md, alignItems: 'center' },
  cartItemBordered: { borderTopWidth: 1, borderTopColor: colors.border.subtle },
  itemThumb: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.bg.surfaceMuted,
  },
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
  qtyBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qty: { ...typography.bodyStrong, color: colors.brand.primary, minWidth: 20, textAlign: 'center' },

  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    marginBottom: spacing.sm,
  },
  payRowActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  payText: { ...typography.body, fontWeight: '600', flex: 1 },
  payTextActive: { color: colors.brand.primary },
  cardSubList: { gap: spacing.sm, paddingLeft: spacing.md, marginTop: spacing.xs },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.brand.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.primary },
  cardSubText: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  cardSubDefault: { ...typography.caption, color: colors.brand.primary, fontWeight: '700' },
  addCardLink: { ...typography.bodySmall, color: colors.brand.primary, fontWeight: '700', paddingVertical: spacing.xs },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowValue: { ...typography.body, fontWeight: '600' },
  rowValueFree: { color: colors.feedback.success, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginTop: spacing.sm, marginBottom: spacing.md },

  blocker: {
    backgroundColor: colors.feedback.warningSurface,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
    gap: 6,
  },
  blockerDanger: { backgroundColor: colors.feedback.dangerSurface },
  blockerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockerText: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', flex: 1 },
  blockerTextDanger: { color: colors.feedback.danger },
  progressTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.feedback.warning },

  footer: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    ...shadow.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
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
