import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, CheckCheck, MessageCircle, Package, ShoppingBag, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { api, resolveMedia } from '@/lib/api';
import { AppNotification } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { colors, layout, radius, spacing, typography } from '@/theme';

const ICON: Record<string, typeof Bell> = {
  'order:new': ShoppingBag,
  'order:updated': Package,
  'order:assigned': Package,
  'order:auto_cancelled': TriangleAlert,
  'order:seller_no_response': TriangleAlert,
  'order:seller_rejected': TriangleAlert,
  'order:returned': Package,
  chat: MessageCircle,
  'stock:low': TriangleAlert,
  'stock:expiring': TriangleAlert,
  admin: Bell,
  general: Bell,
};

function timeAgo(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ');
}

export default function NotificationsScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<AppNotification[]>('/notifications?limit=100');
      return res.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const data = n.data ?? {};
    const kind = typeof data.kind === 'string' ? data.kind : 'general';
    const orderId = typeof data.orderId === 'string' ? data.orderId : undefined;
    const deepLink = typeof data.deepLink === 'string' ? data.deepLink : undefined;
    const forSeller = data.forSeller === true;

    if (deepLink && deepLink !== '/notifications') {
      router.push(deepLink as Parameters<typeof router.push>[0]);
    } else if (kind === 'chat' && orderId) {
      router.push(`/chat/${orderId}` as Parameters<typeof router.push>[0]);
    } else if (kind.startsWith('order') && forSeller && orderId) {
      router.push(`/seller/order/${orderId}` as Parameters<typeof router.push>[0]);
    } else if (kind.startsWith('order') && orderId) {
      router.push(`/orders/${orderId}` as Parameters<typeof router.push>[0]);
    } else {
      router.push(`/notification/${n.id}` as Parameters<typeof router.push>[0]);
    }
  };

  const items = listQuery.data ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const { colors: activeColors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: activeColors.bg.canvas }} edges={['bottom']}>
      {hasUnread ? (
        <Pressable
          style={[styles.markAllBtn, { backgroundColor: activeColors.brand.primarySurface }]}
          onPress={() => markAll.mutate()}
        >
          <CheckCheck size={16} color={activeColors.brand.primary} strokeWidth={2.3} />
          <Text style={[styles.markAllText, { color: activeColors.brand.primary }]}>{tr('notifications.markAllRead')}</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isFetching && !listQuery.isLoading}
            onRefresh={() => {
              void listQuery.refetch();
            }}
            tintColor={activeColors.brand.primary}
            colors={[activeColors.brand.primary]}
          />
        }
        ListEmptyComponent={
          listQuery.isLoading ? (
            <ActivityIndicator color={activeColors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={Bell} title={tr('notifications.empty.title')} description={tr('notifications.empty.desc')} />
          )
        }
        renderItem={({ item }) => {
          const Icon = ICON[item.kind] ?? Bell;
          const imageUrl = typeof item.data?.imageUrl === 'string' ? item.data.imageUrl : undefined;
          return (
            <Pressable
              style={[
                styles.row,
                {
                  backgroundColor: item.isRead ? activeColors.bg.surface : activeColors.brand.primarySurface,
                  borderColor: item.isRead ? activeColors.border.subtle : activeColors.brand.primaryBorder,
                },
              ]}
              onPress={() => open(item)}
            >
              {imageUrl ? (
                <Image source={{ uri: resolveMedia(imageUrl) }} style={styles.thumb} />
              ) : (
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: item.isRead ? activeColors.bg.surfaceMuted : activeColors.bg.surface,
                    },
                  ]}
                >
                  <Icon size={18} color={item.isRead ? activeColors.text.secondary : activeColors.brand.primary} strokeWidth={2.2} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: activeColors.text.primary }, !item.isRead && styles.titleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.body, { color: activeColors.text.secondary }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={[styles.time, { color: activeColors.text.tertiary }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead ? <View style={[styles.dot, { backgroundColor: activeColors.brand.primary }]} /> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brand.primarySurface,
  },
  markAllText: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  list: { padding: layout.screenPadding, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  rowUnread: { borderColor: colors.brand.primaryBorder, backgroundColor: colors.brand.primarySurface },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: colors.bg.surface },
  title: { ...typography.bodySmall, fontWeight: '600', color: colors.text.primary },
  titleUnread: { fontWeight: '800' },
  body: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  time: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.brand.primary },
  thumb: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg.surfaceMuted },
});
