import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ShoppingBag, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTranslation } from '@/i18n';
import { trackAddToCart } from '@/lib/analyticsQueue';
import { api, resolveMedia } from '@/lib/api';
import { FeedProduct, FeedResponse } from '@/lib/types';
import {
  selectActiveShopId,
  selectActiveShopName,
  useCartStore,
} from '@/stores/cart';
import { useEffectiveCoords } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';
import { getLocalizedText } from '@/utils/text';

interface QuickProductSearchModalProps {
  readonly visible: boolean;
  readonly initialQuery: string;
  readonly onClose: () => void;
  readonly onAddedToCart?: () => void;
}

export function QuickProductSearchModal({
  visible,
  initialQuery,
  onClose,
  onAddedToCart,
}: QuickProductSearchModalProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const coords = useEffectiveCoords();
  const [query, setQuery] = useState(initialQuery);

  const addItem = useCartStore((s) => s.addItem);
  const replaceCartWithItem = useCartStore((s) => s.replaceCartWithItem);
  const currentCartShopId = useCartStore(selectActiveShopId);
  const currentCartShopName = useCartStore(selectActiveShopName);

  // Search catalog products for this item
  const { data, isLoading } = useQuery<FeedProduct[]>({
    queryKey: ['quick-catalog-search', query, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords || !query.trim()) return [];
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          lat: coords.latitude,
          lng: coords.longitude,
          q: query.trim(),
          limit: 12,
        },
      });
      return res.data?.items ?? [];
    },
    enabled: visible && !!query.trim() && !!coords,
    staleTime: 30_000,
  });

  const handleAddToCart = (product: FeedProduct) => {
    haptics.success();
    const finalPrice = product.discountPrice ?? product.price;
    const productName = getLocalizedText(product.name);
    const photoUrl = product.photos && product.photos.length > 0 ? product.photos[0] : undefined;

    const lineData = {
      variantId: product.id,
      shopId: product.shopId,
      shopName: product.shop?.name ?? '',
      productName,
      unitPrice: finalPrice,
      quantity: 1,
      photoUrl,
    };

    if (currentCartShopId && currentCartShopId !== product.shopId) {
      Alert.alert(
        "Boshqa do'kon mahsuloti",
        `Savatingizda «${currentCartShopName ?? "boshqa do'kon"}» mahsulotlari bor. Buyurtma faqat bitta do'kondan amalga oshiriladi.\n\nAvvalgi savatni tozalab, «${product.shop?.name ?? "ushbu do'kon"}» mahsulotini qo'shasizmi?`,
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Tozalash va qo‘shish',
            style: 'destructive',
            onPress: () => {
              replaceCartWithItem(lineData);
              trackAddToCart(product.shopId, product.id);
              onAddedToCart?.();
            },
          },
        ],
      );
      return;
    }

    addItem(lineData);
    trackAddToCart(product.shopId, product.id);
    onAddedToCart?.();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-bg-canvas">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border-subtle bg-bg-surface">
          <Text className="text-lg font-bold text-text-primary">Katalogdan qidirish</Text>
          <Pressable onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center bg-surface-muted" hitSlop={8}>
            <X size={18} color={activeColors.text.primary} />
          </Pressable>
        </View>

        {/* Search input */}
        <View className="p-3 bg-bg-surface border-b border-border-subtle">
          <View className="flex-row items-center rounded-xl px-3 h-10 gap-2 bg-surface-muted">
            <Search size={16} color={activeColors.text.secondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Mahsulot nomini kiriting..."
              placeholderTextColor={activeColors.text.secondary}
              className="flex-1 text-sm py-0 text-text-primary"
              returnKeyType="search"
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <X size={15} color={activeColors.text.hint} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Results List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={activeColors.brand.primary} />
          </View>
        ) : !data || data.length === 0 ? (
          <View className="flex-1 items-center justify-center p-6">
            <View className="w-16 h-16 rounded-full items-center justify-center mb-3 bg-brand-surface">
              <ShoppingBag size={28} color={activeColors.brand.primary} />
            </View>
            <Text className="text-base font-bold text-text-primary text-center">Mahsulot topilmadi</Text>
            <Text className="text-sm text-text-secondary text-center mt-1">
              «{query}» bo'yicha do'konlarda mahsulot topilmadi. Boshqacha nom bilan qidirib ko'ring.
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 12, gap: 10 }}
            renderItem={({ item }) => {
              const finalPrice = item.discountPrice ?? item.price;
              const photo = item.photos && item.photos.length > 0 ? item.photos[0] : null;
              return (
                <View className="flex-row items-center p-3 rounded-2xl bg-bg-surface border border-border-subtle shadow-sm">
                  <View className="w-16 h-16 rounded-xl overflow-hidden mr-3 bg-bg-surface-muted">
                    {photo ? (
                      <Image source={{ uri: resolveMedia(photo) }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full items-center justify-center bg-brand-surface">
                        <ShoppingBag size={20} color={activeColors.brand.primary} />
                      </View>
                    )}
                  </View>
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
                      {getLocalizedText(item.name)}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5" numberOfLines={1}>
                      {item.shop?.name || "Do'kon"}
                    </Text>
                    <Text className="text-sm font-extrabold text-brand-primary mt-1">
                      {formatMoney(finalPrice)} {tr('common.som')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleAddToCart(item)}
                    className="flex-row items-center gap-1 px-3 h-9 rounded-xl bg-brand-primary active:scale-95 shadow-sm"
                  >
                    <Plus size={15} color="#FFFFFF" strokeWidth={2.8} />
                    <Text className="text-xs font-bold text-white">Savatga</Text>
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}
