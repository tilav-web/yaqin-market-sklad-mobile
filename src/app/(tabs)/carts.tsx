import { router } from 'expo-router';
import { ChevronRight, ShoppingCart, Store, Trash2 } from 'lucide-react-native';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resolveMedia } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { EmptyState } from '@/components/ui';
import { useCartStore } from '@/stores/cart';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function CartsTab() {
  const carts = useCartStore((s) => s.carts);
  const clearShop = useCartStore((s) => s.clearShop);
  const requireAuth = useRequireAuth();
  const entries = Object.entries(carts).filter(([, lines]) => lines.length > 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Savatlar</Text>
        {entries.length > 0 && (
          <Text style={styles.subtitle}>{entries.length} ta do‘kon</Text>
        )}
      </View>

      {entries.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Savatlaringiz bo‘sh"
          description="Har bir do‘kondan tanlagan mahsulotlaringiz alohida savatga yig‘iladi"
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={([shopId]) => shopId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: [shopId, lines] }) => {
            const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
            const count = lines.reduce((sum, l) => sum + l.quantity, 0);
            const shopName = lines[0]?.shopName ?? 'Do‘kon';
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.shopChip}>
                    <Store size={15} color={colors.brand.primary} strokeWidth={2.4} />
                    <Text style={styles.shopName} numberOfLines={1}>
                      {shopName}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      haptics.warning();
                      clearShop(shopId);
                    }}>
                    <Trash2 size={18} color={colors.text.hint} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View style={styles.thumbs}>
                  {lines.slice(0, 5).map((line) => (
                    <View key={line.variantId} style={styles.thumb}>
                      {line.photoUrl ? (
                        <Image source={{ uri: resolveMedia(line.photoUrl) }} style={styles.thumbImg} />
                      ) : (
                        <View style={[styles.thumbImg, styles.thumbPlaceholder]} />
                      )}
                    </View>
                  ))}
                  {lines.length > 5 && (
                    <View style={[styles.thumb, styles.thumbMore]}>
                      <Text style={styles.thumbMoreText}>+{lines.length - 5}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.metaText}>{count} ta mahsulot</Text>
                    <Text style={styles.total}>{total.toLocaleString()} so‘m</Text>
                  </View>
                  <Pressable
                    style={styles.proceedBtn}
                    onPress={() => {
                      haptics.selection();
                      requireAuth(() => router.push(`/shop/${shopId}/checkout`));
                    }}>
                    <Text style={styles.proceedText}>Buyurtma berish</Text>
                    <ChevronRight size={16} color={colors.text.onPrimary} strokeWidth={2.6} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { ...typography.h2 },
  subtitle: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  list: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing['3xl'], gap: spacing.md },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.xs,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shopChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  shopName: { ...typography.h4, flex: 1 },
  thumbs: { flexDirection: 'row', gap: spacing.sm },
  thumb: { width: 52, height: 52, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.bg.surfaceMuted },
  thumbImg: { width: '100%', height: '100%' },
  thumbPlaceholder: { backgroundColor: colors.brand.primarySurface },
  thumbMore: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.surfaceMuted },
  thumbMoreText: { ...typography.bodyStrong, color: colors.text.secondary },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  metaText: { ...typography.caption, color: colors.text.secondary },
  total: { ...typography.h3, color: colors.brand.primary, marginTop: 2 },
  proceedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing.lg,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
  },
  proceedText: { ...typography.buttonSmall, color: colors.text.onPrimary },
});
