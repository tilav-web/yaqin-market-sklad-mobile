import { Heart, MessageCircle, Navigation, Phone, Store, Truck } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors } from '@/theme';

interface ShopDetailHeaderProps {
  readonly shop: PublicShop;
  readonly isFav: boolean;
  readonly onToggleFav: () => void;
  readonly onCall: () => void;
  readonly onChat: () => void;
  readonly onRoute: () => void;
}

export function ShopDetailHeader({
  shop,
  isFav,
  onToggleFav,
  onCall,
  onChat,
  onRoute,
}: ShopDetailHeaderProps) {
  const { tr } = useTranslation();
  const isShowcase = shop.isDeliveryEnabled === false;
  const isDeliveryClosed = !isShowcase && shop.isDeliveryOpenNow === false;

  return (
    <View className="mb-4">
      {/* Hero Image */}
      <View className="relative mb-3">
        {shop.photos[0] ? (
          <Image
            source={{ uri: resolveMedia(shop.photos[0]) }}
            className="w-full h-[180px] rounded-2xl bg-surface-muted"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-[180px] rounded-2xl bg-brand-primary/10 items-center justify-center">
            <Store size={56} color={colors.brand.primary} strokeWidth={1.4} />
          </View>
        )}
        <Pressable
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          hitSlop={12}
          onPress={onToggleFav}>
          <Heart
            size={22}
            color={isFav ? colors.brand.primary : '#FFFFFF'}
            fill={isFav ? colors.brand.primary : 'transparent'}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      {/* Title & Address */}
      <Text className="text-2xl font-extrabold text-text-primary">{shop.name}</Text>
      <Text className="text-xs text-text-secondary mt-1">{shop.address}</Text>

      {/* Meta Badges */}
      <View className="flex-row items-center flex-wrap gap-2 mt-2.5">
        <Text
          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
            shop.isOpenManual ? 'text-emerald-700 bg-emerald-100' : 'text-slate-500 bg-slate-100'
          }`}>
          {shop.isOpenManual ? tr('shop.open') : tr('shop.closed')}
        </Text>
        {isShowcase ? (
          <Text className="text-[11px] font-bold px-2 py-0.5 rounded text-blue-700 bg-blue-100">
            📍 {tr('shop.inStoreOnly')}
          </Text>
        ) : isDeliveryClosed ? (
          <Text className="text-[11px] font-bold px-2 py-0.5 rounded text-slate-500 bg-slate-100">
            🚚 {tr('shop.deliveryClosed')}
          </Text>
        ) : (
          <View className="flex-row items-center gap-1">
            <Truck size={14} color={colors.text.secondary} />
            <Text className="text-xs font-semibold text-text-secondary">
              {shop.deliveryFeeAtUser === 0
                ? tr('shop.freeShort')
                : `${shop.deliveryFeeAtUser?.toLocaleString()} ${tr('common.som')}`}
            </Text>
          </View>
        )}
        {shop.distanceKm !== undefined && (
          <Text className="text-xs font-semibold text-text-secondary">{shop.distanceKm.toFixed(1)} km</Text>
        )}
      </View>

      {/* Quick Action Buttons */}
      <View className="flex-row items-center gap-2 mt-3">
        {shop.phone ? (
          <Pressable
            className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border-subtle"
            onPress={onCall}>
            <Phone size={14} color={colors.brand.primary} />
            <Text className="text-xs font-bold text-text-primary">{shop.phone}</Text>
          </Pressable>
        ) : null}
        <Pressable
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20"
          onPress={onChat}>
          <MessageCircle size={14} color={colors.brand.primary} strokeWidth={2.2} />
          <Text className="text-xs font-bold text-brand-primary">{tr('chat.title')}</Text>
        </Pressable>
        <Pressable
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border-subtle"
          onPress={onRoute}>
          <Navigation size={14} color={colors.brand.primary} />
          <Text className="text-xs font-bold text-text-primary">{tr('shop.openRoute')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
