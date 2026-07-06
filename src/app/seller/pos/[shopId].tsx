import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Minus, Plus, ScanLine, Search, ShoppingCart, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { SellerVariant } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
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
  // Remember picked products so the cart total stays correct as the search changes.
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
      else toast.error('Bu barkodli mahsulot topilmadi');
    } catch {
      toast.error('Bu barkodli mahsulot topilmadi');
    }
  };

  const sell = useMutation({
    mutationFn: async () => {
      const items = cartLines.map((l) => ({ productVariantId: l.variant.id, quantity: l.qty }));
      await api.post(`/seller/shops/${shopId}/orders/instore`, { items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      qc.invalidateQueries({ queryKey: ['seller-orders', shopId] });
      setCart({});
      haptics.success();
      toast.show('Sotuv yakunlandi ✓', { variant: 'success' });
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text.primary} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.title}>Do‘konda sotish</Text>
        <Pressable onPress={() => setScanOpen(true)} style={styles.scanBtn}>
          <ScanLine size={20} color={colors.text.onPrimary} strokeWidth={2.3} />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Mahsulot qidirish yoki skanlash"
          placeholderTextColor={colors.text.hint}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const inCart = cart[item.id] ?? 0;
          return (
            <Pressable style={styles.pRow} onPress={() => add(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.pMeta}>{fmt(item.discountPrice ?? item.price)} so‘m · qoldiq {item.stock}</Text>
              </View>
              {inCart > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{inCart}</Text>
                </View>
              ) : (
                <View style={styles.addCircle}>
                  <Plus size={16} color={colors.text.onPrimary} strokeWidth={2.8} />
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Cart summary + confirm */}
      {cartLines.length > 0 ? (
        <View style={styles.cartPanel}>
          {cartLines.map((l) => (
            <View key={l.variant.id} style={styles.cartRow}>
              <Text style={styles.cartName} numberOfLines={1}>{l.variant.name}</Text>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => dec(l.variant.id)}>
                  <Minus size={13} color={colors.brand.primary} strokeWidth={2.8} />
                </Pressable>
                <Text style={styles.qVal}>{l.qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => add(l.variant)}>
                  <Plus size={13} color={colors.brand.primary} strokeWidth={2.8} />
                </Pressable>
              </View>
              <Text style={styles.cartLineTotal}>{fmt((l.variant.discountPrice ?? l.variant.price) * l.qty)}</Text>
            </View>
          ))}
          <View style={styles.cartActions}>
            <Pressable
              style={styles.clearBtn}
              onPress={() =>
                Alert.alert('Savatni tozalash', 'Savatdagi barcha mahsulotlar o‘chirilsinmi?', [
                  { text: 'Bekor', style: 'cancel' },
                  { text: 'Tozalash', style: 'destructive', onPress: () => setCart({}) },
                ])
              }
              hitSlop={8}>
              <Trash2 size={18} color={colors.text.danger} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              style={[styles.sellBtn, sell.isPending && { opacity: 0.6 }]}
              disabled={sell.isPending}
              onPress={() => sell.mutate()}>
              <ShoppingCart size={18} color={colors.text.onPrimary} strokeWidth={2.4} />
              <Text style={styles.sellText}>
                {sell.isPending ? 'Sotilmoqda…' : `Sotish · ${fmt(total)} so‘m`}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.cartHint}>{itemCount} dona · naqd · do‘konda sotuv</Text>
        </View>
      ) : null}

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
        title="Sotish uchun barkodni skanlang"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.h4, color: colors.text.primary },
  scanBtn: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.screenPadding,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text.primary },
  list: { padding: layout.screenPadding, gap: spacing.xs, paddingBottom: spacing.md },
  pRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pName: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  pMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  addCircle: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  badge: { minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: radius.full, backgroundColor: colors.feedback.success, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...typography.bodyStrong, color: colors.text.onPrimary, fontWeight: '800' },
  cartPanel: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.lg,
  },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cartName: { ...typography.bodySmall, color: colors.text.primary, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stepBtn: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.brand.primarySurface, alignItems: 'center', justifyContent: 'center' },
  qVal: { ...typography.bodyStrong, color: colors.text.primary, minWidth: 18, textAlign: 'center' },
  cartLineTotal: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary, minWidth: 60, textAlign: 'right' },
  cartActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  clearBtn: { width: 48, height: layout.buttonHeight.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.feedback.danger, alignItems: 'center', justifyContent: 'center' },
  sellBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.success,
  },
  sellText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  cartHint: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
});
