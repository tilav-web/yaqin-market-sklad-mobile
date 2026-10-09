import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useGlobalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProductPrefill } from '@/components/seller/ProductFormModal';
import {
  InventoryExpiringList,
  InventoryLowStockList,
  InventoryModals,
  InventoryTabSelector,
  InventoryToolbar,
  InventoryVariantsList,
  Tab,
} from '@/components/seller-inventory';
import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import {
  Category,
  ExpiringVariant,
  GlobalProduct,
  LowStockVariant,
  PublicProductVariant,
  SellerVariant,
} from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';

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
  const [quickAddGp, setQuickAddGp] = useState<GlobalProduct | null>(null);
  const [countOpen, setCountOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

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
      const res = await api.get<GlobalProduct>(
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
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      {/* Tab switcher */}
      <InventoryTabSelector
        tab={tab}
        onSelectTab={setTab}
        expiringCount={expiringCount}
        expiringUrgent={expiringUrgent}
        lowStockCount={lowStockCount}
      />

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

          <InventoryVariantsList
            variants={variants}
            search={search}
            isOwner={!!isOwner}
            isFetching={variantsQuery.isFetching}
            isLoading={variantsQuery.isLoading}
            isFetchingNextPage={variantsQuery.isFetchingNextPage}
            hasNextPage={variantsQuery.hasNextPage}
            onRefresh={() => {
              void variantsQuery.refetch();
            }}
            onFetchNextPage={() => {
              variantsQuery.fetchNextPage();
            }}
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

          <Pressable
            className="absolute bottom-6 right-6 flex-row items-center gap-1.5 px-6 h-13 rounded-full bg-brand-primary shadow-xl active:opacity-90"
            onPress={() => setScanOpen(true)}
          >
            <Plus size={22} color="#ffffff" strokeWidth={2.8} />
            <Text className="text-base font-extrabold text-white">{tr('inv.fabProduct')}</Text>
          </Pressable>
        </>
      )}

      {/* Modals */}
      <InventoryModals
        shopId={shopId ?? ''}
        leafCategories={leafCategories}
        formOpen={formOpen}
        onCloseForm={() => setFormOpen(false)}
        editing={editing}
        scannedBarcode={scannedBarcode}
        prefill={prefill}
        quickAddGp={quickAddGp}
        onCloseQuickAdd={() => setQuickAddGp(null)}
        scanOpen={scanOpen}
        onCloseScan={() => setScanOpen(false)}
        onScanned={onScanned}
        onSkipScan={openCreateBlank}
        countOpen={countOpen}
        onCloseCount={() => setCountOpen(false)}
        kirimFor={kirimFor}
        onCloseKirim={() => setKirimFor(null)}
        brakFor={brakFor}
        onCloseBrak={() => setBrakFor(null)}
        historyFor={historyFor}
        onCloseHistory={() => setHistoryFor(null)}
        bulkPriceOpen={bulkPriceOpen}
        onCloseBulkPrice={() => setBulkPriceOpen(false)}
        onBulkPriceDone={() => {
          setBulkPriceOpen(false);
          qc.invalidateQueries({ queryKey: ['variants', shopId] });
        }}
      />
    </SafeAreaView>
  );
}
