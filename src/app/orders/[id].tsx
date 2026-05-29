import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { Check, MessageCircle, RotateCcw, Star, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useToast } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { Order, OrderStatus, STATUS_LABEL_UZ } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

const FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'delivering', 'delivered'];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();

  const [reasonDraft, setReasonDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState<Record<string, string>>({});

  const orderQuery = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      // Stop polling once the order reaches a terminal state.
      return s === 'delivered' || s === 'cancelled' ? false : 8000;
    },
  });

  const order = orderQuery.data;

  const setStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const res = await api.patch<Order>(`/orders/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitReason = useMutation({
    mutationFn: async () => {
      const res = await api.post<Order>(`/orders/${id}/return-reason`, {
        reason: reasonDraft.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Rahmat, sabab saqlandi');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const submitReviews = useMutation({
    mutationFn: async () => {
      const items = Object.entries(ratingDraft)
        .filter(([, stars]) => stars > 0)
        .map(([productVariantId, stars]) => ({
          productVariantId,
          stars,
          text: reviewText[productVariantId]?.trim() || undefined,
        }));
      const res = await api.post(`/orders/${id}/reviews`, { items });
      return res.data;
    },
    onSuccess: () => {
      setRatingDraft({});
      setReviewText({});
      qc.invalidateQueries({ queryKey: ['order', id] });
      toast.success('Baho uchun rahmat!');
    },
    onError: (e) => toast.error(extractErrorMessage(e)),
  });

  const reviewed = useMemo(
    () => new Set(order?.reviewedVariantIds ?? []),
    [order?.reviewedVariantIds],
  );

  if (orderQuery.isLoading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand.primary} />
      </View>
    );
  }

  const canReview = order.status === 'delivered';
  const hasReturns = order.items.some((i) => i.returnedQuantity > 0);
  const unreviewed = canReview ? order.items.filter((i) => !reviewed.has(i.productVariantId)) : [];
  const pendingRatings = Object.values(ratingDraft).filter((s) => s > 0).length;

  const statusColor = colors.status[order.status];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{STATUS_LABEL_UZ[order.status]}</Text>
          </View>
        </View>

        {order.status !== 'cancelled' && (
          <Pressable style={styles.chatBtn} onPress={() => router.push(`/chat/${order.id}`)}>
            <MessageCircle size={18} color={colors.brand.primary} strokeWidth={2.4} />
            <Text style={styles.chatBtnText}>Sotuvchi bilan bog‘lanish</Text>
          </Pressable>
        )}

        {/* Timeline */}
        {order.status !== 'cancelled' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bosqichlar</Text>
            {FLOW.map((s, idx) => {
              const event = order.timeline.find((e) => e.status === s);
              const active = event !== undefined;
              const isLast = idx === FLOW.length - 1;
              return (
                <View key={s} style={styles.tlRow}>
                  <View style={styles.tlGutter}>
                    <View style={[styles.tlDot, active && styles.tlDotActive]}>
                      {active && <Check size={11} color={colors.text.onPrimary} strokeWidth={3.5} />}
                    </View>
                    {!isLast && <View style={[styles.tlLine, active && styles.tlLineActive]} />}
                  </View>
                  <View style={styles.tlBody}>
                    <Text style={[styles.tlLabel, active && styles.tlLabelActive]}>
                      {STATUS_LABEL_UZ[s]}
                    </Text>
                    {event && (
                      <Text style={styles.tlTime}>
                        {new Date(event.at).toLocaleString('uz-UZ', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mahsulotlar</Text>
          {order.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.productName}</Text>
                <Text style={styles.itemQty}>
                  {it.quantity} × {it.unitPrice.toLocaleString()} so‘m
                </Text>
                {it.returnedQuantity > 0 && (
                  <Text style={styles.returnedTag}>{it.returnedQuantity} ta qaytarilgan</Text>
                )}
              </View>
              <Text style={styles.itemTotal}>{it.lineTotal.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Return reason — optional, prompted after the courier marks returns */}
        {hasReturns && (
          <View style={styles.section}>
            <View style={styles.returnHeader}>
              <RotateCcw size={16} color={colors.feedback.warning} strokeWidth={2.4} />
              <Text style={styles.sectionTitle}>Qaytarilgan mahsulotlar</Text>
            </View>
            {order.returnReason ? (
              <Text style={styles.reasonSaved}>“{order.returnReason}”</Text>
            ) : (
              <>
                <Text style={styles.reasonHint}>
                  Nega qaytardingiz? Sabab qoldirsangiz, do‘kon yaxshilanadi (ixtiyoriy).
                </Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Masalan: pomidor chirigan edi"
                  placeholderTextColor={colors.text.hint}
                  value={reasonDraft}
                  onChangeText={setReasonDraft}
                  multiline
                />
                {reasonDraft.trim().length > 0 && (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => submitReason.mutate()}
                    disabled={submitReason.isPending}>
                    {submitReason.isPending ? (
                      <ActivityIndicator color={colors.text.onPrimary} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Sababni saqlash</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* Summary */}
        <View style={styles.section}>
          <Row label="Mahsulotlar" value={`${order.subTotal.toLocaleString()} so‘m`} />
          <Row label="Yetkazib berish" value={`${order.deliveryFee.toLocaleString()} so‘m`} />
          <Row label="Masofa" value={`${order.distanceKm.toFixed(2)} km`} />
          <View style={styles.divider} />
          <Row label="Jami" value={`${order.total.toLocaleString()} so‘m`} bold />
        </View>

        {/* Rating */}
        {canReview && unreviewed.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mahsulotlarni baholang</Text>
            {unreviewed.map((it) => (
              <View key={it.id} style={styles.rateRow}>
                <Text style={styles.rateName}>{it.productName}</Text>
                <StarPicker
                  value={ratingDraft[it.productVariantId] ?? 0}
                  onChange={(v) => {
                    haptics.selection();
                    setRatingDraft((d) => ({ ...d, [it.productVariantId]: v }));
                  }}
                />
                {(ratingDraft[it.productVariantId] ?? 0) > 0 && (
                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Izoh (ixtiyoriy)"
                    placeholderTextColor={colors.text.hint}
                    value={reviewText[it.productVariantId] ?? ''}
                    onChangeText={(t) =>
                      setReviewText((r) => ({ ...r, [it.productVariantId]: t }))
                    }
                  />
                )}
              </View>
            ))}
            {pendingRatings > 0 && (
              <Pressable
                style={styles.primaryBtn}
                onPress={() => submitReviews.mutate()}
                disabled={submitReviews.isPending}>
                {submitReviews.isPending ? (
                  <ActivityIndicator color={colors.text.onPrimary} />
                ) : (
                  <Text style={styles.primaryBtnText}>Baholarni yuborish ({pendingRatings})</Text>
                )}
              </Pressable>
            )}
          </View>
        )}

        {canReview && unreviewed.length === 0 && order.items.length > 0 && (
          <Text style={styles.allReviewed}>✓ Barcha mahsulotlar baholangan</Text>
        )}

        {/* Status actions */}
        {order.status === 'delivering' && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setStatus.mutate('delivered')}
            disabled={setStatus.isPending}>
            <Text style={styles.primaryBtnText}>Buyurtmani qabul qildim</Text>
          </Pressable>
        )}
        {(order.status === 'new' || order.status === 'accepted') && (
          <Pressable
            style={styles.ghostBtn}
            onPress={() =>
              Alert.alert('Bekor qilish', 'Buyurtmani bekor qilasizmi?', [
                { text: 'Yo‘q', style: 'cancel' },
                { text: 'Ha', style: 'destructive', onPress: () => setStatus.mutate('cancelled') },
              ])
            }
            disabled={setStatus.isPending}>
            <X size={16} color={colors.feedback.danger} strokeWidth={2.6} />
            <Text style={styles.ghostBtnText}>Bekor qilish</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function StarPicker({ value, onChange }: { readonly value: number; readonly onChange: (v: number) => void }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={4}>
          <Star
            size={28}
            color={i <= value ? colors.feedback.warning : colors.border.default}
            fill={i <= value ? colors.feedback.warning : 'transparent'}
            strokeWidth={2}
          />
        </Pressable>
      ))}
    </View>
  );
}

function Row({ label, value, bold }: { readonly label: string; readonly value: string; readonly bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.canvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.canvas },
  scroll: { padding: layout.screenPadding, gap: spacing.md, paddingBottom: spacing['4xl'] },
  headerCard: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  orderNum: { ...typography.h3 },
  statusBadge: { paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.full },
  statusText: { ...typography.caption, color: colors.text.onPrimary, fontWeight: '800' },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: colors.brand.primarySurface,
  },
  chatBtnText: { ...typography.buttonSmall, color: colors.brand.primary },
  section: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: { ...typography.overline, color: colors.text.tertiary, marginBottom: spacing.xs },
  // timeline
  tlRow: { flexDirection: 'row', gap: spacing.md },
  tlGutter: { alignItems: 'center', width: 22 },
  tlDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  tlLine: { width: 2, flex: 1, backgroundColor: colors.border.default, minHeight: 16 },
  tlLineActive: { backgroundColor: colors.brand.primary },
  tlBody: { flex: 1, paddingBottom: spacing.md },
  tlLabel: { ...typography.body, color: colors.text.tertiary },
  tlLabelActive: { color: colors.text.primary, fontWeight: '700' },
  tlTime: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  // items
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, gap: spacing.sm },
  itemName: { ...typography.bodyStrong, fontSize: 14 },
  itemQty: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  returnedTag: { ...typography.caption, color: colors.feedback.warning, fontWeight: '700', marginTop: 2 },
  itemTotal: { ...typography.priceSmall },
  returnHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reasonSaved: { ...typography.body, color: colors.text.secondary, fontStyle: 'italic' },
  reasonHint: { ...typography.bodySmall, color: colors.text.secondary },
  // summary
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowLabelBold: { color: colors.text.primary, fontWeight: '700' },
  rowValue: { ...typography.body, fontWeight: '600' },
  rowValueBold: { ...typography.h3, color: colors.brand.primary },
  divider: { height: 1, backgroundColor: colors.border.subtle, marginVertical: spacing.xs },
  // rating
  rateRow: { paddingVertical: spacing.sm, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border.subtle },
  rateName: { ...typography.bodyStrong, fontSize: 14 },
  starRow: { flexDirection: 'row', gap: spacing.xs },
  reviewInput: {
    ...typography.body,
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  allReviewed: {
    ...typography.bodySmall,
    color: colors.feedback.success,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // buttons
  primaryBtn: {
    height: layout.buttonHeight.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  primaryBtnText: { ...typography.button, color: colors.text.onPrimary },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
  },
  ghostBtnText: { ...typography.buttonSmall, color: colors.feedback.danger },
});
