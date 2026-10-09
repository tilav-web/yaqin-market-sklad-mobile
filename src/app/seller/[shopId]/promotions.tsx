import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { Plus, Tag } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePromotionModal } from '@/components/seller/CreatePromotionModal';
import { NoPermissionNotice } from '@/components/seller/OwnerOnlyNotice';
import { useTranslation, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Promotion } from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { colors } from '@/theme';

type PromType = 'product_discount' | 'category_discount' | 'free_delivery';

const TYPE_LABELS: Record<PromType, TranslationKey> = {
  product_discount: 'promo.typeProductDiscount',
  category_discount: 'promo.typeCategoryDiscount',
  free_delivery: 'promo.typeFreeDelivery',
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PromotionsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const { tr } = useTranslation();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'active' | 'scheduled' | 'ended'>('active');
  const [createOpen, setCreateOpen] = useState(false);

  const access = useShopAccess(shopId);
  const canView = access.has('promotions.view') || access.has('promotions.manage');
  const canManage = access.has('promotions.manage');

  const promoQuery = useQuery({
    queryKey: ['promotions', shopId, filter],
    enabled: canView,
    queryFn: async () => {
      const res = await api.get<Promotion[]>(`/seller/shops/${shopId}/promotions`, {
        params: { status: filter },
      });
      return res.data;
    },
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const stop = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/seller/shops/${shopId}/promotions/${id}/stop`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const items = promoQuery.data ?? [];
  const FILTERS = [
    { key: 'active' as const, label: tr('promo.filterActive') },
    { key: 'scheduled' as const, label: tr('promo.filterScheduled') },
    { key: 'ended' as const, label: tr('promo.filterEnded') },
  ];

  if (access.isResolved && !canView) {
    return <NoPermissionNotice />;
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      {/* Segment Tabs */}
      <View className="flex-row gap-1.5 px-4 pt-2 pb-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`flex-1 py-2 rounded-full border items-center ${
                active ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
              }`}
            >
              <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-text-secondary'}`}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {promoQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.primary} className="mt-10" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96, gap: 14 }}
          ListEmptyComponent={
            <View className="flex-1 items-center pt-20 gap-3">
              <View className="w-16 h-16 rounded-full bg-brand-primary-surface items-center justify-center">
                <Tag size={28} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <Text className="text-lg font-bold text-text-primary">{tr('promo.emptyTitle')}</Text>
              <Text className="text-sm text-text-secondary text-center px-4">{tr('promo.emptyDesc')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const discount =
              item.discountType === 'percent'
                ? `${item.discountValue}%`
                : item.discountType === 'fixed'
                ? `${fmt(item.discountValue ?? 0)} ${tr('common.som')}`
                : null;
            return (
              <View className="bg-surface rounded-2xl p-4 gap-2 border border-border-subtle shadow-sm">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="text-base font-bold text-text-primary flex-1">{item.name}</Text>
                  <View className={`px-2 py-0.5 rounded-full ${item.isActive ? 'bg-brand-primary-surface' : 'bg-surface-muted'}`}>
                    <Text className="text-[10px] font-bold text-brand-primary">{tr(TYPE_LABELS[item.type])}</Text>
                  </View>
                </View>
                {discount ? (
                  <Text className="text-base font-extrabold text-brand-primary">{tr('promo.discountLabel', { value: discount })}</Text>
                ) : item.freeDeliveryMinAmount ? (
                  <Text className="text-base font-extrabold text-brand-primary">
                    {tr('promo.freeDeliveryFrom', { amount: fmt(item.freeDeliveryMinAmount) })}
                  </Text>
                ) : null}
                <Text className="text-xs text-text-secondary">
                  {dateLabel(item.startAt)} — {item.endAt ? dateLabel(item.endAt) : tr('promo.noEndDate')}
                </Text>
                {item.isActive && canManage && (
                  <Pressable
                    className="items-center py-2 rounded-xl bg-red-500/10 active:opacity-70 mt-1"
                    onPress={() =>
                      Alert.alert(tr('promo.stopTitle'), tr('promo.stopConfirm'), [
                        { text: tr('common.no'), style: 'cancel' },
                        { text: tr('promo.stop'), style: 'destructive', onPress: () => stop.mutate(item.id) },
                      ])
                    }
                  >
                    <Text className="text-xs font-bold text-red-600">{tr('promo.stop')}</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {canManage && (
        <Pressable
          className="absolute bottom-6 right-6 flex-row items-center gap-1.5 px-6 h-13 rounded-full bg-brand-primary shadow-xl active:opacity-90"
          onPress={() => setCreateOpen(true)}
        >
          <Plus size={20} color="#ffffff" strokeWidth={2.8} />
          <Text className="text-base font-extrabold text-white">{tr('promo.fab')}</Text>
        </Pressable>
      )}

      <CreatePromotionModal
        visible={createOpen}
        shopId={shopId ?? ''}
        categories={categoriesQuery.data ?? []}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ['promotions', shopId] });
        }}
      />
    </SafeAreaView>
  );
}
