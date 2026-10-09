import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useGlobalSearchParams } from 'expo-router';
import {
  AlertCircle,
  BarChart3,
  Bell,
  BookOpen,
  Landmark,
  MessageSquare,
  Settings2,
  ShieldBan,
  Star,
  Store,
  Tag,
  Wallet,
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SellerHubRow, ShopCompletenessCard } from '@/components/seller-settings';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicShop, ShopCompleteness } from '@/lib/types';
import { useShopAccess } from '@/lib/useIsShopOwner';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function SellerHubScreen() {
  const { tr } = useTranslation();
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const access = useShopAccess(shopId);
  const useOwnerEndpoint = access.isOwner !== false;

  const shopQuery = useQuery({
    queryKey: ['seller-shop', shopId, useOwnerEndpoint ? 'owner' : 'public'],
    staleTime: 60_000,
    enabled: access.isResolved,
    queryFn: async () => {
      const res = await api.get<PublicShop>(
        useOwnerEndpoint ? `/seller/shops/${shopId}` : `/shops/${shopId}`,
      );
      return res.data;
    },
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => {
      await api.post(`/seller/shops/${shopId}/toggle-open`, { isOpen });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seller-shop', shopId] }),
  });

  const completenessQuery = useQuery({
    queryKey: ['shop-completeness', shopId],
    queryFn: async () => {
      const res = await api.get<ShopCompleteness>(`/seller/shops/${shopId}/completeness`);
      return res.data;
    },
    staleTime: 5 * 60_000,
    enabled: access.has('shop.settings.view'),
  });

  const shop = shopQuery.data;
  const isOpen = !!shop?.isOpenManual;
  const completeness = access.has('shop.settings.view') ? completenessQuery.data : undefined;
  const canToggleOpen = access.has('shop.toggle_open');

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 64 }}>
        {/* Shop header + open toggle */}
        <View className="bg-surface rounded-2xl p-4 gap-4 border border-border-subtle shadow-sm">
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-full bg-brand-primary-surface items-center justify-center">
              <Store size={24} color={colors.brand.primary} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
                {shop?.name ?? '…'}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
                {shop?.address ?? ''}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between border-t border-border-subtle pt-3.5">
            <View>
              <Text className={`text-sm font-bold ${isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                {isOpen ? '🟢 Ochiq' : '🔴 Yopiq'}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                {isOpen ? 'Mijozlar buyurtma bera oladi' : "Mahsulotlaringiz ko'rinmaydi"}
              </Text>
            </View>
            {shopQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} />
            ) : canToggleOpen ? (
              <Switch
                value={isOpen}
                onValueChange={(v) => {
                  haptics.medium();
                  toggleOpen.mutate(v);
                }}
                trackColor={{ true: colors.feedback.success }}
                thumbColor={colors.bg.surface}
              />
            ) : null}
          </View>
        </View>

        {/* Shop completeness */}
        {completeness && <ShopCompletenessCard completeness={completeness} shopId={shopId ?? ''} />}

        {/* Management links */}
        <Text className="text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">
          {tr('shopSettings.management')}
        </Text>
        <View className="bg-surface rounded-2xl border border-border-subtle overflow-hidden shadow-sm">
          {[
            access.isOwner !== false && {
              icon: Settings2,
              title: "Do'kon sozlamalari",
              subtitle: 'Nomi, manzil, rasm, yetkazib berish',
              onPress: () => router.push(`/seller/${shopId}/shop-settings`),
            },
            (access.has('promotions.view') || access.has('promotions.manage')) && {
              icon: Tag,
              title: 'Aksiyalar',
              subtitle: 'Chegirma va promokodlar boshqaruvi',
              onPress: () => router.push(`/seller/${shopId}/promotions` as Href),
            },
            access.has('inventory.product.create') && {
              icon: BookOpen,
              title: 'Global katalog',
              subtitle: 'Platforma mahsulotlaridan nusxa olish',
              onPress: () => router.push(`/seller/${shopId}/catalog` as Href),
            },
            access.has('orders.chat') && {
              icon: MessageSquare,
              title: 'Chat shablonlari',
              subtitle: 'Tez javob shablonlarini boshqarish',
              onPress: () => router.push(`/seller/${shopId}/chat-templates` as Href),
            },
            access.isOwner !== false && {
              icon: BarChart3,
              title: 'Hisobot',
              subtitle: 'Tushum, foyda, olib kelish kerak, muddat',
              onPress: () => router.push(`/seller/${shopId}/stats`),
            },
            access.has('reviews.view') && {
              icon: Star,
              title: 'Sharhlar',
              subtitle: 'Mijozlar qoldirgan sharh va baholar',
              onPress: () => router.push(`/seller/${shopId}/reviews`),
            },
            access.isOwner !== false && {
              icon: AlertCircle,
              title: 'Shikoyatlar',
              subtitle: 'Mijozlar yuborgan shikoyatlar',
              onPress: () => router.push(`/seller/${shopId}/complaints` as Href),
            },
            {
              icon: Bell,
              title: 'Bildirishnomalar',
              subtitle: 'Push tarixi',
              onPress: () => router.push('/notifications'),
            },
            access.isOwner !== false && {
              icon: ShieldBan,
              title: 'Bloklangan foydalanuvchilar',
              subtitle: "Bu do'kon uchun bloklangan mijozlar",
              onPress: () => router.push(`/seller/${shopId}/blocked`),
            },
            access.isOwner !== false && {
              icon: Wallet,
              title: "Balans va to'lovlar",
              subtitle: "Daromad, qarz, mablag' yechish",
              onPress: () => router.push(`/seller/${shopId}/balance`),
            },
            access.isOwner !== false && {
              icon: Star,
              title: 'Prime obuna',
              subtitle: 'Komissiyani kamaytirish uchun obuna',
              onPress: () => router.push(`/seller/${shopId}/prime`),
            },
            access.isOwner !== false && {
              icon: Landmark,
              title: "Soliq ma'lumotlari",
              subtitle: 'STIR, QQS, komissioner holati',
              onPress: () => router.push('/seller/tax-status' as Href),
            },
          ]
            .filter((row): row is Exclude<typeof row, false> => row !== false)
            .map((row, i, arr) => (
              <SellerHubRow key={row.title} {...row} last={i === arr.length - 1} />
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
