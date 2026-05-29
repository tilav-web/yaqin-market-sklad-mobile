import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Minus, Plus, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { Order } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Courier/seller marks which items the customer is sending back at hand-off,
 * before cash is paid. The order total is recomputed server-side. Only the
 * shop side reaches this screen (server authorizes via orders.update_status).
 */
export default function SellerReturnScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, number>>({});

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${orderId}`);
      return res.data;
    },
    enabled: !!orderId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const items = Object.entries(draft)
        .filter(([, qty]) => qty > 0)
        .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
      const res = await api.post<Order>(`/orders/${orderId}/return`, { items });
      return res.data;
    },
    onSuccess: (o) => {
      qc.setQueryData?.(['order', orderId], o);
      qc.invalidateQueries({ queryKey: ['order', orderId] });
      qc.invalidateQueries({ queryKey: ['seller-orders'] });
      toast.success('Qaytarish belgilandi');
      router.back();
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const order = orderQuery.data;

  if (orderQuery.isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const returnTotal = Object.entries(draft).reduce((sum, [itemId, qty]) => {
    const it = order.items.find((i) => i.id === itemId);
    return sum + (it ? it.unitPrice * qty : 0);
  }, 0);
  const newTotal = Math.max(0, order.total - returnTotal);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <RotateCcw size={18} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text style={styles.bannerText}>
            Mijoz qaytaradigan mahsulotlarni belgilang. Mijoz faqat qolganига to‘laydi.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>#{order.orderNumber} — mahsulotlar</Text>
          {order.items.map((it) => {
            const remaining = it.quantity - it.returnedQuantity;
            const qty = draft[it.id] ?? 0;
            return (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.productName}</Text>
                  <Text style={styles.itemQty}>
                    {it.quantity} × {it.unitPrice.toLocaleString()} so‘m
                    {it.returnedQuantity > 0 ? ` · ${it.returnedQuantity} qaytarilgan` : ''}
                  </Text>
                </View>
                {remaining > 0 ? (
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        haptics.light();
                        setDraft((d) => ({ ...d, [it.id]: Math.max(0, qty - 1) }));
                      }}>
                      <Minus size={16} color={colors.brand.primary} strokeWidth={3} />
                    </Pressable>
                    <Text style={styles.stepValue}>{qty}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => {
                        haptics.light();
                        setDraft((d) => ({ ...d, [it.id]: Math.min(remaining, qty + 1) }));
                      }}>
                      <Plus size={16} color={colors.brand.primary} strokeWidth={3} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.allReturned}>Hammasi qaytarilgan</Text>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Qaytariladi</Text>
            <Text style={styles.rowValue}>−{returnTotal.toLocaleString()} so‘m</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabelBold}>Mijoz to‘laydi</Text>
            <Text style={styles.rowValueBold}>{newTotal.toLocaleString()} so‘m</Text>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <Pressable
          style={[styles.confirmBtn, returnTotal === 0 && styles.confirmBtnDisabled]}
          disabled={returnTotal === 0 || submit.isPending}
          onPress={() => submit.mutate()}>
          {submit.isPending ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.confirmBtnText}>
              {returnTotal === 0 ? 'Mahsulot tanlang' : 'Qaytarishni tasdiqlash'}
            </Text>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['4xl'] },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.feedback.warningSurface,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  bannerText: { ...typography.bodySmall, color: colors.text.primary, flex: 1, fontWeight: '600' },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: { ...typography.overline, color: colors.text.tertiary, marginBottom: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  itemName: { ...typography.bodyStrong, fontSize: 14 },
  itemQty: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primarySurface,
    borderRadius: radius.full,
    paddingHorizontal: 4,
  },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepValue: { ...typography.bodyStrong, color: colors.brand.primary, minWidth: 22, textAlign: 'center' },
  allReturned: { ...typography.caption, color: colors.text.tertiary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowValue: { ...typography.body, fontWeight: '600', color: colors.feedback.warning },
  rowLabelBold: { ...typography.body, fontWeight: '700' },
  rowValueBold: { ...typography.h3, color: colors.brand.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.xs },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.bg.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    ...shadow.lg,
  },
  confirmBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { backgroundColor: colors.text.hint },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
});
