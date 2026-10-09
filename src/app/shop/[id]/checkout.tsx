import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ShoppingBag } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutAddressSheet } from '@/components/CheckoutAddressSheet';
import { CheckoutDeliveryCard } from '@/components/CheckoutDeliveryCard';
import {
  CheckoutCartItemsCard,
  CheckoutFooter,
  CheckoutPaymentSection,
} from '@/components/checkout';
import { useToast } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, PublicShop, SavedCard, UserAddress } from '@/lib/types';
import { startOrderActivity } from '@/lib/useOrderLiveActivity';
import { useAuthStore } from '@/stores/auth';
import { EMPTY_CART, useCartStore } from '@/stores/cart';
import { useEffectiveCoords, useLocationStore } from '@/stores/location';
import { colors, layout, radius, spacing, typography } from '@/theme';

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

  // Pre-select the default saved card the first time the list loads
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
      const preferred = list.find((a) => a.id === lastUsedAddress?.id) ?? list.find((a) => a.isDefault) ?? list[0];
      if (preferred && !selectedAddressId) setSelectedAddressId(preferred.id);
      return list;
    },
  });

  const selectedAddress = addressesQuery.data?.find((a) => a.id === selectedAddressId);
  const zoneCheckCoords = selectedAddress
    ? { latitude: selectedAddress.latitude, longitude: selectedAddress.longitude }
    : coords;

  // Prefill the apartment-detail fields from whichever address is selected
  const [detailsAddressId, setDetailsAddressId] = useState<string | null>(null);
  if (selectedAddress && selectedAddress.id !== detailsAddressId) {
    setDetailsAddressId(selectedAddress.id);
    setEntrance(selectedAddress.entrance ?? '');
    setFloor(selectedAddress.floor ?? '');
    setApartment(selectedAddress.apartment ?? '');
    setIntercom(selectedAddress.intercom ?? '');
  }

  // One-time prefill from the account's own phone
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
        try {
          await api.post(`/click/orders/${order.id}/pay-with-card`, { cardId: selectedCardId });
          toast.success(tr('checkout.orderSent'));
        } catch (e) {
          toast.error(extractErrorMessage(e));
        }
      } else if (paymentMethod === 'click_online') {
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Order items and totals */}
          <CheckoutCartItemsCard
            shop={shop}
            cartLines={cartLines}
            subTotal={subTotal}
            deliveryFee={deliveryFee}
            onUpdateQty={(variantId, quantity) => updateQty(shopId!, variantId, quantity)}
          />

          {/* Delivery & address card */}
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

          {/* Payment method selection */}
          <CheckoutPaymentSection
            paymentMethod={paymentMethod}
            onSelectPaymentMethod={setPaymentMethod}
            activeCards={activeCards}
            selectedCardId={selectedCardId}
            onSelectCardId={setSelectedCardId}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating footer */}
      <CheckoutFooter
        blocker={blocker}
        total={total}
        canOrder={canOrder}
        isPending={createOrder.isPending}
        onSubmit={() => createOrder.mutate()}
      />

      {/* Address selection sheet */}
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
});
