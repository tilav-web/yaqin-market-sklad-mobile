import { useQuery } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface ShopReview {
  id: string;
  stars: number;
  text: string | null;
  createdAt: string;
  userName: string;
  productName: string;
}

function Stars({ value }: { value: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          color={i <= value ? colors.feedback.warning : colors.border.default}
          fill={i <= value ? colors.feedback.warning : 'transparent'}
          strokeWidth={2}
        />
      ))}
    </View>
  );
}

export default function SellerReviewsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();

  const reviewsQuery = useQuery({
    queryKey: ['shop-reviews', shopId],
    queryFn: async () => {
      const res = await api.get<ShopReview[]>(`/seller/shops/${shopId}/products/reviews`);
      return res.data;
    },
  });

  const items = reviewsQuery.data ?? [];
  const avg = items.length ? items.reduce((s, r) => s + r.stars, 0) / items.length : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={reviewsQuery.isFetching && !reviewsQuery.isLoading}
            onRefresh={() => {
              void reviewsQuery.refetch();
            }}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.avgValue}>{avg.toFixed(1)}</Text>
              <Stars value={Math.round(avg)} />
              <Text style={styles.avgCount}>{items.length} ta sharh</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          reviewsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState icon={Star} title="Sharh yo‘q" description="Mijozlar sharhlari shu yerda ko‘rinadi" />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Stars value={item.stars} />
              <Text style={styles.date}>{item.createdAt.slice(0, 10)}</Text>
            </View>
            <Text style={styles.product} numberOfLines={1}>
              {item.productName}
            </Text>
            {item.text ? <Text style={styles.text}>{item.text}</Text> : null}
            <Text style={styles.user}>— {item.userName}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.sm },
  summary: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  avgValue: { ...typography.h1, color: colors.text.primary },
  avgCount: { ...typography.caption, color: colors.text.secondary },
  stars: { flexDirection: 'row', gap: 2 },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 4,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { ...typography.caption, color: colors.text.tertiary },
  product: { ...typography.bodySmall, fontWeight: '700', color: colors.brand.primary },
  text: { ...typography.bodySmall, color: colors.text.primary },
  user: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
});
