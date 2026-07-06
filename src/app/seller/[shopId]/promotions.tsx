import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGlobalSearchParams } from 'expo-router';
import { CalendarDays, Plus, Tag } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { OwnerOnlyNotice } from '@/components/seller/OwnerOnlyNotice';
import { DatePickerModal } from '@/components/ui';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { useIsShopOwner } from '@/lib/useIsShopOwner';
import { Category, Promotion } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';

type PromType = 'product_discount' | 'category_discount' | 'free_delivery';
type DiscountType = 'percent' | 'fixed';

const TYPE_LABELS: Record<PromType, string> = {
  product_discount: 'Mahsulot chegirmasi',
  category_discount: 'Kategoriya chegirmasi',
  free_delivery: 'Bepul yetkazib berish',
};

function fmt(n: number) {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PromotionsScreen() {
  const { shopId } = useGlobalSearchParams<{ shopId: string }>();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'active' | 'scheduled' | 'ended'>('active');
  const [createOpen, setCreateOpen] = useState(false);
  // The client has no UI yet to grant staff a promotions permission (see
  // constants/staffPermissions.ts — the group doesn't exist there even though
  // the server model supports it), so in practice this is owner-only today.
  const isOwner = useIsShopOwner(shopId);

  const promoQuery = useQuery({
    queryKey: ['promotions', shopId, filter],
    enabled: isOwner !== false,
    queryFn: async () => {
      const res = await api.get<Promotion[]>(`/seller/shops/${shopId}/promotions`, {
        params: { status: filter },
      });
      return res.data;
    },
    staleTime: 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get<Category[]>('/categories');
      return res.data;
    },
    staleTime: 5 * 60_000,
  });

  const stop = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/seller/shops/${shopId}/promotions/${id}/stop`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions', shopId] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const items = promoQuery.data ?? [];
  const FILTERS = [
    { key: 'active' as const, label: 'Aktiv' },
    { key: 'scheduled' as const, label: 'Rejalashtirilgan' },
    { key: 'ended' as const, label: 'Tugagan' },
  ];

  if (isOwner === false) {
    return <OwnerOnlyNotice />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.segments}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.segment, filter === f.key && styles.segmentActive]}>
            <Text style={[styles.segmentText, filter === f.key && styles.segmentTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {promoQuery.isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Tag size={28} color={colors.brand.primary} strokeWidth={1.8} />
              </View>
              <Text style={styles.emptyTitle}>Aksiya yo'q</Text>
              <Text style={styles.emptyDesc}>Pastdagi tugma orqali aksiya yarating</Text>
            </View>
          }
          renderItem={({ item }) => {
            const discount =
              item.discountType === 'percent'
                ? `${item.discountValue}%`
                : item.discountType === 'fixed'
                ? `${fmt(item.discountValue ?? 0)} so'm`
                : null;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <View style={[styles.typeBadge, !item.isActive && styles.typeBadgeInactive]}>
                    <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.type]}</Text>
                  </View>
                </View>
                {discount ? (
                  <Text style={styles.discountText}>Chegirma: {discount}</Text>
                ) : item.freeDeliveryMinAmount ? (
                  <Text style={styles.discountText}>
                    {fmt(item.freeDeliveryMinAmount)} so'mdan bepul yetkazish
                  </Text>
                ) : null}
                <Text style={styles.dateText}>
                  {dateLabel(item.startAt)} — {item.endAt ? dateLabel(item.endAt) : 'Muddatsiz'}
                </Text>
                {item.isActive && (
                  <Pressable
                    style={styles.stopBtn}
                    onPress={() =>
                      Alert.alert("Aksiyani to'xtatish", "Aksiya to'xtatilsinmi?", [
                        { text: "Yo'q", style: 'cancel' },
                        { text: "To'xtatish", style: 'destructive', onPress: () => stop.mutate(item.id) },
                      ])
                    }>
                    <Text style={styles.stopBtnText}>To'xtatish</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setCreateOpen(true)}>
        <Plus size={20} color={colors.text.onPrimary} strokeWidth={2.8} />
        <Text style={styles.fabText}>Aksiya</Text>
      </Pressable>

      <CreatePromotionModal
        visible={createOpen}
        shopId={shopId}
        categories={categoriesQuery.data ?? []}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ['promotions', shopId] });
        }}
      />
    </SafeAreaView>
  );
}

function CreatePromotionModal({
  visible,
  shopId,
  categories,
  onClose,
  onCreated,
}: {
  visible: boolean;
  shopId: string;
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PromType>('product_discount');
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [freeMinAmount, setFreeMinAmount] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [hasEndDate, setHasEndDate] = useState(true);
  const [pickingDate, setPickingDate] = useState<'start' | 'end' | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name, type, startAt };
      if (hasEndDate && endAt) payload.endAt = endAt;
      if (type !== 'free_delivery') {
        payload.discountType = discountType;
        // Percent discounts may legitimately use a decimal point (12.5%) —
        // only fixed so'm amounts are displayed/entered as whole numbers
        // grouped by spaces, where a "." is virtually always a mis-typed
        // thousands separator (e.g. "50.000" meaning 50 000 so'm).
        payload.discountValue = discountType === 'fixed' ? parseAmount(discountValue) : parseFloat(discountValue);
      }
      if (type === 'free_delivery' && freeMinAmount) {
        payload.freeDeliveryMinAmount = parseAmount(freeMinAmount);
      }
      await api.post(`/seller/shops/${shopId}/promotions`, payload);
    },
    onSuccess: onCreated,
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const reset = () => {
    setName(''); setType('product_discount'); setDiscountType('percent');
    setDiscountValue(''); setFreeMinAmount(''); setStartAt(''); setEndAt(''); setHasEndDate(true);
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Yangi aksiya</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Nomi</Text>
            <TextInput style={styles.textField} value={name} onChangeText={setName} placeholder="Masalan: Yozgi chegirma" placeholderTextColor={colors.text.hint} />

            <Text style={styles.fieldLabel}>Turi</Text>
            {(['product_discount', 'category_discount', 'free_delivery'] as PromType[]).map((t) => (
              <Pressable key={t} style={[styles.radioRow, type === t && styles.radioRowActive]} onPress={() => setType(t)}>
                <View style={[styles.radio, type === t && styles.radioActive]} />
                <Text style={styles.radioLabel}>{TYPE_LABELS[t]}</Text>
              </Pressable>
            ))}

            {type !== 'free_delivery' && (
              <>
                <Text style={styles.fieldLabel}>Chegirma turi</Text>
                <View style={styles.row2}>
                  {(['percent', 'fixed'] as DiscountType[]).map((dt) => (
                    <Pressable key={dt} style={[styles.chip, discountType === dt && styles.chipActive]} onPress={() => setDiscountType(dt)}>
                      <Text style={[styles.chipText, discountType === dt && styles.chipTextActive]}>
                        {dt === 'percent' ? 'Foiz (%)' : "Miqdor (so'm)"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={styles.textField}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  placeholder={discountType === 'percent' ? '10' : '5000'}
                  placeholderTextColor={colors.text.hint}
                />
              </>
            )}

            {type === 'free_delivery' && (
              <>
                <Text style={styles.fieldLabel}>Minimal buyurtma (so'm)</Text>
                <TextInput style={styles.textField} value={freeMinAmount} onChangeText={setFreeMinAmount} keyboardType="numeric" placeholder="50000" placeholderTextColor={colors.text.hint} />
              </>
            )}

            <Text style={styles.fieldLabel}>Boshlanish sanasi</Text>
            <Pressable style={styles.dateField} onPress={() => setPickingDate('start')}>
              <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
              <Text style={[styles.dateFieldText, !startAt && styles.dateFieldPlaceholder]}>
                {startAt || 'Sanani tanlang'}
              </Text>
            </Pressable>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Tugash sanasi bor</Text>
              <Switch value={hasEndDate} onValueChange={setHasEndDate} trackColor={{ true: colors.brand.primary }} />
            </View>
            {hasEndDate && (
              <Pressable style={styles.dateField} onPress={() => setPickingDate('end')}>
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text style={[styles.dateFieldText, !endAt && styles.dateFieldPlaceholder]}>
                  {endAt || 'Sanani tanlang'}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.confirmBtn, create.isPending && { opacity: 0.6 }]}
              onPress={() => create.mutate()}
              disabled={create.isPending}>
              {create.isPending ? (
                <ActivityIndicator color={colors.text.onPrimary} />
              ) : (
                <Text style={styles.confirmBtnText}>Yaratish</Text>
              )}
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Bekor qilish</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <DatePickerModal
        visible={pickingDate !== null}
        value={pickingDate === 'start' ? startAt : endAt}
        title={pickingDate === 'start' ? 'Boshlanish sanasi' : 'Tugash sanasi'}
        onClose={() => setPickingDate(null)}
        onConfirm={(iso) => {
          if (pickingDate === 'start') setStartAt(iso);
          else setEndAt(iso);
          setPickingDate(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  segments: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  segmentText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  segmentTextActive: { color: colors.text.onPrimary },
  list: { padding: layout.screenPadding, paddingBottom: 96, gap: spacing.md },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  cardName: { ...typography.bodyStrong, color: colors.text.primary, flex: 1 },
  typeBadge: { backgroundColor: colors.brand.primarySurface, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  typeBadgeInactive: { backgroundColor: colors.bg.surfaceMuted },
  typeBadgeText: { ...typography.caption, fontSize: 10, color: colors.brand.primary, fontWeight: '700' },
  discountText: { ...typography.body, color: colors.text.primary },
  dateText: { ...typography.caption, color: colors.text.secondary },
  stopBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.dangerSurface,
  },
  stopBtnText: { ...typography.caption, color: colors.feedback.danger, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80, gap: spacing.md },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.h4, color: colors.text.primary },
  emptyDesc: { ...typography.bodySmall, color: colors.text.secondary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primary,
    ...shadow.lg,
  },
  fabText: { ...typography.body, fontWeight: '800', color: colors.text.onPrimary },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '90%',
    gap: spacing.sm,
  },
  sheetTitle: { ...typography.h3, color: colors.text.primary, marginBottom: spacing.sm },
  fieldLabel: { ...typography.caption, fontWeight: '700', color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.sm },
  textField: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surfaceMuted,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bg.surfaceMuted,
  },
  dateFieldText: { ...typography.body, color: colors.text.primary },
  dateFieldPlaceholder: { color: colors.text.hint },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  radioRowActive: { backgroundColor: colors.brand.primarySurface },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
  },
  radioActive: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primary },
  radioLabel: { ...typography.body, color: colors.text.primary },
  row2: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.brand.primary, borderColor: colors.brand.primary },
  chipText: { ...typography.caption, fontWeight: '700', color: colors.text.secondary },
  chipTextActive: { color: colors.text.onPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  confirmBtnText: { ...typography.button, color: colors.text.onPrimary },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  cancelBtnText: { ...typography.body, color: colors.text.secondary },
});
