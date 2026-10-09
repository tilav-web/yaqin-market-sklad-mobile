import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useGlobalSearchParams } from 'expo-router';
import { AlertTriangle, Package, Plus, TrendingDown } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { BrakStockModal } from '@/components/seller/BrakStockModal';
import { InventoryCountModal } from '@/components/seller/InventoryCountModal';
import { KirimModal } from '@/components/seller/KirimModal';
import { ProductFormModal, ProductPrefill } from '@/components/seller/ProductFormModal';
import { QuickAddModal } from '@/components/seller/QuickAddModal';
import { StockHistoryModal } from '@/components/seller/StockHistoryModal';
import {
  InventoryBulkPriceModal,
  InventoryCard,
  InventoryExpiringList,
  InventoryLowStockList,
  InventoryToolbar,
  Tab,
} from '@/components/seller-inventory';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import {
  Category,
  ExpiringVariant,
  LowStockVariant,
  PublicProductVariant,
  SellerVariant,
} from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

export default function SellerInventoryScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const access = useShopAccess(shopId);
  const isOwner = access.isOwner;

  const [tab, setTab] = useState<Tab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PublicProductVariant | null>(null);
  const [kirimFor, setKirimFor] = useState<PublicProductVariant | null>(null);
  const [brakFor, setBrakFor] = useState<PublicProductVariant | null>(null);
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

  const duplicate = useMutation({
    mutationFn: async (variantId: string) => {
      const res = await api.post<SellerVariant>(
        `/seller/shops/${shopId}/products/variants/${variantId}/duplicate`,
      );
      return res.data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      setPrefill(null);
      setScannedBarcode('');
      setEditing(created);
      setFormOpen(true);
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const expiringQuery = useQuery({
    queryKey: ['variants-expiring', shopId],
    queryFn: async () => {
      const res = await api.get<ExpiringVariant[]>(`/seller/shops/${shopId}/products/expiring`);
      return res.data;
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });

  const lowStockQuery = useQuery({
    queryKey: ['variants-low-stock', shopId],
    queryFn: async () => {
      const res = await api.get<LowStockVariant[]>(`/seller/shops/${shopId}/products/low-stock`);
      return res.data;
    },
    enabled: !!shopId,
    staleTime: 60_000,
  });

  const openVariantMenu = (item: SellerVariant) => {
    const options: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [];
    if (access.has('inventory.product.create')) {
      options.push({ text: tr('inv.duplicate'), onPress: () => duplicate.mutate(item.id) });
    }
    options.push({ text: tr('common.cancel'), style: 'cancel' });
    Alert.alert(item.name, undefined, options);
  };

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
      const res = await api.get<import('@/lib/types').GlobalProduct>(
        `/catalog-global/by-barcode/${encodeURIComponent(code)}`,
      );
      setQuickAddGp(res.data);
      return;
    } catch {
      setPrefill(null);
      setScannedBarcode(code);
      setEditing(null);
      setFormOpen(true);
    }
  };

  const expiringCount = expiringQuery.data?.length ?? 0;
  const expiringUrgent = (expiringQuery.data ?? []).some((v) => v.tier === 'expired');
  const lowStockCount = lowStockQuery.data?.length ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, tab === 'all' && styles.tabBtnActive]}
          onPress={() => setTab('all')}
        >
          <Package
            size={15}
            color={tab === 'all' ? colors.text.onPrimary : colors.text.secondary}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabBtnText, tab === 'all' && styles.tabBtnTextActive]}>
            {tr('inv.tabAll')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'expiring' && styles.tabBtnActive]}
          onPress={() => setTab('expiring')}
        >
          <AlertTriangle
            size={15}
            color={tab === 'expiring' ? colors.text.onPrimary : colors.feedback.warning}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabBtnText, tab === 'expiring' && styles.tabBtnTextActive]}>
            {tr('inv.tabExpiring')}
          </Text>
          {expiringCount > 0 && (
            <View style={[styles.tabBadge, expiringUrgent && styles.tabBadgeUrgent]}>
              <Text style={styles.tabBadgeText}>{expiringCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === 'lowStock' && styles.tabBtnActive]}
          onPress={() => setTab('lowStock')}
        >
          <TrendingDown
            size={15}
            color={tab === 'lowStock' ? colors.text.onPrimary : colors.feedback.warning}
            strokeWidth={2.2}
          />
          <Text style={[styles.tabBtnText, tab === 'lowStock' && styles.tabBtnTextActive]}>
            {tr('inv.tabLowStock')}
          </Text>
          {lowStockCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{lowStockCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {tab === 'expiring' ? (
        <InventoryExpiringList
          data={expiringQuery.data ?? []}
          isLoading={expiringQuery.isLoading}
          onBrak={(v) => setBrakFor(v)}
          onDiscount={(v) => {
            setPrefill(null);
            setEditing(v);
            setFormOpen(true);
          }}
        />
      ) : tab === 'lowStock' ? (
        <InventoryLowStockList
          data={lowStockQuery.data ?? []}
          isLoading={lowStockQuery.isLoading}
          onKirim={(v) => setKirimFor(v)}
        />
      ) : (
        <>
          <InventoryToolbar
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            lowOnly={lowOnly}
            onToggleLowOnly={() => setLowOnly((v) => !v)}
            onOpenBulkPrice={() => setBulkPriceOpen(true)}
            onOpenExcel={() => router.push(`/seller/${shopId}/excel` as Href)}
            onOpenScanner={() => setScanOpen(true)}
            onOpenCount={() => setCountOpen(true)}
          />

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
              if (variantsQuery.hasNextPage && !variantsQuery.isFetchingNextPage) {
                variantsQuery.fetchNextPage();
              }
            }}
            ListFooterComponent={
              variantsQuery.isFetchingNextPage ? (
                <ActivityIndicator
                  color={colors.brand.primary}
                  style={{ marginVertical: spacing.md }}
                />
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
                    {search ? tr('inv.notFound') : tr('inv.emptyTitle')}
                  </Text>
                  <Text style={styles.dim}>
                    {search ? tr('inv.notFoundHint') : tr('inv.emptyHint')}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <InventoryCard
                item={item}
                isOwner={isOwner}
                onEdit={openEdit}
                onMenu={openVariantMenu}
                onAdjust={(variantId, delta) => adjust.mutate({ variantId, delta })}
                onHistory={(v) => setHistoryFor(v)}
                onDelete={(v) =>
                  Alert.alert(
                    tr('common.delete'),
                    tr('inv.deleteConfirm', { name: v.name }),
                    [
                      { text: tr('common.cancel'), style: 'cancel' },
                      {
                        text: tr('common.delete'),
                        style: 'destructive',
                        onPress: () => remove.mutate(v.id),
                      },
                    ],
                  )
                }
                onKirim={(v) => setKirimFor(v)}
              />
            )}
          />

          <Pressable style={styles.fab} onPress={() => setScanOpen(true)}>
            <Plus size={22} color={colors.text.onPrimary} strokeWidth={2.8} />
            <Text style={styles.fabText}>{tr('inv.fabProduct')}</Text>
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
        title={tr('inv.scanTitle')}
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

      <BrakStockModal
        visible={!!brakFor}
        shopId={shopId}
        variant={brakFor}
        onClose={() => setBrakFor(null)}
      />

      <StockHistoryModal
        visible={!!historyFor}
        shopId={shopId}
        variant={historyFor}
        onClose={() => setHistoryFor(null)}
      />

      <InventoryBulkPriceModal
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
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
  tabBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  tabBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  tabBtnTextActive: {
    color: colors.text.onPrimary,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.feedback.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeUrgent: {
    backgroundColor: colors.feedback.danger,
  },
  tabBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
  list: {
    padding: layout.screenPadding,
    paddingBottom: 100,
    gap: spacing.md,
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
  fabText: {
    ...typography.body,
    fontWeight: '800',
    color: colors.text.onPrimary,
  },
  empty: {
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  dim: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
