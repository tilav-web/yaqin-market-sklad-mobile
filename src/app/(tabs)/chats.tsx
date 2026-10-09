import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  MessageCircle,
  Search as SearchIcon,
  Store,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FolderTabItem,
  formatTelegramTime,
  TelegramChatRow,
  TelegramChatsEmpty,
  TelegramFolderTabs,
  TelegramSavedMessagesRow,
  TelegramShopRow,
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
import { colors, radius, typography } from '@/theme';
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
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: activeColors.bg.canvas }]}>
      {/* Telegram Style Top Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: activeColors.bg.surface,
            borderBottomColor: activeColors.border.subtle,
          },
        ]}
      >
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: activeColors.text.primary }]}>{tr('chat.title')}</Text>
          {unreadTotal > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{unreadTotal}</Text>
            </View>
          )}
        </View>

        {/* Search Bar matching Telegram */}
        <View style={[styles.searchBar, { backgroundColor: activeColors.bg.surfaceMuted }]}>
          <SearchIcon size={17} color={activeColors.text.secondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={activeTabIndex === 0 ? tr('chat.searchPlaceholder') : "Do'konlarni qidirish..."}
            placeholderTextColor={activeColors.text.secondary}
            style={[styles.searchInput, { color: activeColors.text.primary }]}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={activeColors.text.secondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Telegram Swipeable Folder Tabs: Chatlar & Do'konlar */}
      <TelegramFolderTabs
        tabs={folderTabs}
        activeIndex={activeTabIndex}
        onSelectTab={handleSelectTab}
      />

      {/* Swipeable PagerView between Chatlar and Do'konlar */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setActiveTabIndex(e.nativeEvent.position)}
      >
        {/* Page 0: Chatlar */}
        <View key="chats" style={[styles.page, { backgroundColor: activeColors.bg.canvas }]}>
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={activeColors.brand.primary} />
            </View>
          ) : !isAuthenticated ? (
            <View style={styles.centerContainer}>
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
                <View style={[styles.separator, { backgroundColor: activeColors.border.subtle }]} />
              )}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 90 },
              ]}
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
        <View key="shops" style={[styles.page, { backgroundColor: activeColors.bg.canvas }]}>
          <FlatList
            data={filteredShops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TelegramShopRow shop={item} />}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: activeColors.border.subtle },
                ]}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 90 },
            ]}
            ListEmptyComponent={
              isLoadingShops ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={activeColors.brand.primary} />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: activeColors.brand.primarySurface }]}>
                    <Store size={44} color={activeColors.brand.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: activeColors.text.primary }]}>
                    Do'konlar topilmadi
                  </Text>
                  <Text style={[styles.emptyDesc, { color: activeColors.text.secondary }]}>
                    {searchQuery.trim()
                      ? `"${searchQuery}" bo'yicha do'konlar topilmadi`
                      : "Yaqin-atrofda faol do'konlar mavjud emas"}
                  </Text>
                </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  header: {
    backgroundColor: '#0E1621',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  totalBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2C3A',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  listContent: {
    paddingTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1F2937',
    marginLeft: 16 + 52 + 14, // Telegram inset
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
});
