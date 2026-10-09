import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bookmark,
  ChevronRight,
  MessageCircle,
  Package,
  Search as SearchIcon,
  Store,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Category, Conversation, FeedProduct, FeedResponse, PublicShop } from '@/lib/types';
import { useEffectiveCoords } from '@/stores/location';
import { useSearchModalStore } from '@/stores/searchModal';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';
import { formatMoney } from '@/utils/formatMoney';
import { haptics } from '@/utils/haptics';

type FilterTab = 'all' | 'products' | 'shops' | 'chats';

export function TelegramSearchModal() {
  const insets = useSafeAreaInsets();
  const coords = useEffectiveCoords();
  const { isOpen, initialQuery, close } = useSearchModalStore();
  const { isDark, colors: themeColors } = useTheme();
  const { tr, catName } = useTranslation();

  const [query, setQuery] = useState('');
  const [prevOpen, setPrevOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const inputRef = useRef<TextInput>(null);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    setQuery(isOpen ? initialQuery || '' : '');
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Query products
  const productsQuery = useQuery<FeedProduct[]>({
    queryKey: ['search-products', query, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get<FeedResponse>('/catalog/products', {
        params: {
          q: query.trim(),
          lat: coords?.latitude,
          lng: coords?.longitude,
          limit: 20,
        },
      });
      return res.data?.items ?? [];
    },
    enabled: isOpen && query.trim().length > 0,
    staleTime: 10_000,
  });

  // Query shops
  const shopsQuery = useQuery<PublicShop[]>({
    queryKey: ['search-shops', query, coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get<PublicShop[]>('/catalog/shops', {
        params: {
          q: query.trim(),
          lat: coords?.latitude,
          lng: coords?.longitude,
        },
      });
      return res.data ?? [];
    },
    enabled: isOpen && query.trim().length > 0,
    staleTime: 10_000,
  });

  // Query conversations
  const convsQuery = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/conversations');
      return res.data ?? [];
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  // Query categories
  const catsQuery = useQuery<Category[]>({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/catalog/categories');
      return res.data ?? [];
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  const products = productsQuery.data ?? [];
  const shops = shopsQuery.data ?? [];
  const categories = catsQuery.data ?? [];

  const isSearching = query.trim().length > 0;
  const isLoading = (productsQuery.isLoading || shopsQuery.isLoading) && isSearching;

  const matchingConversations = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return (convsQuery.data ?? []).filter(
      (c) =>
        c.shopName?.toLowerCase().includes(q) ||
        c.lastMessageText?.toLowerCase().includes(q),
    );
  }, [convsQuery.data, query]);

  const handleSelectProduct = useCallback(
    (product: FeedProduct) => {
      haptics.selection();
      close();
      router.push(`/product/${product.id}` as any);
    },
    [close],
  );

  const handleSelectShop = useCallback(
    (shop: PublicShop) => {
      haptics.selection();
      close();
      router.push(`/shop/${shop.id}` as any);
    },
    [close],
  );

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      haptics.selection();
      close();
      router.push({
        pathname: '/chat/[orderId]',
        params: {
          orderId: conv.id,
          conversationId: conv.id,
          shopId: conv.shopId,
          title: conv.shopName,
        },
      } as any);
    },
    [close],
  );

  const handleSelectSaved = useCallback(() => {
    haptics.selection();
    close();
    router.push({
      pathname: '/chat/[orderId]',
      params: {
        orderId: 'saved',
        conversationId: 'saved',
        title: tr('chat.savedMessages'),
      },
    } as any);
  }, [close, tr]);

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={close}>
      <View
        className="flex-1"
        style={{
          paddingTop: Math.max(insets.top, 12),
          backgroundColor: themeColors.bg.canvas,
        }}
      >
        {/* Top Search Bar */}
        <View
          className="px-4 pt-2 pb-2.5 border-b gap-2.5"
          style={{
            backgroundColor: themeColors.bg.surface,
            borderBottomColor: themeColors.border.subtle,
          }}
        >
          <View className="flex-row items-center gap-2.5">
            <View
              className="flex-1 flex-row items-center rounded-[22px] border px-3 h-[42px]"
              style={{
                backgroundColor: isDark ? '#1E2C3A' : '#F1F5F9',
                borderColor: themeColors.border.subtle,
              }}
            >
              <SearchIcon size={18} color={themeColors.text.secondary} className="mr-2" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Qidirish..."
                placeholderTextColor={themeColors.text.tertiary}
                className="flex-1 text-[15px] py-0"
                style={{ color: themeColors.text.primary }}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setQuery('');
                  }}
                  className="p-1"
                  hitSlop={8}
                >
                  <View
                    className="w-[18px] h-[18px] rounded-full items-center justify-center"
                    style={{ backgroundColor: themeColors.border.default }}
                  >
                    <X size={12} color={themeColors.text.secondary} />
                  </View>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={() => {
                haptics.selection();
                close();
              }}
              className="px-1.5 py-1.5"
              hitSlop={8}
            >
              <Text className="text-[15px] font-semibold" style={{ color: themeColors.brand.primary }}>
                {tr('common.cancel')}
              </Text>
            </Pressable>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row gap-1.5">
            {(
              [
                { key: 'all', label: tr('filter.all') },
                { key: 'products', label: 'Mahsulotlar' },
                { key: 'shops', label: "Do'konlar" },
                { key: 'chats', label: 'Chatlar' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    haptics.selection();
                    setActiveTab(tab.key);
                  }}
                  className={`px-3.5 py-1.5 rounded-[18px] ${
                    isActive ? 'bg-[#E8392E]' : ''
                  }`}
                  style={
                    isActive
                      ? undefined
                      : { backgroundColor: themeColors.bg.surfaceMuted }
                  }
                >
                  <Text
                    className={`text-[13px] ${
                      isActive ? 'text-white font-bold' : 'font-semibold'
                    }`}
                    style={isActive ? undefined : { color: themeColors.text.secondary }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Results Area */}
        <View className="flex-1 px-4">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : isSearching ? (
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View className="pb-30">
                  {/* Products matches */}
                  {(activeTab === 'all' || activeTab === 'products') && products.length > 0 && (
                    <View className="mt-3">
                      <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                        MAHSULOTLAR ({products.length})
                      </Text>
                      {products.map((p) => {
                        const price = p.discountPrice ?? p.price;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => handleSelectProduct(p)}
                            className="flex-row items-center py-2.5 border-b"
                            style={{ borderBottomColor: themeColors.border.subtle }}
                          >
                            <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                              {p.photos?.[0] ? (
                                <Image source={{ uri: p.photos[0] }} className="w-full h-full" />
                              ) : (
                                <View className="w-full h-full items-center justify-center bg-[#E8392E]">
                                  <Package size={22} color="#FFF" />
                                </View>
                              )}
                            </View>
                            <View className="flex-1 gap-0.5">
                              <Text
                                className="text-base font-bold"
                                style={{ color: themeColors.text.primary }}
                                numberOfLines={1}
                              >
                                {p.name}
                              </Text>
                              <Text
                                className="text-[13.5px]"
                                style={{ color: themeColors.text.secondary }}
                                numberOfLines={1}
                              >
                                {p.shop?.name} · {formatMoney(price)} so&apos;m
                              </Text>
                            </View>
                            <View className="px-2 py-0.5 rounded bg-white/10">
                              <Text className="text-[11px] font-bold text-gray-300">Tovar</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {/* Shops matches */}
                  {(activeTab === 'all' || activeTab === 'shops') && shops.length > 0 && (
                    <View className="mt-3">
                      <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                        DO&apos;KONLAR ({shops.length})
                      </Text>
                      {shops.map((s) => (
                        <Pressable
                          key={s.id}
                          onPress={() => handleSelectShop(s)}
                          className="flex-row items-center py-2.5 border-b"
                          style={{ borderBottomColor: themeColors.border.subtle }}
                        >
                          <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                            {s.photos?.[0] ? (
                              <Image source={{ uri: s.photos[0] }} className="w-full h-full" />
                            ) : (
                              <View className="w-full h-full items-center justify-center bg-[#10B981]">
                                <Store size={22} color="#FFF" />
                              </View>
                            )}
                          </View>
                          <View className="flex-1 gap-0.5">
                            <Text
                              className="text-base font-bold"
                              style={{ color: themeColors.text.primary }}
                              numberOfLines={1}
                            >
                              {s.name}
                            </Text>
                            <Text
                              className="text-[13.5px]"
                              style={{ color: themeColors.text.secondary }}
                              numberOfLines={1}
                            >
                              {s.address || "Yaqin do'kon"} {s.distanceKm ? `· ${s.distanceKm.toFixed(1)} km` : ''}
                            </Text>
                          </View>
                          <View className="px-2 py-0.5 rounded bg-[#2481CC]/15">
                            <Text className="text-[11px] font-bold text-[#2481CC]">DO&apos;KON</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Conversations matches */}
                  {(activeTab === 'all' || activeTab === 'chats') && matchingConversations.length > 0 && (
                    <View className="mt-3">
                      <Text className="text-xs font-bold text-gray-400 tracking-wider mb-1.5 uppercase">
                        CHATLAR ({matchingConversations.length})
                      </Text>
                      {matchingConversations.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => handleSelectConversation(c)}
                          className="flex-row items-center py-2.5 border-b"
                          style={{ borderBottomColor: themeColors.border.subtle }}
                        >
                          <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                            <View className="w-full h-full items-center justify-center bg-[#F59E0B]">
                              <MessageCircle size={22} color="#FFF" />
                            </View>
                          </View>
                          <View className="flex-1 gap-0.5">
                            <Text
                              className="text-base font-bold"
                              style={{ color: themeColors.text.primary }}
                              numberOfLines={1}
                            >
                              {c.shopName}
                            </Text>
                            <Text
                              className="text-[13.5px]"
                              style={{ color: themeColors.text.secondary }}
                              numberOfLines={1}
                            >
                              {c.lastMessageText || 'Suhbat tarixi'}
                            </Text>
                          </View>
                          <View className="px-2 py-0.5 rounded bg-white/10">
                            <Text className="text-[11px] font-bold text-gray-300">Chat</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {products.length === 0 && shops.length === 0 && matchingConversations.length === 0 && (
                    <View className="items-center justify-center py-15 gap-2.5">
                      <SearchIcon size={44} color="#8E8E93" />
                      <Text className="text-[17px] font-bold" style={{ color: themeColors.text.primary }}>
                        Natija topilmadi
                      </Text>
                      <Text className="text-sm text-center px-8" style={{ color: themeColors.text.tertiary }}>
                        &quot;{query}&quot; bo&apos;yicha hech qanday tovar yoki do&apos;kon topilmadi
                      </Text>
                    </View>
                  )}
                </View>
              }
            />
          ) : (
            /* Idle / Initial State */
            <FlatList
              data={[]}
              renderItem={null}
              ListHeaderComponent={
                <View className="pb-30">
                  {/* Saved Messages */}
                  <Pressable
                    onPress={handleSelectSaved}
                    className="flex-row items-center py-2.5 border-b"
                    style={{ borderBottomColor: themeColors.border.subtle }}
                  >
                    <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                      <View className="w-full h-full items-center justify-center bg-[#E8392E]">
                        <Bookmark size={22} color="#FFF" />
                      </View>
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text className="text-base font-bold" style={{ color: themeColors.text.primary }}>
                        {tr('chat.savedMessages')}
                      </Text>
                      <Text className="text-[13.5px]" style={{ color: themeColors.text.secondary }}>
                        {tr('chat.savedMessagesDesc')}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={themeColors.text.tertiary} />
                  </Pressable>

                  {/* Popular categories */}
                  {categories.length > 0 && (
                    <View className="mt-4">
                      <Text className="text-xs font-bold tracking-wider mb-1.5 uppercase" style={{ color: themeColors.text.secondary }}>
                        {tr('search.categories').toUpperCase()}
                      </Text>
                      {categories.slice(0, 8).map((cat) => (
                        <Pressable
                          key={cat.id}
                          onPress={() => setQuery(cat.nameUzLatn)}
                          className="flex-row items-center py-2.5 border-b"
                          style={{ borderBottomColor: themeColors.border.subtle }}
                        >
                          <View className="w-12 h-12 rounded-full mr-3.5 overflow-hidden">
                            <View
                              className="w-full h-full items-center justify-center"
                              style={{ backgroundColor: isDark ? '#374151' : '#E2E8F0' }}
                            >
                              {cat.iconUrl ? (
                                <Image source={{ uri: cat.iconUrl }} className="w-full h-full" />
                              ) : (
                                <Text className="text-lg">🛍️</Text>
                              )}
                            </View>
                          </View>
                          <View className="flex-1 gap-0.5">
                            <Text className="text-base font-bold" style={{ color: themeColors.text.primary }}>
                              {catName(cat)}
                            </Text>
                            <Text className="text-[13.5px]" style={{ color: themeColors.text.secondary }}>
                              {tr('search.empty.desc')}
                            </Text>
                          </View>
                          <ChevronRight size={16} color={themeColors.text.tertiary} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
