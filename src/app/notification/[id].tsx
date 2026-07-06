import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { AppNotification } from '@/lib/types';
import { colors, spacing, typography } from '@/theme';

function formatDate(iso: string) {
  return iso.slice(0, 16).replace('T', ' ');
}

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { tr } = useTranslation();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<AppNotification[]>('/notifications?limit=100');
      return res.data;
    },
  });

  const markRead = useMutation({
    mutationFn: async (nid: string) => {
      await api.patch(`/notifications/${nid}/read`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const notification = (query.data ?? []).find((n) => n.id === id);

  useEffect(() => {
    if (notification && !notification.isRead) {
      markRead.mutate(notification.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id]);

  if (query.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!notification) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{tr('notification.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const richBody = typeof notification.data?.richBody === 'string' ? notification.data.richBody : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.time}>{formatDate(notification.createdAt)}</Text>
        <View style={styles.divider} />
        {richBody ? (
          <RenderHtml
            contentWidth={width - spacing.md * 2}
            source={{ html: richBody }}
            tagsStyles={{
              h1: { fontSize: 22, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
              h2: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 6 },
              p: { fontSize: 15, color: colors.text.secondary, lineHeight: 22, marginBottom: 8 },
              a: { color: colors.brand.primary },
              li: { fontSize: 15, color: colors.text.secondary, lineHeight: 22 },
              img: { borderRadius: 8, marginVertical: 8 },
            }}
            systemFonts={['System', 'sans-serif']}
          />
        ) : (
          <Text style={styles.body}>{notification.body}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  content: { padding: spacing.md },
  title: { ...typography.h3, marginBottom: spacing.xs },
  time: { ...typography.caption, color: colors.text.tertiary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.md },
  body: { ...typography.body, color: colors.text.secondary, lineHeight: 22 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { ...typography.body, color: colors.text.secondary },
});
