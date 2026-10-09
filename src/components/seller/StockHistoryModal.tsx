import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Layers, RotateCcw, Settings2, X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation, type TranslationKey } from '@/i18n';
import { api } from '@/lib/api';
import { InventoryMovement, MovementType, SellerVariant, StockBatch } from '@/lib/types';
import { colors } from '@/theme';

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
  return iso.slice(0, 16).replace('T', ' ');
}

const MOVE_META: Record<MovementType, { labelKey: TranslationKey; color: string; icon: typeof ArrowUpRight; sign: string }> = {
  in: { labelKey: 'move.in', color: colors.feedback.success, icon: ArrowDownLeft, sign: '+' },
  sold: { labelKey: 'move.sold', color: colors.brand.primary, icon: ArrowUpRight, sign: '−' },
  returned: { labelKey: 'move.returned', color: colors.feedback.warning, icon: RotateCcw, sign: '+' },
  expired: { labelKey: 'move.expired', color: colors.feedback.danger, icon: ArrowUpRight, sign: '−' },
  adjusted: { labelKey: 'move.adjusted', color: colors.text.secondary, icon: Settings2, sign: '±' },
  damaged: { labelKey: 'move.damaged', color: colors.feedback.danger, icon: ArrowUpRight, sign: '−' },
};

export function StockHistoryModal({ visible, shopId, variant, onClose }: Props) {
  const { tr } = useTranslation();
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
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <Text className="text-xl font-bold text-text-primary flex-1 mr-4" numberOfLines={1}>
            {variant?.name ?? tr('stockHist.title')}
          </Text>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          {/* Cost summary */}
          {variant ? (
            <View className="flex-row bg-bg-surface rounded-2xl border border-border-subtle py-3 mb-4">
              <Cell k={tr('stockHist.remaining')} v={tr('stockHist.pcs', { n: variant.stock })} />
              <Cell k={tr('stockHist.avgCost')} v={`${fmt(variant.cost.avgCost)}`} />
              <Cell k={tr('stockHist.stockValue')} v={`${fmt(variant.cost.stockValue)}`} />
            </View>
          ) : null}

          {/* FIFO lots */}
          <View className="flex-row items-center gap-1.5 mb-2">
            <Layers size={15} color={colors.brand.primary} strokeWidth={2.2} />
            <Text className="text-xs uppercase tracking-wider font-bold text-brand-primary">{tr('stockHist.batches')}</Text>
          </View>
          {batchesQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 16 }} />
          ) : activeBatches.length === 0 ? (
            <Text className="text-sm text-text-tertiary mb-2">{tr('stockHist.noBatches')}</Text>
          ) : (
            activeBatches.map((b) => (
              <View key={b.id} className="bg-bg-surface rounded-xl p-3 mb-2 border border-border-subtle">
                <Text className="text-sm font-bold text-text-primary">
                  {b.quantityRemaining} / {b.quantityReceived} ta
                  {b.isReturn ? '  · qaytgan' : ''}
                </Text>
                <Text className="text-xs text-text-secondary mt-0.5">
                  Tannarx {fmt(b.costPrice)} so'm · {fmtDate(b.receivedAt)}
                  {b.expiryDate ? ` · muddat ${b.expiryDate.slice(0, 10)}` : ''}
                  {b.supplierName ? ` · ${b.supplierName}` : ''}
                </Text>
              </View>
            ))
          )}

          {/* Movement ledger */}
          <View className="flex-row items-center gap-1.5 mb-2 mt-4">
            <ArrowUpRight size={15} color={colors.brand.primary} strokeWidth={2.2} />
            <Text className="text-xs uppercase tracking-wider font-bold text-brand-primary">{tr('stockHist.movements')}</Text>
          </View>
          {movementsQuery.isLoading ? (
            <ActivityIndicator color={colors.brand.primary} style={{ marginVertical: 16 }} />
          ) : (movementsQuery.data ?? []).length === 0 ? (
            <Text className="text-sm text-text-tertiary">{tr('stockHist.noMovements')}</Text>
          ) : (
            (movementsQuery.data ?? []).map((m) => {
              const meta = MOVE_META[m.type];
              const Icon = meta.icon;
              return (
                <View key={m.id} className="flex-row items-center gap-3 py-2 border-b border-border-subtle">
                  <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: meta.color + '22' }}>
                    <Icon size={15} color={meta.color} strokeWidth={2.2} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-text-primary">
                      {tr(meta.labelKey)}
                      {m.reason ? <Text className="font-normal text-text-secondary"> · {m.reason}</Text> : null}
                    </Text>
                    <Text className="text-xs text-text-tertiary mt-0.5">
                      {fmtDate(m.createdAt)} · {m.beforeStock} → {m.afterStock} ta
                    </Text>
                  </View>
                  <Text className="text-sm font-extrabold" style={{ color: meta.color }}>
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
    <View className="flex-1 items-center gap-0.5">
      <Text className="text-sm font-bold text-text-primary">{v}</Text>
      <Text className="text-xs text-text-secondary">{k}</Text>
    </View>
  );
}
