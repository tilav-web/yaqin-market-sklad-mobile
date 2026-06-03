import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Layers, RotateCcw, Settings2, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { InventoryMovement, MovementType, SellerVariant, StockBatch } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly variant: SellerVariant | null;
  readonly onClose: () => void;
}

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function fmtDate(iso: string): string {
  // YYYY-MM-DD HH:MM
  return iso.slice(0, 16).replace('T', ' ');
}

const MOVE_META: Record<MovementType, { label: string; color: string; icon: typeof ArrowUpRight; sign: string }> = {
  in: { label: 'Kirim', color: colors.feedback.success, icon: ArrowDownLeft, sign: '+' },
  sold: { label: 'Sotildi', color: colors.brand.primary, icon: ArrowUpRight, sign: '−' },
  returned: { label: 'Qaytdi', color: colors.feedback.warning, icon: RotateCcw, sign: '+' },
  expired: { label: 'Muddati o\'tdi', color: colors.text.danger, icon: ArrowUpRight, sign: '−' },
  adjusted: { label: 'Tuzatish', color: colors.text.secondary, icon: Settings2, sign: '±' },
};

/** Read-only view of a variant's FIFO lots + recent stock movements. */
export function StockHistoryModal({ visible, shopId, variant, onClose }: Props) {
  const variantId = variant?.id;

  const batchesQuery = useQuery({
    queryKey: ['batches', variantId],
    enabled: visible && !!variantId,
    queryFn: async () => {
      const res = await api.get<StockBatch[]>(`/seller/shops/${shopId}/products/variants/${variantId}/batches`);
      return res.data;
    },
  });

  const movementsQuery = useQuery({
    queryKey: ['movements', variantId],
    enabled: visible && !!variantId,
    queryFn: async () => {
      const res = await api.get<InventoryMovement[]>(`/seller/shops/${shopId}/products/variants/${variantId}/movements`);
      return res.data;
    },
  });

  const activeBatches = (batchesQuery.data ?? []).filter((b) => b.quantityRemaining > 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {variant?.name ?? 'Sklad jurnali'}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Cost summary */}
          {variant ? (
            <View style={styles.summary}>
              <Cell k="Qoldiq" v={`${variant.stock} ta`} />
              <Cell k="O'rtacha tannarx" v={`${fmt(variant.cost.avgCost)}`} />
              <Cell k="Ombor qiymati" v={`${fmt(variant.cost.stockValue)}`} />
            </View>
          ) : null}

          {/* FIFO lots */}
          <View style={styles.sectionHead}>
            <Layers size={15} color={colors.brand.primary} strokeWidth={2.2} />
            <Text style={styles.sectionTitle}>Partiyalar (qolgan)</Text>
          </View>
          {batchesQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 16 }} />
          ) : activeBatches.length === 0 ? (
            <Text style={styles.dim}>Qolgan partiya yo&apos;q</Text>
          ) : (
            activeBatches.map((b) => (
              <View key={b.id} style={styles.batchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchQty}>
                    {b.quantityRemaining} / {b.quantityReceived} ta
                    {b.isReturn ? '  · qaytgan' : ''}
                  </Text>
                  <Text style={styles.batchMeta}>
                    Tannarx {fmt(b.costPrice)} so&apos;m · {fmtDate(b.receivedAt)}
                    {b.expiryDate ? ` · muddat ${b.expiryDate.slice(0, 10)}` : ''}
                    {b.supplierName ? ` · ${b.supplierName}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Movement ledger */}
          <View style={[styles.sectionHead, { marginTop: spacing.lg }]}>
            <ArrowUpRight size={15} color={colors.brand.primary} strokeWidth={2.2} />
            <Text style={styles.sectionTitle}>Harakatlar tarixi</Text>
          </View>
          {movementsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 16 }} />
          ) : (movementsQuery.data ?? []).length === 0 ? (
            <Text style={styles.dim}>Harakat yo&apos;q</Text>
          ) : (
            (movementsQuery.data ?? []).map((m) => {
              const meta = MOVE_META[m.type];
              const Icon = meta.icon;
              return (
                <View key={m.id} style={styles.moveRow}>
                  <View style={[styles.moveIcon, { backgroundColor: meta.color + '22' }]}>
                    <Icon size={15} color={meta.color} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moveLabel}>
                      {meta.label}
                      {m.reason ? <Text style={styles.moveReason}> · {m.reason}</Text> : null}
                    </Text>
                    <Text style={styles.moveMeta}>
                      {fmtDate(m.createdAt)} · {m.beforeStock} → {m.afterStock} ta
                    </Text>
                  </View>
                  <Text style={[styles.moveQty, { color: meta.color }]}>
                    {meta.sign}
                    {m.quantity}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellV}>{v}</Text>
      <Text style={styles.cellK}>{k}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.h4, color: colors.text.primary, flex: 1, marginRight: spacing.md },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: layout.screenPadding, paddingBottom: spacing['3xl'] },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  cell: { flex: 1, alignItems: 'center', gap: 2 },
  cellV: { ...typography.bodyStrong, color: colors.text.primary },
  cellK: { ...typography.caption, color: colors.text.secondary },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitle: { ...typography.overline, color: colors.brand.primary },
  dim: { ...typography.bodySmall, color: colors.text.tertiary, marginBottom: spacing.sm },
  batchRow: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  batchQty: { ...typography.bodyStrong, color: colors.text.primary },
  batchMeta: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  moveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  moveIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveLabel: { ...typography.bodySmall, fontWeight: '700', color: colors.text.primary },
  moveReason: { ...typography.caption, fontWeight: '400', color: colors.text.secondary },
  moveMeta: { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  moveQty: { ...typography.bodyStrong, fontWeight: '800' },
});
