import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { BookOpen, Package, ScanLine, Search } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarcodeScannerModal } from '@/components/seller/BarcodeScannerModal';
import { CatalogCloneModal } from '@/components/seller/CatalogCloneModal';
import { tr, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { GlobalCatalogProduct } from '@/lib/types';
import { colors } from '@/theme';

const UNIT_LABEL_KEY: Record<string, TranslationKey> = {
  piece: 'catalog.unitPiece',
  kg: 'catalog.unitKg',
  liter: 'catalog.unitLiter',
  gram: 'catalog.unitGram',
  pack: 'catalog.unitPack',
};

export default function SellerCatalogScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<GlobalCatalogProduct | null>(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const catalogQuery = useQuery({
    queryKey: ['global-catalog', shopId, search],
    queryFn: async () => {
      const res = await api.get<GlobalCatalogProduct[]>(`/seller/shops/${shopId}/catalog/search`, {
        params: { q: search || undefined, limit: 40 },
      });
      return res.data;
    },
    enabled: search.length > 0,
    staleTime: 60_000,
  });

  const cloneMutation = useMutation({
    mutationFn: async ({ globalProductId, price, stock }: { globalProductId: string; price: number; stock: number }) => {
      await api.post(`/seller/shops/${shopId}/catalog/clone`, { globalProductId, price, stock });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      setCloneTarget(null);
      setPrice('');
      setStock('');
      Alert.alert(tr('catalog.added'), tr('catalog.addedDesc'));
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const handleClone = () => {
    const p = parseAmount(price);
    const s = parseAmount(stock);
    if (!cloneTarget || p <= 0) {
      Alert.alert(tr('common.error'), tr('catalog.invalidPrice'));
      return;
    }
    cloneMutation.mutate({ globalProductId: cloneTarget.id, price: p, stock: s });
  };

  const onScanned = async (code: string) => {
    setScanOpen(false);
    setSearchInput(code);
    setSearch(code);
  };

  const items = catalogQuery.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <View className="flex-row items-center gap-2.5 px-4 py-2.5 border-b border-border-subtle">
        <View className="flex-1 flex-row items-center gap-2 bg-surface rounded-xl px-3 border border-border-default h-11">
          <Search size={17} color={colors.text.tertiary} strokeWidth={2.2} />
          <TextInput
            className="flex-1 text-sm text-text-primary"
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={tr('catalog.searchPlaceholder')}
            placeholderTextColor={colors.text.hint}
            returnKeyType="search"
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => { setSearchInput(''); setSearch(''); }} hitSlop={8}>
              <Text className="text-sm text-text-tertiary px-1">✕</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setScanOpen(true)}
          className="w-11 h-11 rounded-full border border-brand-primary/30 bg-brand-primary-surface items-center justify-center active:opacity-80"
        >
          <ScanLine size={18} color={colors.brand.primary} strokeWidth={2.2} />
        </Pressable>
      </View>

      {search.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8 gap-3">
          <View className="w-16 h-16 rounded-full bg-brand-primary-surface items-center justify-center">
            <BookOpen size={28} color={colors.brand.primary} strokeWidth={1.8} />
          </View>
          <Text className="text-lg font-bold text-text-primary">{tr('catalog.globalTitle')}</Text>
          <Text className="text-sm text-text-secondary text-center leading-5">{tr('catalog.globalHint')}</Text>
        </View>
      ) : catalogQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.primary} className="mt-10" />
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8 gap-2">
          <Text className="text-lg font-bold text-text-primary">{tr('catalog.notFound')}</Text>
          <Text className="text-sm text-text-secondary text-center">{tr('catalog.notFoundDesc')}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3.5 bg-surface rounded-2xl p-3.5 border border-border-subtle shadow-sm">
              <View className="w-14 h-14 rounded-xl overflow-hidden bg-brand-primary-surface">
                {item.photos[0] ? (
                  <Image source={{ uri: resolveMedia(item.photos[0]) }} className="w-full h-full" resizeMode="cover" />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Package size={20} color={colors.brand.primary} strokeWidth={1.6} />
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>{item.name}</Text>
                {item.brand ? <Text className="text-xs text-text-secondary mt-0.5">{item.brand}</Text> : null}
                <Text className="text-xs text-text-tertiary mt-0.5">
                  {item.unitSize}{' '}
                  {UNIT_LABEL_KEY[item.unitType] ? tr(UNIT_LABEL_KEY[item.unitType]) : item.unitType}
                  {item.barcode ? ` · ${item.barcode}` : ''}
                </Text>
                <Text className="text-xs text-brand-primary font-semibold mt-1">
                  {tr('catalog.usedInShops', { n: item.usageCount })}
                </Text>
              </View>
              <Pressable
                className="px-3.5 py-2 rounded-xl bg-brand-primary active:opacity-90"
                onPress={() => { setCloneTarget(item); setPrice(''); }}
              >
                <Text className="text-xs font-extrabold text-white">{tr('catalog.add')}</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      <BarcodeScannerModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={onScanned}
        onSkip={() => setScanOpen(false)}
        title={tr('catalog.scanBarcode')}
      />

      <CatalogCloneModal
        visible={!!cloneTarget}
        target={cloneTarget}
        price={price}
        onChangePrice={setPrice}
        stock={stock}
        onChangeStock={setStock}
        onConfirm={handleClone}
        onClose={() => { setCloneTarget(null); setPrice(''); setStock(''); }}
        isPending={cloneMutation.isPending}
      />
    </SafeAreaView>
  );
}
