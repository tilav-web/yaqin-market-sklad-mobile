import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Search as SearchIcon, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { haptics } from '@/utils/haptics';

import { TelegramSearchIdleList } from './TelegramSearchIdleList';
import { FilterTab, TelegramSearchResultsList } from './TelegramSearchResultsList';

export function TelegramSearchModal() {
  const insets = useSafeAreaInsets();
  const coords = useEffectiveCoords();
  const { isOpen, initialQuery, close } = useSearchModalStore();
  const { isDark, colors: themeColors } = useTheme();
  const { tr } = useTranslation();

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
    router.push('/saved-messages');
  }, [close]);

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
            <TelegramSearchResultsList
              activeTab={activeTab}
              query={query}
              products={products}
              shops={shops}
              matchingConversations={matchingConversations}
              themeColors={themeColors}
              onSelectProduct={handleSelectProduct}
              onSelectShop={handleSelectShop}
              onSelectConversation={handleSelectConversation}
            />
          ) : (
            <TelegramSearchIdleList
              categories={categories}
              isDark={isDark}
              themeColors={themeColors}
              onSelectSaved={handleSelectSaved}
              onSelectCategory={(name) => setQuery(name)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
