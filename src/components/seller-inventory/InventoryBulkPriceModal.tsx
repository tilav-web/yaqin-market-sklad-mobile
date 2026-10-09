import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Category } from '@/lib/types';
import { colors, radius, spacing, typography } from '@/theme';

interface InventoryBulkPriceModalProps {
  visible: boolean;
  shopId: string;
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
}

export function InventoryBulkPriceModal({
  visible,
  shopId,
  categories,
  onClose,
  onDone,
}: InventoryBulkPriceModalProps) {
  const [categoryId, setCategoryId] = useState('');
  const [adjustType, setAdjustType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');

  const bulk = useMutation({
    mutationFn: async () => {
      await api.put(`/seller/shops/${shopId}/products/variants/bulk-price`, {
        categoryId: categoryId || undefined,
        adjustType,
        value: parseFloat(value),
      });
    },
    onSuccess: onDone,
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const reset = () => {
    setCategoryId('');
    setAdjustType('percent');
    setValue('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{tr('inv.bulkTitle')}</Text>
          <Text style={styles.sheetSub}>{tr('inv.bulkSub')}</Text>

          <Text style={styles.fieldLabel}>{tr('inv.bulkCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Pressable
                style={[styles.catChip, !categoryId && styles.catChipActive]}
                onPress={() => setCategoryId('')}
              >
                <Text style={[styles.catChipText, !categoryId && styles.catChipTextActive]}>
                  {tr('inv.tabAll')}
                </Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>
                    {c.nameUzLatn}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>{tr('inv.bulkAdjustType')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
            {(['percent', 'fixed'] as const).map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.catChip,
                  adjustType === t && styles.catChipActive,
                  { flex: 1, alignItems: 'center' },
                ]}
                onPress={() => setAdjustType(t)}
              >
                <Text style={[styles.catChipText, adjustType === t && styles.catChipTextActive]}>
                  {t === 'percent' ? tr('inv.bulkPercent') : tr('inv.bulkFixed')}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.priceInput}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder={adjustType === 'percent' ? tr('inv.bulkPercentPh') : tr('inv.bulkFixedPh')}
            placeholderTextColor={colors.text.hint}
          />

          <Pressable
            style={[styles.confirmBtn, bulk.isPending && { opacity: 0.6 }]}
            onPress={() => bulk.mutate()}
            disabled={bulk.isPending || !value}
          >
            {bulk.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text style={styles.confirmBtnText}>{tr('inv.bulkSubmit')}</Text>
            )}
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>{tr('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  sheetSub: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  fieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.surface,
  },
  catChipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  catChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  catChipTextActive: {
    color: colors.text.onPrimary,
  },
  priceInput: {
    ...typography.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bg.surfaceMuted,
  },
  confirmBtn: {
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  confirmBtnText: {
    ...typography.button,
    color: colors.text.onPrimary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
