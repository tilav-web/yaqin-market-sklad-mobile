import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Bookmark,
  Check,
  CheckCheck,
  MessageCircle,
  Pin,
  Search as SearchIcon,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Conversation, Order } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/stores/theme';
import { colors, radius, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

function formatTelegramTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  // If today: return HH:MM
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If this year: return DD/MM
  if (date.getFullYear() === now.getFullYear()) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  }

  // Else: return DD/MM/YY
  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
}

interface UnifiedChat {
  id: string;
  shopId?: string;
  title: string;
  avatarUrl: string | null;
  subtitle: string;
  time: string;
  rawDate: string | null;
  unreadCount: number;
  isOrder: boolean;
  isSellerSide?: boolean;
}

export default function ChatsTabScreen() {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'shops'>('all');

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

  // Filter chats by query & tabs
  const filteredChats = useMemo(() => {
    return unifiedChats.filter((item) => {
      if (activeFilter === 'unread' && item.unreadCount <= 0) return false;
      if (activeFilter === 'shops' && item.isSellerSide) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
      );
    });
  }, [unifiedChats, searchQuery, activeFilter]);

  const unreadTotal = useMemo(() => {
    return unifiedChats.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [unifiedChats]);

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

  const renderChatItem = ({ item }: { item: UnifiedChat }) => {
    const initials = item.title
      ? item.title
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'YM';

    return (
      <Pressable
        onPress={() => handleOpenChat(item)}
        style={({ pressed }) => [
          styles.chatRow,
          { backgroundColor: activeColors.bg.surface },
          pressed && { backgroundColor: activeColors.bg.surfaceMuted },
        ]}>
        {/* Telegram Circle Avatar */}
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={[styles.avatarImage, { backgroundColor: activeColors.bg.surfaceMuted }]}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: item.isSellerSide ? activeColors.bg.surfaceElevated : activeColors.brand.primary },
              ]}>
              {item.isSellerSide ? (
                <Text style={styles.avatarInitials}>{initials}</Text>
              ) : (
                <Store size={22} color="#FFFFFF" />
              )}
            </View>
          )}
          {item.isSellerSide && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Xaridor</Text>
            </View>
          )}
        </View>

        {/* Telegram Chat Content */}
        <View style={styles.contentWrap}>
          <View style={styles.topLine}>
            <Text
              style={[styles.chatTitle, { color: activeColors.text.primary }]}
              numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.timeWrap}>
              <Text style={[styles.timeText, { color: activeColors.text.tertiary }, item.unreadCount > 0 && styles.timeTextUnread]}>
                {item.time}
              </Text>
            </View>
          </View>

          <View style={styles.bottomLine}>
            <Text
              style={[
                styles.lastMessageText,
                { color: activeColors.text.secondary },
                item.unreadCount > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={2}>
              {item.subtitle}
            </Text>

            {item.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            ) : item.isOrder ? (
              <CheckCheck size={16} color={activeColors.text.tertiary} />
            ) : (
              <Check size={16} color={activeColors.text.tertiary} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

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
        ]}>
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
            placeholder={tr('chat.searchPlaceholder')}
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

        {/* Telegram Filter Pills */}
        <View style={styles.filterPills}>
          <Pressable
            onPress={() => {
              haptics.selection();
              setActiveFilter('all');
            }}
            style={[
              styles.filterPill,
              { backgroundColor: activeColors.bg.surfaceMuted },
              activeFilter === 'all' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterPillText,
                { color: activeColors.text.secondary },
                activeFilter === 'all' && styles.filterPillTextActive,
              ]}>
              {tr('chat.filterAll')} ({unifiedChats.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              setActiveFilter('shops');
            }}
            style={[
              styles.filterPill,
              { backgroundColor: activeColors.bg.surfaceMuted },
              activeFilter === 'shops' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterPillText,
                { color: activeColors.text.secondary },
                activeFilter === 'shops' && styles.filterPillTextActive,
              ]}>
              {tr('chat.filterShops')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              setActiveFilter('unread');
            }}
            style={[
              styles.filterPill,
              { backgroundColor: activeColors.bg.surfaceMuted },
              activeFilter === 'unread' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterPillText,
                { color: activeColors.text.secondary },
                activeFilter === 'unread' && styles.filterPillTextActive,
              ]}>
              {tr('chat.filterUnread')} {unreadTotal > 0 ? `(${unreadTotal})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Chat List Area */}
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
          renderItem={renderChatItem}
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
            /* Pinned "Saved Messages" item matching Screenshot 1 */
            <Pressable
              onPress={handleOpenSaved}
              style={({ pressed }) => [
                styles.chatRow,
                styles.savedRow,
                {
                  backgroundColor: activeColors.bg.surface,
                  borderBottomColor: activeColors.border.subtle,
                },
                pressed && { backgroundColor: activeColors.bg.surfaceMuted },
              ]}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatarFallback, { backgroundColor: activeColors.brand.primary }]}>
                  <Bookmark size={24} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.contentWrap}>
                <View style={styles.topLine}>
                  <Text style={[styles.chatTitle, { color: activeColors.text.primary }]}>{tr('chat.savedMessages')}</Text>
                  <Pin size={15} color={activeColors.text.secondary} style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
                <View style={styles.bottomLine}>
                  <Text
                    style={[styles.lastMessageText, { color: activeColors.text.secondary }]}
                    numberOfLines={1}>
                    {tr('chat.savedMessagesDesc')}
                  </Text>
                </View>
              </View>
            </Pressable>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: activeColors.brand.primarySurface }]}>
                <MessageCircle size={44} color={activeColors.brand.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: activeColors.text.primary }]}>{tr('chat.emptyTitle')}</Text>
              <Text style={[styles.emptyDesc, { color: activeColors.text.secondary }]}>
                {tr('chat.emptyDesc')}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)')}
                style={[styles.exploreButton, { backgroundColor: activeColors.brand.primary }]}>
                <ShoppingBag size={18} color="#FFFFFF" />
                <Text style={styles.exploreButtonText}>{tr('chat.exploreButton')}</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
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
  filterPills: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A232E',
  },
  filterPillActive: {
    backgroundColor: colors.brand.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingTop: 2,
  },
  savedRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1F2937',
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  chatRowPressed: {
    backgroundColor: '#111827',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F2937',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '800',
    fontSize: 18,
    color: '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#374151',
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 8,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeTextUnread: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessageText: {
    fontSize: 13.5,
    color: '#9CA3AF',
    flex: 1,
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
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
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
