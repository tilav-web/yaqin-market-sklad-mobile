import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Check,
  CheckCheck,
  MessageCircle,
  MessageSquare,
  Search as SearchIcon,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Conversation } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
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

export default function ChatsTabScreen() {
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const {
    data: conversations = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/conversations');
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 15_000,
  });

  // Realtime updates: listen for incoming conversation messages
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

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      if (activeFilter === 'unread' && item.unreadCount <= 0) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = item.isSellerSide ? item.customerName : item.shopName;
      return (
        name.toLowerCase().includes(q) ||
        (item.lastMessageText && item.lastMessageText.toLowerCase().includes(q))
      );
    });
  }, [conversations, searchQuery, activeFilter]);

  const unreadTotal = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

  const handleOpenChat = useCallback((conv: Conversation) => {
    haptics.selection();
    const title = conv.isSellerSide ? conv.customerName : conv.shopName;
    router.push({
      pathname: '/chat/[conversationId]',
      params: {
        conversationId: conv.id,
        shopId: conv.shopId,
        title,
      },
    });
  }, []);

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const title = item.isSellerSide ? item.customerName : item.shopName;
    const photo =
      item.isSellerSide
        ? item.customerAvatarUrl
        : item.shopPhotos && item.shopPhotos.length > 0
          ? item.shopPhotos[0]
          : null;
    const initials = title
      ? title
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
          pressed && styles.chatRowPressed,
        ]}>
        {/* Telegram Avatar */}
        <View style={styles.avatarContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              {item.isSellerSide ? (
                <Text style={styles.avatarInitials}>{initials}</Text>
              ) : (
                <Store size={22} color={colors.brand.primary} />
              )}
            </View>
          )}
          {item.isSellerSide && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Xaridor</Text>
            </View>
          )}
        </View>

        {/* Telegram Message Body */}
        <View style={styles.contentWrap}>
          <View style={styles.topLine}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[styles.timeText, item.unreadCount > 0 && styles.timeTextUnread]}>
              {formatTelegramTime(item.lastMessageAt)}
            </Text>
          </View>

          <View style={styles.bottomLine}>
            <Text
              style={[
                styles.lastMessageText,
                item.unreadCount > 0 && styles.lastMessageUnread,
              ]}
              numberOfLines={2}>
              {item.lastMessageText || tr('chat.empty')}
            </Text>

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Telegram Style Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>{tr('chat.title')}</Text>
          {unreadTotal > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{unreadTotal}</Text>
            </View>
          )}
        </View>

        {/* Search bar in Telegram style */}
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.text.tertiary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={tr('chat.searchPlaceholder')}
            placeholderTextColor={colors.text.hint}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color={colors.text.secondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPills}>
          <Pressable
            onPress={() => {
              haptics.selection();
              setActiveFilter('all');
            }}
            style={[
              styles.filterPill,
              activeFilter === 'all' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'all' && styles.filterPillTextActive,
              ]}>
              Barchasi ({conversations.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              setActiveFilter('unread');
            }}
            style={[
              styles.filterPill,
              activeFilter === 'unread' && styles.filterPillActive,
            ]}>
            <Text
              style={[
                styles.filterPillText,
                activeFilter === 'unread' && styles.filterPillTextActive,
              ]}>
              O'qilmaganlar {unreadTotal > 0 ? `(${unreadTotal})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* List / Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      ) : !isAuthenticated ? (
        <View style={styles.centerContainer}>
          <EmptyState
            title="Tizimga kiring"
            description="Sellerlar bilan yozishish uchun hisobingizga kiring"
            actionLabel="Kirish"
            onAction={() => router.push('/(auth)/phone')}
          />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <MessageCircle size={44} color={colors.brand.primary} />
          </View>
          <Text style={styles.emptyTitle}>{tr('chat.noChats')}</Text>
          <Text style={styles.emptyDesc}>{tr('chat.noChatsDesc')}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={styles.exploreButton}>
            <ShoppingBag size={18} color={colors.text.onPrimary} />
            <Text style={styles.exploreButtonText}>Do'konlarni ko'rish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.brand.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.canvas,
  },
  header: {
    backgroundColor: colors.bg.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text.primary,
  },
  totalBadge: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalBadgeText: {
    color: colors.text.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    height: 40,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: colors.text.primary,
    paddingVertical: 0,
  },
  filterPills: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
  },
  filterPillActive: {
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  filterPillText: {
    ...typography.caption,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: spacing.xs,
  },
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
  },
  chatRowPressed: {
    backgroundColor: colors.bg.surfaceMuted,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  avatarInitials: {
    ...typography.body,
    fontWeight: '800',
    fontSize: 18,
    color: colors.brand.primary,
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: colors.palette.gray800,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  roleBadgeText: {
    color: colors.text.onDark,
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
    alignItems: 'baseline',
    marginBottom: 4,
  },
  chatTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  timeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.tertiary,
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
    gap: spacing.sm,
  },
  lastMessageText: {
    ...typography.caption,
    fontSize: 13.5,
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: colors.text.onPrimary,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginLeft: spacing.lg + 54 + spacing.md, // Telegram inset separator
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptyDesc: {
    ...typography.body,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  exploreButtonText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.onPrimary,
    fontSize: 14,
  },
});
