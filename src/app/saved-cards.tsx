import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddCardForm } from '@/components/AddCardForm';
import { CardVisual } from '@/components/CardVisual';
import { SwipeableCard } from '@/components/SwipeableCard';
import { useTranslation } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { SavedCard } from '@/lib/types';
import { colors, layout, radius, shadow, spacing, typography } from '@/theme';
import { detectCardBrand } from '@/utils/cardBrand';
import { haptics } from '@/utils/haptics';

const DELETE_UNDO_SECONDS = 10;

export default function SavedCardsScreen() {
  const { tr } = useTranslation();
  const qc = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ card: SavedCard; secondsLeft: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardsQuery = useQuery({
    queryKey: ['saved-cards'],
    queryFn: async () => (await api.get<SavedCard[]>('/click/cards')).data,
  });
  const activeCards = (cardsQuery.data ?? []).filter((c) => c.status === 'active');

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/click/cards/${id}/default`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-cards'] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/click/cards/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-cards'] }),
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const clearPendingTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  };

  // Cancel any in-flight undo window on unmount rather than deleting behind
  // the user's back after they've navigated away from the screen.
  useEffect(() => clearPendingTimers, []);

  const startPendingDelete = (card: SavedCard) => {
    haptics.warning();
    clearPendingTimers();
    setPendingDelete({ card, secondsLeft: DELETE_UNDO_SECONDS });
    intervalRef.current = setInterval(() => {
      setPendingDelete((p) => (p ? { ...p, secondsLeft: Math.max(0, p.secondsLeft - 1) } : p));
    }, 1000);
    timeoutRef.current = setTimeout(() => {
      clearPendingTimers();
      setPendingDelete(null);
      deleteMutation.mutate(card.id);
    }, DELETE_UNDO_SECONDS * 1000);
  };

  const cancelPendingDelete = () => {
    haptics.selection();
    clearPendingTimers();
    setPendingDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={activeCards.filter((c) => c.id !== pendingDelete?.card.id)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          activeCards.length > 0 ? <Text style={styles.swipeHint}>{tr('cards.swipeHint')}</Text> : null
        }
        ListEmptyComponent={!adding ? <Text style={styles.hint}>{tr('cards.empty')}</Text> : null}
        renderItem={({ item }) => {
          const brand = detectCardBrand(item.cardNumberMasked ?? '');
          return (
            <SwipeableCard
              onDelete={() => startPendingDelete(item)}
              onMakeDefault={item.isDefault ? undefined : () => setDefaultMutation.mutate(item.id)}>
              <CardVisual
                brand={brand}
                numberText={item.cardNumberMasked ?? '•••• •••• •••• ••••'}
                label={item.label}
                fallbackLabel={tr('cards.genericName')}
                isDefault={item.isDefault}
              />
            </SwipeableCard>
          );
        }}
        ListFooterComponent={
          adding ? (
            <View style={styles.form}>
              <AddCardForm onDone={() => setAdding(false)} onCancel={() => setAdding(false)} />
            </View>
          ) : (
            <Pressable
              style={styles.addBtn}
              onPress={() => {
                haptics.selection();
                setAdding(true);
              }}>
              <Text style={styles.addBtnText}>{tr('cards.add')}</Text>
            </Pressable>
          )
        }
      />

      {pendingDelete && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>{tr('cards.deleting', { sec: pendingDelete.secondsLeft })}</Text>
          <Pressable onPress={cancelPendingDelete} hitSlop={8}>
            <Text style={styles.undoAction}>{tr('common.cancel')}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.canvas },
  list: { padding: layout.screenPadding, gap: spacing.md },
  hint: { ...typography.bodySmall, color: colors.text.secondary, marginBottom: spacing.xs },
  swipeHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  addBtn: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand.primaryBorder,
    borderStyle: 'dashed',
  },
  addBtnText: { ...typography.body, color: colors.brand.primary, fontWeight: '700' },
  form: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  undoBar: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.palette.gray900,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.lg,
  },
  undoText: { ...typography.bodySmall, color: colors.text.onDark, flex: 1, marginRight: spacing.md },
  undoAction: { ...typography.bodyStrong, color: colors.brand.primaryLight, fontWeight: '800' },
});
