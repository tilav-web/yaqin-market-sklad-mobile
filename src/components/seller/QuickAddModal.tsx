import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { tr } from '@/i18n';
import { api, extractErrorMessage, resolveMedia } from '@/lib/api';
import { GlobalProduct } from '@/lib/types';
import { colors } from '@/theme';
import { getLocalizedText } from '@/utils/text';

const UNIT_KEYS = {
  piece: 'quickAdd.unitPiece',
  kg: 'quickAdd.unitKg',
  liter: 'quickAdd.unitLiter',
  gram: 'quickAdd.unitGram',
  pack: 'quickAdd.unitPack',
} as const;

function unitLabel(unitType: string): string {
  const key = UNIT_KEYS[unitType as keyof typeof UNIT_KEYS];
  return key ? tr(key) : unitType;
}

interface Props {
  visible: boolean;
  shopId: string;
  globalProduct: GlobalProduct | null;
  onClose: () => void;
}

export function QuickAddModal({ visible, shopId, globalProduct, onClose }: Props) {
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const reset = () => {
    setPrice('');
    setStock('');
    setCostPrice('');
  };

  const add = useMutation({
    mutationFn: async () => {
      const p = parseFloat(price.replace(/\s/g, ''));
      const s = parseInt(stock, 10);
      if (!globalProduct || isNaN(p) || p <= 0) throw new Error(tr('quickAdd.invalidPrice'));
      await api.post(`/seller/shops/${shopId}/catalog/clone`, {
        globalProductId: globalProduct.id,
        price: p,
        stock: isNaN(s) ? 0 : s,
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variants', shopId] });
      reset();
      onClose();
      Alert.alert(tr('quickAdd.addedTitle'), tr('quickAdd.addedMsg'));
    },
    onError: (e) => Alert.alert(tr('common.error'), extractErrorMessage(e)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!globalProduct) return null;

  const unitStr = `${globalProduct.unitSize} ${unitLabel(globalProduct.unitType)}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/45 justify-end">
        <View className="bg-bg-surface rounded-t-3xl p-6 gap-2">
          {/* Product header (read-only) */}
          <View className="flex-row items-center gap-3 mb-2">
            {globalProduct.photos[0] ? (
              <Image
                source={{ uri: resolveMedia(globalProduct.photos[0]) }}
                className="w-14 h-14 rounded-xl bg-brand-primary/10"
              />
            ) : (
              <View className="w-14 h-14 rounded-xl bg-bg-surface-muted" />
            )}
            <View className="flex-1">
              <View className="flex-row items-center gap-1">
                <Text className="text-base font-bold text-text-primary flex-1" numberOfLines={1}>
                  {getLocalizedText(globalProduct.name)}
                </Text>
                {globalProduct.isVerified ? (
                  <BadgeCheck size={15} color={colors.feedback.success} strokeWidth={2} />
                ) : null}
              </View>
              {globalProduct.brand ? (
                <Text className="text-xs text-text-secondary mt-0.5">{globalProduct.brand}</Text>
              ) : null}
              <Text className="text-xs text-text-tertiary mt-0.5">{unitStr}</Text>
            </View>
          </View>

          <Text className="text-xs font-bold text-text-secondary">{tr('quickAdd.priceLabel')}</Text>
          <TextInput
            className="text-base text-text-primary border border-border-default rounded-xl px-4 py-2.5 bg-bg-surface-muted"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder={tr('quickAdd.pricePh')}
            placeholderTextColor={colors.text.hint}
            autoFocus
          />

          <Text className="text-xs font-bold text-text-secondary">{tr('quickAdd.stockLabel')}</Text>
          <TextInput
            className="text-base text-text-primary border border-border-default rounded-xl px-4 py-2.5 bg-bg-surface-muted"
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.text.hint}
          />

          <Text className="text-xs font-bold text-text-secondary">{tr('quickAdd.costLabel')}</Text>
          <TextInput
            className="text-base text-text-primary border border-border-default rounded-xl px-4 py-2.5 bg-bg-surface-muted"
            value={costPrice}
            onChangeText={setCostPrice}
            keyboardType="numeric"
            placeholder={tr('quickAdd.costPh')}
            placeholderTextColor={colors.text.hint}
          />

          <Pressable
            className={`h-12 rounded-2xl bg-brand-primary items-center justify-center mt-1 ${
              add.isPending ? 'opacity-60' : 'active:opacity-85'
            }`}
            onPress={() => add.mutate()}
            disabled={add.isPending || !price}
          >
            {add.isPending ? (
              <ActivityIndicator color={colors.text.onPrimary} />
            ) : (
              <Text className="text-base font-bold text-text-on-primary">{tr('quickAdd.submit')}</Text>
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
