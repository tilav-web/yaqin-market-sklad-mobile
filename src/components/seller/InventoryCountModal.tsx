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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { SellerVariant } from '@/lib/types';
import { colors } from '@/theme';

interface Props {
  readonly visible: boolean;
  readonly shopId: string;
  readonly onClose: () => void;
}

export function InventoryCountModal({ visible, shopId, onClose }: Props) {
  const qc = useQueryClient();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [stockById, setStockById] = useState<Record<string, number>>({});
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [seededData, setSeededData] = useState<SellerVariant[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const [syncedVisible, setSyncedVisible] = useState<boolean | null>(null);
  if (syncedVisible !== visible) {
    setSyncedVisible(visible);
    if (visible) {
      setCounts({});
      setStockById({});
      setSearchInput('');
      setSearch('');
      setSeededData(null);
    }
  }

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
  if (listQuery.data && listQuery.data !== seededData) {
    setSeededData(listQuery.data);
    setStockById((prev) => {
      const next = { ...prev };
      for (const v of listQuery.data) next[v.id] = v.stock;
      return next;
    });
  }

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
      Alert.alert(tr('common.saved'), tr('invCount.updatedN', { n: changedIds.length }));
      onClose();
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-bg-canvas" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border-subtle">
          <View className="flex-row items-center gap-2">
            <ClipboardCheck size={20} color={colors.brand.primary} strokeWidth={2.2} />
            <Text className="text-xl font-bold text-text-primary">{tr('invCount.title')}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center">
            <X size={20} color={colors.text.secondary} />
          </Pressable>
        </View>
        <Text className="text-xs text-text-secondary px-4 py-1.5">{tr('invCount.sub')}</Text>

        <View className="flex-row items-center gap-2 mx-4 mb-2 bg-bg-surface rounded-xl px-3 py-1 border border-border-default">
          <Search size={16} color={colors.text.tertiary} />
          <TextInput
            className="flex-1 py-1.5 text-base text-text-primary"
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={tr('invCount.searchPlaceholder')}
            placeholderTextColor={colors.text.hint}
          />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            {listQuery.isLoading ? (
              <ActivityIndicator color={colors.brand.primary} style={{ marginTop: 16 }} />
            ) : results.length === 0 ? (
              <Text className="text-sm text-text-tertiary text-center mt-4">{tr(search ? 'invCount.notFound' : 'invCount.noProducts')}</Text>
            ) : (
              results.map((v) => {
                const raw = counts[v.id] ?? '';
                const diff = raw !== '' ? Number(raw) - v.stock : 0;
                return (
                  <View key={v.id} className="flex-row items-center gap-3 bg-bg-surface rounded-xl p-3 border border-border-subtle">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
                        {v.name}
                      </Text>
                      <Text className="text-xs text-text-secondary mt-0.5">
                        {tr('invCount.inSystem', { n: v.stock })}
                        {raw !== '' && diff !== 0 ? (
                          <Text className={`font-extrabold ${diff > 0 ? 'text-feedback-success' : 'text-feedback-danger'}`}>
                            {'  '}
                            {diff > 0 ? tr('invCount.surplus', { n: diff }) : tr('invCount.shortage', { n: diff })}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <TextInput
                      className={`w-20 text-center rounded-xl py-2 text-base font-bold text-text-primary border-2 ${
                        raw !== '' && diff !== 0
                          ? 'border-brand-primary bg-brand-primary/10'
                          : 'border-border-default bg-bg-surface-muted'
                      }`}
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

        <View className="px-4 pt-3 pb-2 border-t border-border-subtle bg-bg-surface">
          <Pressable
            className={`h-12 rounded-2xl items-center justify-center ${
              changedIds.length === 0 ? 'bg-border-strong' : save.isPending ? 'bg-brand-primary opacity-60' : 'bg-brand-primary active:opacity-85'
            }`}
            disabled={changedIds.length === 0 || save.isPending}
            onPress={() => save.mutate()}>
            <Text className="text-base font-bold text-text-on-primary">
              {save.isPending ? tr('invCount.saving') : `${tr('common.save')}${changedIds.length ? ` (${changedIds.length})` : ''}`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
