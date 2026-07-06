import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { AlertTriangle, ClipboardCheck, History, Minus, MoreVertical, Package, PackagePlus, Pencil, Plus, ScanLine, Search, Tag, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { InventoryCountModal } from '@/components/seller/InventoryCountModal';
import { KirimModal } from '@/components/seller/KirimModal';
import { ProductFormModal, ProductPrefill } from '@/components/seller/ProductFormModal';
import { QuickAddModal } from '@/components/seller/QuickAddModal';
import { StockHistoryModal } from '@/components/seller/StockHistoryModal';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { Category, ExpiringItem, GlobalProduct, SellerVariant } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

const UNIT_LABEL: Record<string, string> = {
  piece: 'dona',
  kg: 'kg',
  liter: 'litr',
  gram: 'g',
  pack: 'paket',
};

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

type Tab = 'all' | 'expiring';

export default function SellerInventoryScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  // Permanent product delete is owner-only server-side (ensureShopOwner) —
  // everything else on this screen (view/add/edit/receive) is granted per
  // staff permission, so only the delete action is hidden for non-owners.
  const isOwner = useIsShopOwner(shopId);
  const [tab, setTab] = useState<Tab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SellerVariant | null>(null);
  const [kirimFor, setKirimFor] = useState<SellerVariant | null>(null);
  const [historyFor, setHistoryFor] = useState<SellerVariant | null>(null);
  const [lowOnly, setLowOnly] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [prefill, setPrefill] = useState<ProductPrefill | null>(null);
  const [quickAddGp, setQuickAddGp] = useState<import('@/lib/types').GlobalProduct | null>(null);
  const [countOpen, setCountOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

  // Debounce the search so we don't hit the server on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const PAGE = 40;
  const variantsQuery = useInfiniteQuery({
    queryKey: ['variants', shopId, 'page', search, lowOnly],
    staleTime: 60_000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: search || undefined, lowOnly: lowOnly || undefined, limit: PAGE, offset: pageParam },
      });
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE ? allPages.length * PAGE : undefined,
  });

  const variants = useMemo(
    () => (variantsQuery.data?.pages ?? []).flat(),
    [variantsQuery.data],
  );

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const leafCategories = useMemo(() => {
    const out: Category[] = [];
    for (const root of categoriesQuery.data ?? []) {
      if (root.children?.length) out.push(...root.children);
      else out.push(root);
    }
    return out;
  }, [categoriesQuery.data]);

  const adjust = useMutation({
    mutationFn: async ({ variantId, delta }: { variantId: string; delta: number }) => {
      await api.post(`/seller/shops/${shopId}/products/variants/${variantId}/stock`, { delta });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variants', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (variantId: string) => {
      await api.delete(`/seller/shops/${shopId}/products/variants/${variantId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['variants', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });


  const expiringQuery = useQuery({
    queryKey: ['variants-expiring', shopId],
    queryFn: async () => {
      const res = await api.get<ExpiringItem[]>(`/seller/shops/${shopId}/products/variants/expiring`);
      return res.data;
    },
    enabled: tab === 'expiring',
    staleTime: 60_000,
  });

  const openVariantMenu = (item: SellerVariant) => {
    Alert.alert(item.name, undefined, [
      { text: 'Bekor', style: 'cancel' },
    ]);
  };

  // Add a product WITHOUT a barcode (the scanner's escape hatch).
  const openCreateBlank = () => {
    setScannedBarcode('');
    setPrefill(null);
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (v: SellerVariant) => {
    setPrefill(null);
    setEditing(v);
    setFormOpen(true);
  };

  /**
   * Scanned a barcode. Three branches:
   *  (a) already in this shop → Kirim (receive stock)
   *  (b) in shared catalogue, but not in this shop → QuickAddModal (price+stock only)
   *  (c) unknown → full ProductFormModal with barcode pre-filled
   */
  const onScanned = async (code: string) => {
    try {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: code, limit: 5 },
      });
      const match = res.data.find((v) => v.barcode === code);
      if (match) {
        setKirimFor(match);
        return;
      }
    } catch (e) {
      Alert.alert(tr('common.error'), extractErrorMessage(e));
      return;
    }
    try {
      const res = await api.get<import('@/lib/types').GlobalProduct>(`/catalog-global/by-barcode/${encodeURIComponent(code)}`);
      const g = res.data;
      // (b) GlobalProduct exists in shared catalogue → quick add (price + stock only)
      setQuickAddGp(g);
      return;
    } catch {
      // (c) Not in catalogue yet → full form
      setPrefill(null);
      setScannedBarcode(code);
      setEditing(null);
      setFormOpen(true);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]} onPress={() => setTab('all')}>
          <Package size={15} color={tab === 'all' ? colors.text.onPrimary : colors.text.secondary} strokeWidth={2.2} />
          <Text style={[styles.tabBtnText, tab === 'all' && styles.tabBtnTextActive]}>Barcha tovarlar</Text>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'expiring' && styles.tabBtnActive]} onPress={() => setTab('expiring')}>
          <AlertTriangle size={15} color={tab === 'expiring' ? colors.text.onPrimary : colors.feedback.warning} strokeWidth={2.2} />
          <Text style={[styles.tabBtnText, tab === 'expiring' && styles.tabBtnTextActive]}>Muddatlar</Text>
        </Pressable>
        <Pressable style={styles.bulkBtn} onPress={() => setBulkPriceOpen(true)}>
          <Tag size={15} color={colors.brand.primary} strokeWidth={2.2} />
          <Text style={styles.bulkBtnText}>Narx</Text>
        </Pressable>
      </View>

      {tab === 'expiring' ? (
        <ExpiringList data={expiringQuery.data ?? []} isLoading={expiringQuery.isLoading} />
      ) : (
      <>
      {/* Search + actions (always visible) */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={17} color={colors.text.tertiary} strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Mahsulot nomi yoki barkod"
            placeholderTextColor={colors.text.hint}
            returnKeyType="search"
          />
          {searchInput.length > 0 ? (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Text style={styles.clearSearch}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.toolbarActions}>
          <Pressable
            onPress={() => setLowOnly((v) => !v)}
            style={[styles.lowChip, lowOnly && styles.lowChipActive]}>
            <Text style={[styles.lowChipText, lowOnly && styles.lowChipTextActive]}>Kam qolgan</Text>
          </Pressable>
          <Pressable onPress={() => setScanOpen(true)} style={styles.iconBtn}>
            <ScanLine size={18} color={colors.brand.primary} strokeWidth={2.2} />
          </Pressable>
          <Pressable onPress={() => setCountOpen(true)} style={styles.iconBtn}>
            <ClipboardCheck size={18} color={colors.brand.primary} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={variants}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              variantsQuery.isFetching &&
              !variantsQuery.isLoading &&
              !variantsQuery.isFetchingNextPage
            }
            onRefresh={() => {
              void variantsQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (variantsQuery.hasNextPage && !variantsQuery.isFetchingNextPage) variantsQuery.fetchNextPage();
        }}
        ListFooterComponent={
          variantsQuery.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: spacing.md }} />
          ) : null
        }
        ListEmptyComponent={
          variantsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Package size={28} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>
                {search ? 'Topilmadi' : "Mahsulot yo'q"}
              </Text>
              <Text style={styles.dim}>
                {search ? 'Boshqa nom yoki barkod bilan qidiring' : "Pastdagi tugma orqali birinchi mahsulotni qo'shing"}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const hasDiscount = item.discountPrice != null && item.discountPrice < item.price;
          const low = item.stock <= item.lowStockThreshold;
          const sellPrice = item.discountPrice ?? item.price;
          const avgCost = item.cost?.avgCost ?? 0;
          const profit = Math.max(0, sellPrice - avgCost);
          return (
            <View style={styles.card}>
              <Pressable style={styles.cardMain} onPress={() => openEdit(item)}>
                <View style={styles.imageWrap}>
                  {item.photos[0] ? (
                    <Image source={{ uri: resolveMedia(item.photos[0]) }} style={styles.image} />
                  ) : (
                    <View style={[styles.image, styles.placeholder]}>
                      <Package size={22} color={colors.brand.primary} strokeWidth={1.6} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.priceRow}>
                    {hasDiscount ? (
                      <Text style={styles.oldPrice}>{item.price.toLocaleString()}</Text>
                    ) : null}
                    <Text style={styles.price}>{sellPrice.toLocaleString()} so&apos;m</Text>
                  </View>
                  <Text style={styles.unit}>
                    {item.unitSize} {UNIT_LABEL[item.unitType] ?? item.unitType}
                  </Text>
                </View>
                <View style={styles.cardTopActions}>
                  <Pencil size={16} color={colors.text.tertiary} strokeWidth={2} />
                  <Pressable onPress={() => openVariantMenu(item)} hitSlop={8}>
                    <MoreVertical size={16} color={colors.text.tertiary} strokeWidth={2} />
                  </Pressable>
                </View>
              </Pressable>

              {/* Cost / profit strip */}
              <View style={styles.costStrip}>
                <Text style={styles.costText}>
                  Tannarx <Text style={styles.costVal}>{avgCost > 0 ? fmt(avgCost) : '—'}</Text>
                </Text>
                <Text style={styles.costText}>
                  Foyda/dona <Text style={[styles.costVal, { color: colors.feedback.success }]}>{fmt(profit)}</Text>
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[styles.stock, low && styles.stockLow]}>
                  Qoldiq: {item.stock} ta{low ? ' · kam!' : ''}
                </Text>
                <View style={styles.stockControls}>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => adjust.mutate({ variantId: item.id, delta: -1 })}>
                    <Minus size={15} color={colors.brand.primary} strokeWidth={2.6} />
                  </Pressable>
                  <Pressable
                    style={styles.stepBtn}
                    onPress={() => adjust.mutate({ variantId: item.id, delta: 1 })}>
                    <Plus size={15} color={colors.brand.primary} strokeWidth={2.6} />
                  </Pressable>
                  <Pressable style={styles.historyBtn} onPress={() => setHistoryFor(item)}>
                    <History size={15} color={colors.text.secondary} strokeWidth={2.2} />
                  </Pressable>
                  {isOwner !== false && (
                    <Pressable
                      style={styles.delBtn}
                      onPress={() =>
                        Alert.alert("O'chirish", `"${item.name}" ni o'chirasizmi?`, [
                          { text: 'Bekor', style: 'cancel' },
                          { text: "O'chirish", style: 'destructive', onPress: () => remove.mutate(item.id) },
                        ])
                      }>
                      <Trash2 size={15} color={colors.text.danger} strokeWidth={2.2} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Primary warehouse action */}
              <Pressable style={styles.kirimBtn} onPress={() => setKirimFor(item)}>
                <PackagePlus size={16} color={colors.brand.primary} strokeWidth={2.3} />
                <Text style={styles.kirimText}>Kirim — tovar keldi</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => setScanOpen(true)}>
        <Plus size={22} color={colors.text.onPrimary} strokeWidth={2.8} />
        <Text style={styles.fabText}>Mahsulot</Text>
      </Pressable>
      </>
      )}

      <ProductFormModal
        visible={formOpen}
        shopId={shopId}
        editing={editing}
        categories={leafCategories}
        initialBarcode={scannedBarcode}
        prefill={prefill}
        onClose={() => setFormOpen(false)}
      />

      <QuickAddModal
        visible={!!quickAddGp}
        shopId={shopId}
        globalProduct={quickAddGp}
        onClose={() => setQuickAddGp(null)}
      />

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
        onSkip={openCreateBlank}
        title="Mahsulot qo'shish — barkodni skanlang"
      />

      <InventoryCountModal
        visible={countOpen}
        shopId={shopId}
        onClose={() => setCountOpen(false)}
      />

      <KirimModal
        visible={!!kirimFor}
        shopId={shopId}
        variant={kirimFor}
        onClose={() => setKirimFor(null)}
      />

      <StockHistoryModal
        visible={!!historyFor}
        shopId={shopId}
        variant={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      <BulkPriceModal
        visible={bulkPriceOpen}
        shopId={shopId}
        categories={leafCategories}
        onClose={() => setBulkPriceOpen(false)}
        onDone={() => {
          setBulkPriceOpen(false);
          qc.invalidateQueries({ queryKey: ['variants', shopId] });
        }}
      />
    </SafeAreaView>
  );
}

function ExpiringList({ data, isLoading }: { data: ExpiringItem[]; isLoading: boolean }) {
  if (isLoading) return <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />;
  if (!data.length) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <AlertTriangle size={28} color={colors.feedback.warning} strokeWidth={1.8} />
        </View>
        <Text style={styles.emptyTitle}>Muddatli tovar yo'q</Text>
        <Text style={styles.dim}>Yaqin 30 kunda muddati tugaydigan tovarlar bu yerda ko'rinadi</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {data.map((item) => {
        const urgent = item.daysToExpiry <= 2;
        return (
          <View key={item.batchId} style={[styles.card, urgent && styles.cardUrgent]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md }}>
              <View style={[styles.expiryDaysBox, { backgroundColor: urgent ? colors.feedback.dangerSurface : colors.feedback.warningSurface }]}>
                <Text style={[styles.expiryDaysNum, { color: urgent ? colors.feedback.danger : colors.feedback.warning }]}>
                  {item.daysToExpiry}
                </Text>
                <Text style={[styles.expiryDaysLabel, { color: urgent ? colors.feedback.danger : colors.feedback.warning }]}>kun</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.unit}>Qoldiq: {item.quantityRemaining} ta</Text>
                <Text style={styles.unit}>Muddat: {new Date(item.expiryDate).toLocaleDateString('uz-UZ')}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function BulkPriceModal({
  visible,
  shopId,
  categories,
  onClose,
  onDone,
}: {
  visible: boolean;
  shopId: string;
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [adjustType, setAdjustType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');

  const bulk = useMutation({
    mutationFn: async () => {
      await api.put(`/seller/shops/${shopId}/products/variants/bulk-price`, {
        categoryId: categoryId || undefined,
        adjustType,
        value: parseFloat(value),
      });
    },
    onSuccess: onDone,
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const reset = () => { setCategoryId(''); setAdjustType('percent'); setValue(''); };
  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Narxni ommaviy yangilash</Text>
          <Text style={styles.sheetSub}>Kategoriya bo'yicha barcha mahsulot narxini foiz yoki miqdorda o'zgartirish</Text>

          <Text style={styles.fieldLabel}>Kategoriya (bo'sh = barchasi)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable
                style={[styles.catChip, !categoryId && styles.catChipActive]}
                onPress={() => setCategoryId('')}>
                <Text style={[styles.catChipText, !categoryId && styles.catChipTextActive]}>Barchasi</Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                  onPress={() => setCategoryId(c.id)}>
                  <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>
                    {c.nameUzLatn}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>O'zgartirish turi</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            {(['percent', 'fixed'] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.catChip, adjustType === t && styles.catChipActive, { flex: 1, alignItems: 'center' }]}
                onPress={() => setAdjustType(t)}>
                <Text style={[styles.catChipText, adjustType === t && styles.catChipTextActive]}>
                  {t === 'percent' ? 'Foiz (%)' : "Miqdor (so'm)"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.priceInput}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder={adjustType === 'percent' ? '10 (10% ga oshirish)' : "5000 (5000 so'm qo'shish)"}
            placeholderTextColor={colors.text.hint}
          />

          <Pressable
            style={[styles.confirmBtn, bulk.isPending && { opacity: 0.6 }]}
            onPress={() => bulk.mutate()}
            disabled={bulk.isPending || !value}>
            {bulk.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.confirmBtnText}>Yangilash</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Bekor qilish</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  tabBtnActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  tabBtnText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  tabBtnTextActive: { color: colors.text.onPrimary },
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  bulkBtnText: { ...typography.caption, fontWeight: '700', color: colors.brand.primary },
  cardTopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardUrgent: { borderColor: colors.feedback.danger, borderWidth: 1.5 },
  expiryDaysBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryDaysNum: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  expiryDaysLabel: { ...typography.caption, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: { ...typography.h3, color: colors.text.primary },
  sheetSub: { ...typography.bodySmall, color: colors.text.secondary },
  fieldLabel: { ...typography.caption, fontWeight: '700', color: colors.text.secondary, marginTop: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  catChipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  catChipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  catChipTextActive: { color: colors.text.onPrimary },
  priceInput: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surfaceMuted,
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
  list: { padding: layout.screenPadding, paddingBottom: 100, gap: spacing.md },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  toolbar: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text.primary },
  clearSearch: { ...typography.body, color: colors.text.tertiary, paddingHorizontal: spacing.xs },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowChip: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  lowChipActive: { backgroundColor: colors.feedback.warning, borderColor: colors.feedback.warning },
  lowChipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  lowChipTextActive: { color: colors.text.onPrimary },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  costStrip: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  costText: { ...typography.caption, color: colors.text.secondary },
  costVal: { ...typography.caption, fontWeight: '800', color: colors.text.primary },
  historyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kirimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  kirimText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  imageWrap: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden' },
  image: { width: 56, height: 56, backgroundColor: colors.brand.primarySurface },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  name: { ...typography.bodyStrong, color: colors.text.primary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  oldPrice: { ...typography.caption, color: colors.text.hint, textDecorationLine: 'line-through' },
  price: { ...typography.bodyStrong, color: colors.brand.primary },
  unit: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  stock: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  stockLow: { color: colors.text.danger, fontWeight: '800' },
  stockControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    ...shadow.lg,
  },
  fabText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  empty: { padding: spacing['4xl'], alignItems: 'center', gap: spacing.sm },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.h4, color: colors.text.primary },
  dim: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
});
