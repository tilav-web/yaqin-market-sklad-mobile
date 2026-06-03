import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@/lib/api';
import { colors, radius, typography } from '@/theme';

/** Bell button with an unread-count badge; opens the notifications inbox. */
export function NotificationBell({ color = colors.text.primary }: { readonly color?: string }) {
  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const res = await api.get<{ count: number }>('/notifications/unread-count');
      return res.data.count;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const count = unreadQuery.data ?? 0;

  return (
    <Pressable style={styles.btn} onPress={() => router.push('/notifications')} hitSlop={8}>
      <Bell size={22} color={color} strokeWidth={2.2} />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: colors.brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.caption, fontSize: 10, fontWeight: '800', color: colors.text.onPrimary },
});
