import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, extractErrorMessage } from '@/lib/api';
import { SellerVariant } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly onClose: () => void;
}

/**
 * Inventarizatsiya: search a product, type its physically counted quantity, and
 * the server reconciles each difference through FIFO. Searching server-side
 * keeps it fast even with hundreds of products; entered counts are remembered
 * across searches and saved together.
 */
export function InventoryCountModal({ visible, shopId, onClose }: Props) {
  const qc = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [stockById, setStockById] = useState<Record<string, number>>({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset when reopened.
  useEffect(() => {
    if (visible) {
      setCounts({});
      setStockById({});
      setSearchInput('');
      setSearch('');
    }
  }, [visible]);

  const listQuery = useQuery({
    queryKey: ['count-variants', shopId, search],
    enabled: visible,
    queryFn: async () => {
      const res = await api.get<SellerVariant[]>(`/seller/shops/${shopId}/products/variants`, {
        params: { search: search || undefined, limit: 100 },
      });
      return res.data;
    },
  });

  const results = listQuery.data ?? [];
  // Remember each loaded product's system stock so saved diffs stay correct
  // even after the search changes.
  useEffect(() => {
    if (results.length === 0) return;
    setStockById((prev) => {
      const next = { ...prev };
      for (const v of results) next[v.id] = v.stock;
      return next;
    });
  }, [results]);

  const changedIds = useMemo(
    () =>
      Object.keys(counts).filter(
        (id) => counts[id] !== '' && stockById[id] !== undefined && Number(counts[id]) !== stockById[id],
      ),
    [counts, stockById],
  );

  const save = useMutation({
    mutationFn: async () => {
      for (const id of changedIds) {
        await api.post(`/seller/shops/${shopId}/products/variants/${id}/count`, {
          actualQty: Number(counts[id]),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      Alert.alert('Saqlandi', `${changedIds.length} ta mahsulot qoldig'i yangilandi`);
      onClose();
    },
    onError: (e) => Alert.alert('Xatolik', extractErrorMessage(e)),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ClipboardCheck size={20} color={colors.brand.primary} strokeWidth={2.2} />
            <Text style={styles.title}>Inventarizatsiya</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>
        <Text style={styles.sub}>Mahsulotni qidiring, real sanagan qoldiqni kiriting. Kiritilganlar eslab qolinadi.</Text>

        <View style={styles.searchBox}>
          <Search size={16} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Mahsulot nomi yoki barkod"
            placeholderTextColor={colors.text.hint}
          />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {listQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} style={{ marginTop: spacing.lg }} />
            ) : results.length === 0 ? (
              <Text style={styles.empty}>{search ? 'Topilmadi' : 'Mahsulot yo‘q'}</Text>
            ) : (
              results.map((v) => {
                const raw = counts[v.id] ?? '';
                const diff = raw !== '' ? Number(raw) - v.stock : 0;
                return (
                  <View key={v.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {v.name}
                      </Text>
                      <Text style={styles.sysStock}>
                        Tizimda: {v.stock} ta
                        {raw !== '' && diff !== 0 ? (
                          <Text style={diff > 0 ? styles.diffPlus : styles.diffMinus}>
                            {'  '}
                            {diff > 0 ? `+${diff} ortiqcha` : `${diff} kamomad`}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.input, raw !== '' && diff !== 0 && styles.inputChanged]}
                      value={raw}
                      onChangeText={(t) => setCounts((c) => ({ ...c, [v.id]: t.replace(/[^0-9]/g, '') }))}
                      keyboardType="number-pad"
                      placeholder={String(v.stock)}
                      placeholderTextColor={colors.text.hint}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, changedIds.length === 0 && styles.saveBtnDisabled]}
            disabled={changedIds.length === 0 || save.isPending}
            onPress={() => save.mutate()}>
            <Text style={styles.saveText}>
              {save.isPending ? 'Saqlanmoqda…' : `Saqlash${changedIds.length ? ` (${changedIds.length})` : ''}`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
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
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.h4, color: colors.text.primary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { ...typography.bodySmall, color: colors.text.secondary, paddingHorizontal: layout.screenPadding, marginBottom: spacing.sm },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.screenPadding,
    marginBottom: spacing.sm,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchInput: { flex: 1, paddingVertical: 10, ...typography.body, color: colors.text.primary },
  empty: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.lg },
  scroll: { padding: layout.screenPadding, gap: spacing.sm, paddingBottom: spacing['3xl'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  name: { ...typography.bodyStrong, color: colors.text.primary },
  sysStock: { ...typography.caption, color: colors.text.secondary, marginTop: 1 },
  diffPlus: { ...typography.caption, fontWeight: '800', color: colors.feedback.success },
  diffMinus: { ...typography.caption, fontWeight: '800', color: colors.text.danger },
  input: {
    width: 76,
    textAlign: 'center',
    backgroundColor: colors.bg.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: 10,
    ...typography.bodyStrong,
    color: colors.text.primary,
    borderWidth: 1.5,
    borderColor: colors.border.default,
  },
  inputChanged: { borderColor: colors.brand.primary, backgroundColor: colors.brand.primarySurface },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
  },
  saveBtn: {
    height: layout.buttonHeight.md,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.border.strong },
  saveText: { ...typography.body, fontWeight: '700', color: colors.text.onPrimary },
});
