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
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { PublicShop } from '@/lib/types';
import { colors, radius, shadow, spacing } from '@/theme';
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
      style={[
        styles.card,
        selected && styles.cardSelected,
        isPrime && styles.cardPrime,
      ]}
      onPress={handleCardPress}>
      {/* Prime Badge Bar if Prime */}
      {isPrime && (
        <View style={styles.primeTopBar}>
          <Crown size={11} color="#B45309" strokeWidth={2.4} />
          <Text style={styles.primeTopBarText}>
            {shop.primeBadgeText ? `${shop.primeBadgeText} Hamkor` : 'Prime Hamkor'}
          </Text>
        </View>
      )}

      <View style={styles.contentRow}>
        {/* Shop Image / Icon */}
        <View style={styles.imageWrap}>
          {imageUri && !imgError ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={150}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={styles.placeholderImage}>
              {getShopCategoryIcon(shop.name)}
            </View>
          )}

          {/* Micro Status Dot */}
          <View style={[styles.statusDot, isClosed ? styles.statusDotClosed : styles.statusDotOpen]} />
        </View>

        {/* Shop Details */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.shopName} numberOfLines={1}>
              {shop.name}
            </Text>
            {shop.ratingAverage > 0 && (
              <View style={styles.ratingWrap}>
                <Star size={10} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.ratingText}>{shop.ratingAverage.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Address / Distance */}
          <View style={styles.metaRow}>
            {shop.distanceKm !== undefined && (
              <View style={styles.metaPill}>
                <MapPin size={10} color={colors.text.secondary} />
                <Text style={styles.metaText}>{shop.distanceKm.toFixed(1)} km</Text>
              </View>
            )}

            <View style={styles.metaPill}>
              <Truck size={10} color={isFreeDelivery ? colors.feedback.success : colors.text.secondary} />
              <Text
                style={[
                  styles.metaText,
                  isFreeDelivery && styles.metaTextFree,
                ]}>
                {isFreeDelivery
                  ? tr('shop.freeShort')
                  : `${(shop.deliveryFeeAtUser ?? 0).toLocaleString()} ${tr('common.som')}`}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.previewBtn}
              onPress={handlePreviewPress}
              hitSlop={4}>
              <ShoppingBag size={11} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={styles.previewBtnText}>{tr('shop.products')}</Text>
            </Pressable>

            <View style={styles.enterLink}>
              <Text style={styles.enterLinkText}>{tr('shop.enter')}</Text>
              <ChevronRight size={13} color={colors.text.tertiary} strokeWidth={2.4} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    width: MAP_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    ...shadow.lg,
  },
  cardSelected: {
    borderColor: colors.brand.primary,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  cardPrime: {
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  primeTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.sm,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  primeTopBarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  contentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  imageWrap: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.bg.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  statusDotOpen: {
    backgroundColor: colors.feedback.success,
  },
  statusDotClosed: {
    backgroundColor: colors.text.tertiary,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  shopName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: radius.sm,
  },
  ratingText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  metaTextFree: {
    color: colors.feedback.success,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: colors.brand.primarySurface,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.md,
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  enterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  enterLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
});
