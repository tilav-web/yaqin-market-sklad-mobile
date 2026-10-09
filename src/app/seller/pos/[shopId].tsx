import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, ScanLine, Search } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { PosCartPanel } from '@/components/seller/PosCartPanel';
import { useToast } from '@/components/ui';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, SellerVariant } from '@/lib/types';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export default function PosScreen() {
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [scanOpen, setScanOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<Record<string, SellerVariant>>({});

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const variantsQuery = useQuery({
    queryKey: ['variants', shopId, 'pos', search],
    queryFn: async () => {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: search || undefined, limit: 50 },
      });
      return res.data;
    },
  });
  const filtered = variantsQuery.data ?? [];

  const cartLines = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ variant: picked[id], qty })).filter((l) => l.variant),
    [cart, picked],
  );
  const total = cartLines.reduce((s, l) => s + (l.variant.discountPrice ?? l.variant.price) * l.qty, 0);
  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0);

  const add = (v: SellerVariant) => {
    if (v.stock <= (cart[v.id] ?? 0)) {
      toast.error(`"${v.name}" qoldig'i yetarli emas`);
      return;
    }
    haptics.selection();
    setPicked((p) => ({ ...p, [v.id]: v }));
    setCart((c) => ({ ...c, [v.id]: (c[v.id] ?? 0) + 1 }));
  };

  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const copy = { ...c };
      if (n <= 0) delete copy[id];
      else copy[id] = n;
      return copy;
    });

  const onScanned = async (code: string) => {
    const local = filtered.find((v) => v.barcode === code);
    if (local) {
      add(local);
      return;
    }
    try {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: code, limit: 5 },
      });
      const match = res.data.find((v) => v.barcode === code);
      if (match) add(match);
      else toast.error(tr('pos.barcodeNotFound'));
    } catch {
      toast.error(tr('pos.barcodeNotFound'));
    }
  };

  const sell = useMutation({
    mutationFn: async () => {
      const items = cartLines.map((l) => ({ productVariantId: l.variant.id, quantity: l.qty }));
      const res = await api.post<Order>(`/seller/shops/${shopId}/orders/instore`, { items });
      return res.data;
    },
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      qc.invalidateQueries({ queryKey: ['seller-orders', shopId] });
      setCart({});
      haptics.success();
      const needsMarking = order.items?.some(
        (it) => it.productVariant?.globalProduct?.taxCategory?.markingRequired,
      );
      if (needsMarking) {
        Alert.alert(
          tr('pos.markingSoldTitle'),
          tr('pos.markingSoldBody'),
          [
            { text: tr('pos.later'), style: 'cancel' },
            { text: tr('pos.scan'), onPress: () => router.push(`/seller/order/${order.id}`) },
          ],
        );
      } else {
        toast.show(tr('pos.saleDone'), { variant: 'success' });
      }
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>
        <Text className="text-lg font-bold text-text-primary">{tr('pos.inStoreSale')}</Text>
        <Pressable
          onPress={() => setScanOpen(true)}
          className="w-10 h-10 rounded-full bg-brand-primary items-center justify-center"
        >
          <ScanLine size={20} color="#ffffff" strokeWidth={2.3} />
        </Pressable>
      </View>

      {/* Search box */}
      <View className="flex-row items-center gap-2 mx-4 bg-surface rounded-xl px-3 border border-border-default h-11">
        <Search size={16} color={colors.text.tertiary} />
        <TextInput
          className="flex-1 text-sm text-text-primary"
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={tr('pos.searchPlaceholder')}
          placeholderTextColor={colors.text.hint}
        />
      </View>

      {/* Variant List */}
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const inCart = cart[item.id] ?? 0;
          return (
            <Pressable
              className="flex-row items-center gap-3 bg-surface rounded-xl p-3 border border-border-subtle"
              onPress={() => add(item)}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  {fmt(item.discountPrice ?? item.price)} so‘m · qoldiq {item.stock}
                </Text>
              </View>
              {inCart > 0 ? (
                <View className="min-w-[32px] h-8 px-2 rounded-full bg-emerald-600 items-center justify-center">
                  <Text className="text-xs font-extrabold text-white">{inCart}</Text>
                </View>
              ) : (
                <View className="w-8 h-8 rounded-full bg-brand-primary items-center justify-center">
                  <Plus size={16} color="#ffffff" strokeWidth={2.8} />
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Cart Panel */}
      <PosCartPanel
        cartLines={cartLines}
        total={total}
        itemCount={itemCount}
        onAdd={add}
        onDec={dec}
        onClear={() => setCart({})}
        onSell={() => sell.mutate()}
        isPending={sell.isPending}
      />

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
        title={tr('pos.scanToSell')}
      />
    </SafeAreaView>
  );
}
