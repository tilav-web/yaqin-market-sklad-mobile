import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { Category } from '@/lib/types';
import { colors } from '@/theme';

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
      <View className="flex-1 bg-black/45 justify-end">
        <View className="bg-bg-surface rounded-t-3xl p-6 gap-2">
          <Text className="text-xl font-bold text-text-primary">{tr('inv.bulkTitle')}</Text>
          <Text className="text-xs text-text-secondary">{tr('inv.bulkSub')}</Text>

          <Text className="text-xs font-bold text-text-secondary mt-2">{tr('inv.bulkCategory')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
            <View className="flex-row gap-1.5">
              <Pressable
                className={`px-4 py-2 rounded-full border ${
                  !categoryId
                    ? 'bg-brand-primary border-brand-primary'
                    : 'border-border-default bg-bg-surface'
                }`}
                onPress={() => setCategoryId('')}
              >
                <Text
                  className={`text-xs font-bold ${
                    !categoryId ? 'text-text-on-primary' : 'text-text-secondary'
                  }`}
                >
                  {tr('inv.tabAll')}
                </Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  className={`px-4 py-2 rounded-full border ${
                    categoryId === c.id
                      ? 'bg-brand-primary border-brand-primary'
                      : 'border-border-default bg-bg-surface'
                  }`}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text
                    className={`text-xs font-bold ${
                      categoryId === c.id ? 'text-text-on-primary' : 'text-text-secondary'
                    }`}
                  >
                    {c.nameUzLatn}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text className="text-xs font-bold text-text-secondary">{tr('inv.bulkAdjustType')}</Text>
          <View className="flex-row gap-3 mb-2">
            {(['percent', 'fixed'] as const).map((t) => (
              <Pressable
                key={t}
                className={`flex-1 items-center px-4 py-2 rounded-full border ${
                  adjustType === t
                    ? 'bg-brand-primary border-brand-primary'
                    : 'border-border-default bg-bg-surface'
                }`}
                onPress={() => setAdjustType(t)}
              >
                <Text
                  className={`text-xs font-bold ${
                    adjustType === t ? 'text-text-on-primary' : 'text-text-secondary'
                  }`}
                >
                  {t === 'percent' ? tr('inv.bulkPercent') : tr('inv.bulkFixed')}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            className="text-base text-text-primary border border-border-default rounded-xl px-4 py-2.5 bg-bg-surface-muted"
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            placeholder={adjustType === 'percent' ? tr('inv.bulkPercentPh') : tr('inv.bulkFixedPh')}
            placeholderTextColor={colors.text.hint}
          />

          <Pressable
            className={`h-12 rounded-2xl bg-brand-primary items-center justify-center mt-2 ${
              bulk.isPending ? 'opacity-60' : 'active:opacity-85'
            }`}
            onPress={() => bulk.mutate()}
            disabled={bulk.isPending || !value}
          >
            {bulk.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text className="text-base font-bold text-text-on-primary">{tr('inv.bulkSubmit')}</Text>
            )}
          </Pressable>
          <Pressable className="items-center py-2 active:opacity-75" onPress={handleClose}>
            <Text className="text-sm text-text-secondary">{tr('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
