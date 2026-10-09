import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FolderTabItem,
  formatTelegramTime,
  TelegramChatRow,
  TelegramChatsEmpty,
  TelegramChatsHeader,
  TelegramFolderTabs,
  TelegramSavedMessagesRow,
  TelegramShopRow,
  TelegramShopsEmpty,
  UnifiedChat,
} from '@/components/telegram';
import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Conversation, Order, PublicShop } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useEffectiveCoords } from '@/stores/location';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

export default function ChatsTabScreen() {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const coords = useEffectiveCoords();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);

  // Query nearby shops
  const {
    data: shops = [],
    isLoading: isLoadingShops,
    isRefetching: isRefetchingShops,
    refetch: refetchShops,
  } = useQuery<PublicShop[]>({
    queryKey: ['shops', 'nearby', coords?.latitude, coords?.longitude],
    queryFn: async () => {
      if (!coords) return [];
      const res = await api.get<PublicShop[]>('/shops/nearby', {
        params: { lat: coords.latitude, lng: coords.longitude },
      });
      return res.data ?? [];
    },
    enabled: !!coords,
    staleTime: 60_000,
  });

  // Query conversation threads
  const {
    data: conversations = [],
    isLoading: isLoadingConvs,
    isRefetching: isRefetchingConvs,
    refetch: refetchConvs,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/conversations');
      return res.data ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  // Query user orders to auto-populate chat history with every shop
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isRefetching: isRefetchingOrders,
    refetch: refetchOrders,
  } = useQuery<Order[]>({
    queryKey: ['my-orders-for-chats'],
    queryFn: async () => {
      try {
        const res = await api.get<Order[]>('/orders/mine');
        return res.data ?? [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    staleTime: 20_000,
  });

  // Realtime updates: listen for incoming messages
  useEffect(() => {
    let cancelled = false;
    getSocket()
      .then((socket) => {
        if (cancelled) return;
        const handler = () => {
          void qc.invalidateQueries({ queryKey: ['conversations'] });
        };
        socket.on('conversation:message', handler);
        return () => {
          socket.off('conversation:message', handler);
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [qc]);

  // Merge conversations and order history into unified Telegram chat list
  const unifiedChats = useMemo<UnifiedChat[]>(() => {
    const map = new Map<string, UnifiedChat>();

    // 1. Add active conversation threads
    for (const conv of conversations) {
      const key = conv.shopId || conv.id;
      map.set(key, {
        id: conv.id,
        shopId: conv.shopId,
        title: conv.isSellerSide ? conv.customerName : conv.shopName,
        avatarUrl: conv.isSellerSide
          ? conv.customerAvatarUrl ?? null
          : conv.shopPhotos && conv.shopPhotos.length > 0
            ? conv.shopPhotos[0]
            : null,
        subtitle: conv.lastMessageText || tr('chat.historyDefault'),
        time: formatTelegramTime(conv.lastMessageAt),
        rawDate: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0,
        isOrder: false,
        isSellerSide: conv.isSellerSide,
      });
    }

    // 2. Synthesize chat history for every shop where an order was placed
    for (const order of orders) {
      const key = order.shopId;
      if (!map.has(key)) {
        const orderNum = order.orderNumber || order.id.slice(0, 6).toUpperCase();
        map.set(key, {
          id: order.id,
          shopId: order.shopId,
          title: order.shop?.name || `Do'kon #${order.shopId.slice(0, 6)}`,
          avatarUrl: order.shop?.photos && order.shop.photos.length > 0 ? order.shop.photos[0] : null,
          subtitle: `📦 Buyurtma #${orderNum} · ${order.status}`,
          time: formatTelegramTime(order.createdAt),
          rawDate: order.createdAt,
          unreadCount: 0,
          isOrder: true,
          isSellerSide: false,
        });
      }
    }

    // Convert map to array and sort by most recent date
    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      return timeB - timeA;
    });
  }, [conversations, orders, tr]);

  // Filter chats by query
  const filteredChats = useMemo(() => {
    return unifiedChats.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    });
  }, [unifiedChats, searchQuery]);

  const filteredShops = useMemo(() => {
    if (!searchQuery.trim()) return shops;
    const q = searchQuery.toLowerCase();
    return shops.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.address && s.address.toLowerCase().includes(q)),
    );
  }, [shops, searchQuery]);

  const unreadTotal = useMemo(() => {
    return unifiedChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [unifiedChats]);

  const folderTabs = useMemo<FolderTabItem[]>(() => [
    { id: 'chats', title: tr('chat.title') || 'Chatlar', badge: unreadTotal > 0 ? unreadTotal : undefined },
    { id: 'shops', title: "Do'konlar", badge: shops.length > 0 ? shops.length : undefined },
  ], [unreadTotal, shops.length, tr]);

  const handleSelectTab = useCallback((index: number) => {
    setActiveTabIndex(index);
    pagerRef.current?.setPage(index);
  }, []);

  const handleOpenChat = useCallback((chat: UnifiedChat) => {
    haptics.selection();
    router.push({
      pathname: '/chat/[orderId]',
      params: {
        orderId: chat.id,
        conversationId: chat.isOrder ? undefined : chat.id,
        shopId: chat.shopId,
        title: chat.title,
      },
    });
  }, []);

  const handleOpenSaved = useCallback(() => {
    haptics.selection();
    router.push('/favorites');
  }, []);

  const handleRefresh = useCallback(() => {
    void refetchConvs();
    void refetchOrders();
  }, [refetchConvs, refetchOrders]);

  const isRefreshing = isRefetchingConvs || isRefetchingOrders;
  const isLoading = isLoadingConvs && isLoadingOrders;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-black">
      {/* Top Header */}
      <TelegramChatsHeader
        unreadTotal={unreadTotal}
        searchQuery={searchQuery}
        onChangeSearch={setSearchQuery}
        activeTabIndex={activeTabIndex}
        activeColors={activeColors}
      />

      {/* Swipeable Folder Tabs */}
      <TelegramFolderTabs
        tabs={folderTabs}
        activeIndex={activeTabIndex}
        onSelectTab={handleSelectTab}
      />

      {/* Swipeable PagerView */}
      <PagerView
        ref={pagerRef}
        className="flex-1"
        initialPage={0}
        onPageSelected={(e) => setActiveTabIndex(e.nativeEvent.position)}
      >
        {/* Page 0: Chatlar */}
        <View key="chats" className="flex-1" style={{ backgroundColor: activeColors.bg.canvas }}>
          {isLoading ? (
            <View className="flex-1 items-center justify-center px-8">
              <ActivityIndicator size="large" color={activeColors.brand.primary} />
            </View>
          ) : !isAuthenticated ? (
            <View className="flex-1 items-center justify-center px-8">
              <EmptyState
                icon={MessageCircle}
                title={tr('chat.loginTitle')}
                description={tr('chat.loginDesc')}
                actionLabel={tr('chat.loginButton')}
                onAction={() => router.push('/(auth)/phone')}
              />
            </View>
          ) : (
            <FlatList
              data={filteredChats}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TelegramChatRow
                  item={item}
                  onPress={() => handleOpenChat(item)}
                  activeColors={activeColors}
                />
              )}
              ItemSeparatorComponent={() => (
                <View
                  className="h-[1px] ml-[82px]"
                  style={{ backgroundColor: activeColors.border.subtle }}
                />
              )}
              contentContainerStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 90 }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={activeColors.brand.primary}
                />
              }
              ListHeaderComponent={
                <TelegramSavedMessagesRow
                  onPress={handleOpenSaved}
                  activeColors={activeColors}
                />
              }
              ListEmptyComponent={
                <TelegramChatsEmpty
                  onExplore={() => router.push('/(tabs)')}
                  activeColors={activeColors}
                />
              }
            />
          )}
        </View>

        {/* Page 1: Do'konlar */}
        <View key="shops" className="flex-1" style={{ backgroundColor: activeColors.bg.canvas }}>
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TelegramShopRow shop={item} />}
            ItemSeparatorComponent={() => (
              <View
                className="h-[1px] ml-[82px]"
                style={{ backgroundColor: activeColors.border.subtle }}
              />
            )}
            contentContainerStyle={{ paddingTop: 2, paddingBottom: insets.bottom + 90 }}
            ListEmptyComponent={
              isLoadingShops ? (
                <View className="flex-1 items-center justify-center px-8">
                  <ActivityIndicator size="large" color={activeColors.brand.primary} />
                </View>
              ) : (
                <TelegramShopsEmpty searchQuery={searchQuery} activeColors={activeColors} />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetchingShops}
                onRefresh={() => void refetchShops()}
                tintColor={activeColors.brand.primary}
              />
            }
          />
        </View>
      </PagerView>
    </SafeAreaView>
  );
}
