import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell, CheckCheck, MessageCircle, Package, ShoppingBag, TriangleAlert } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { AppNotification } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

const ICON: Record<string, typeof Bell> = {
  'order:new': ShoppingBag,
  'order:updated': Package,
  'order:assigned': Package,
  'order:auto_cancelled': TriangleAlert,
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

  // Tap routing: open the relevant screen based on the notification payload.
  const open = (n: AppNotification) => {
    if (!n.isRead) markRead.mutate(n.id);
    const kind = n.kind;
    const orderId = typeof n.data?.orderId === 'string' ? n.data.orderId : undefined;
    const shopId = typeof n.data?.shopId === 'string' ? n.data.shopId : undefined;
    if (kind === 'chat' && orderId) router.push(`/chat/${orderId}`);
    else if (kind.startsWith('order') && shopId) router.push(`/seller/order/${orderId ?? ''}`);
    else if (kind.startsWith('order') && orderId) router.push(`/orders/${orderId}`);
  };

  const items = listQuery.data ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {hasUnread ? (
        <Pressable style={styles.markAllBtn} onPress={() => markAll.mutate()}>
          <CheckCheck size={16} color={colors.brand.primary} strokeWidth={2.3} />
          <Text style={styles.markAllText}>Hammasini o‘qilgan deb belgilash</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          listQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={Bell} title="Bildirishnoma yo‘q" description="Yangi bildirishnomalar shu yerda ko‘rinadi" />
          )
        }
        renderItem={({ item }) => {
          const Icon = ICON[item.kind] ?? Bell;
          return (
            <Pressable style={[styles.row, !item.isRead && styles.rowUnread]} onPress={() => open(item)}>
              <View style={[styles.iconWrap, !item.isRead && styles.iconWrapUnread]}>
                <Icon size={18} color={item.isRead ? colors.text.secondary : colors.brand.primary} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead ? <View style={styles.dot} /> : null}
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
});
