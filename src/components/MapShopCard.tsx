import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Apple,
  ChevronRight,
  Croissant,
  Crown,
  MapPin,
  Pill,
  ShoppingBag,
  Star,
  Store,
  Truck,
  UtensilsCrossed,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, shadow } from '@/theme';
import { haptics } from '@/utils/haptics';

export const MAP_CARD_WIDTH = Math.min(310, Dimensions.get('window').width - 64);
export const MAP_CARD_GAP = 10;

interface Props {
  readonly shop: PublicShop;
  readonly selected: boolean;
  readonly onSelect: (shopId: string) => void;
  readonly onOpenPreview: (shop: PublicShop) => void;
}

function getShopCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (/go['’`]?sht|osh|kabob|burger|lavash|kafe|restoran|somsa|pizza|choyxona|shashlik|tandir/.test(lower)) {
    return <UtensilsCrossed size={24} color="#E11D48" strokeWidth={2.2} />;
  }
  if (/non|novvoy|shirinlik|tort|pechenye|bakery|patir|pishiriq/.test(lower)) {
    return <Croissant size={24} color="#D97706" strokeWidth={2.2} />;
  }
  if (/dori|shifo|apteka|farm|tib|med/.test(lower)) {
    return <Pill size={24} color="#0284C7" strokeWidth={2.2} />;
  }
  if (/meva|sabzavot|bog['’`]?|mevazor|poliz|chashma|organik|green/.test(lower)) {
    return <Apple size={24} color="#059669" strokeWidth={2.2} />;
  }
  if (/super|market|bozor|savdo|store|minimarket|hyper/.test(lower)) {
    return <ShoppingBag size={24} color="#2563EB" strokeWidth={2.2} />;
  }
  return <Store size={24} color={colors.brand.primary} strokeWidth={2.2} />;
}

export const MapShopCard = React.memo(function MapShopCard({
  shop,
  selected,
  onSelect,
  onOpenPreview,
}: Props) {
  const { tr } = useTranslation();
  const { isDark, colors: activeColors } = useTheme();
  const [imgError, setImgError] = useState(false);

  const isClosed = !shop.isOpenManual;
  const isPrime = shop.isPrime === true;
  const isFreeDelivery = (shop.deliveryFeeAtUser ?? 0) === 0 && shop.isDeliveryEnabled !== false && !isClosed;
  const imageUri = resolveMedia(shop.photos?.[0]);

  const handleCardPress = () => {
    haptics.selection();
    onSelect(shop.id);
    router.push(`/shop/${shop.id}`);
  };

  const handlePreviewPress = (e: any) => {
    e?.stopPropagation?.();
    haptics.selection();
    onSelect(shop.id);
    onOpenPreview(shop);
  };

  return (
    <Pressable
      className="rounded-3xl p-2 border-[1.5px]"
      style={[
        {
          width: MAP_CARD_WIDTH,
          backgroundColor: isDark ? '#1C2733' : '#FFFFFF',
          borderColor: selected
            ? colors.brand.primary
            : isPrime
              ? '#F59E0B'
              : isDark
                ? 'rgba(255, 255, 255, 0.15)'
                : '#E2E8F0',
          borderWidth: selected ? 2 : 1.5,
        },
        shadow.lg,
      ]}
      onPress={handleCardPress}>
      {/* Prime Badge Bar if Prime */}
      {isPrime && (
        <View className="flex-row items-center gap-1 bg-amber-100 px-2 py-0.5 rounded mb-1.5 self-start">
          <Crown size={11} color="#B45309" strokeWidth={2.4} />
          <Text className="text-[10px] font-extrabold text-amber-800">
            {shop.primeBadgeText ? `${shop.primeBadgeText} Hamkor` : 'Prime Hamkor'}
          </Text>
        </View>
      )}

      <View className="flex-row gap-2 items-center">
        {/* Shop Image / Icon */}
        <View
          className="w-15.5 h-15.5 rounded-2xl overflow-hidden relative"
          style={{ backgroundColor: colors.bg.surfaceMuted }}>
          {imageUri && !imgError ? (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-full"
              contentFit="cover"
              transition={150}
              onError={() => setImgError(true)}
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-sky-50">
              {getShopCategoryIcon(shop.name)}
            </View>
          )}

          {/* Micro Status Dot */}
          <View
            className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border-[1.5px] border-white"
            style={{ backgroundColor: isClosed ? colors.feedback.danger : colors.feedback.success }}
          />
        </View>

        {/* Shop Details */}
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between gap-1 mb-1">
            <Text
              className="text-[13px] font-black flex-1"
              style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}
              numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.ratingAverage > 0 && (
              <View className="flex-row items-center gap-0.5 bg-amber-50 px-1 py-0.5 rounded">
                <Star size={10} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-[10px] font-extrabold text-amber-800">{shop.ratingAverage.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Address / Distance */}
          <View className="flex-row items-center gap-1 mb-1.5">
            {shop.distanceKm !== undefined && (
              <View
                className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: isDark ? '#243242' : '#F1F5F9' }}>
                <MapPin size={10} color={activeColors.text.secondary} />
                <Text className="text-[10px] font-bold" style={{ color: activeColors.text.secondary }}>{shop.distanceKm.toFixed(1)} km</Text>
              </View>
            )}

            <View
              className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded"
              style={{ backgroundColor: isDark ? '#243242' : '#F1F5F9' }}>
              <Truck size={10} color={isFreeDelivery ? colors.feedback.success : activeColors.text.secondary} />
              <Text
                className="text-[10px] font-bold"
                style={{
                  color: isFreeDelivery ? colors.feedback.success : activeColors.text.secondary,
                  fontWeight: isFreeDelivery ? '800' : '700',
                }}>
                {isFreeDelivery
                  ? tr('shop.freeShort')
                  : `${(shop.deliveryFeeAtUser ?? 0).toLocaleString()} ${tr('common.som')}`}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View className="flex-row items-center justify-between">
            <Pressable
              className="flex-row items-center gap-1 px-2 py-1 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(232, 57, 46, 0.18)' : '#FEE2E2' }}
              onPress={handlePreviewPress}
              hitSlop={4}>
              <ShoppingBag size={11} color={activeColors.brand.primary} strokeWidth={2.2} />
              <Text className="text-[10.5px] font-extrabold" style={{ color: activeColors.brand.primary }}>
                {tr('shop.products')}
              </Text>
            </Pressable>

            <View className="flex-row items-center gap-0.5">
              <Text className="text-[11px] font-bold" style={{ color: activeColors.text.tertiary }}>{tr('shop.enter')}</Text>
              <ChevronRight size={13} color={activeColors.text.tertiary} strokeWidth={2.4} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});
