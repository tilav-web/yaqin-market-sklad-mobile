import React from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { tr } from '@/i18n';
import { GlobalCatalogProduct } from '@/lib/types';
import { colors } from '@/theme';

interface CatalogCloneModalProps {
  visible: boolean;
  target: GlobalCatalogProduct | null;
  price: string;
  onChangePrice: (val: string) => void;
  stock: string;
  onChangeStock: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

export function CatalogCloneModal({
  visible,
  target,
  price,
  onChangePrice,
  stock,
  onChangeStock,
  onConfirm,
  onClose,
  isPending,
}: CatalogCloneModalProps) {
  if (!target) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-6 gap-3.5 shadow-2xl">
          <Text className="text-xl font-bold text-text-primary">{target.name}</Text>
          {target.brand ? <Text className="text-sm text-text-secondary -mt-1.5">{target.brand}</Text> : null}

          <View className="gap-1 mt-1">
            <Text className="text-xs font-bold text-text-secondary uppercase">{tr('catalog.priceLabel')}</Text>
            <TextInput
              className="bg-surface-muted border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary"
              value={price}
              onChangeText={onChangePrice}
              keyboardType="numeric"
              placeholder={tr('catalog.pricePlaceholder')}
              placeholderTextColor={colors.text.hint}
              autoFocus
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-bold text-text-secondary uppercase">{tr('catalog.initialStock')}</Text>
            <TextInput
              className="bg-surface-muted border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary"
              value={stock}
              onChangeText={onChangeStock}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.text.hint}
            />
          </View>

          <Pressable
            className={`h-13 rounded-2xl bg-brand-primary items-center justify-center mt-2 ${
              isPending ? 'opacity-60' : 'active:opacity-90'
            }`}
            onPress={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-extrabold text-white">{tr('catalog.addToShop')}</Text>
            )}
          </Pressable>

          <Pressable className="items-center py-2" onPress={onClose}>
            <Text className="text-sm font-semibold text-text-secondary">{tr('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
