import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { useCartStore } from '@/stores/cart';

export default function CartsTab() {
  const carts = useCartStore((s) => s.carts);
  const entries = Object.entries(carts);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {entries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Savatlaringiz bo&apos;sh</Text>
          <Text style={styles.dim}>
            Har bir do&apos;kondan tanlagan mahsulotlaringiz alohida savatga yig&apos;iladi
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={([shopId]) => shopId}
          contentContainerStyle={styles.list}
          renderItem={({ item: [shopId, lines] }) => {
            const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
            const shopName = lines[0]?.shopName ?? 'Do\'kon';
            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                onPress={() => router.push(`/shop/${shopId}/checkout`)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🏪 {shopName}</Text>
                  <Text style={styles.cardMeta}>{lines.length} ta mahsulot</Text>
                </View>
                <View style={styles.cardItems}>
                  {lines.slice(0, 3).map((line) => (
                    <Text key={line.variantId} style={styles.itemText} numberOfLines={1}>
                      • {line.quantity} × {line.productName}
                    </Text>
                  ))}
                  {lines.length > 3 && (
                    <Text style={styles.dim}>va yana {lines.length - 3} ta...</Text>
                  )}
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.total}>{total.toLocaleString()} so&apos;m</Text>
                  <Text style={styles.proceed}>Buyurtma berish →</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.white },
  list: { padding: Spacing.four },
  card: {
    backgroundColor: Brand.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Brand.gray100,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Brand.black },
  cardMeta: { fontSize: 13, color: Brand.gray600 },
  cardItems: { gap: 2 },
  itemText: { fontSize: 14, color: Brand.gray800 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: Brand.gray100,
  },
  total: { fontSize: 18, fontWeight: '800', color: Brand.blue },
  proceed: { color: Brand.red, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.six },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Brand.black, textAlign: 'center' },
  dim: { fontSize: 14, color: Brand.gray600, textAlign: 'center' },
});
