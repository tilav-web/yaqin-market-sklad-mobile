import { useMutation } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DatePickerModal } from '@/components/ui';
import { useTranslation, type TranslationKey } from '@/i18n';
import { api, extractErrorMessage } from '@/lib/api';
import { parseAmount } from '@/lib/parseAmount';
import { Category } from '@/lib/types';
import { colors } from '@/theme';

type PromType = 'product_discount' | 'category_discount' | 'free_delivery';
type DiscountType = 'percent' | 'fixed';

const TYPE_LABELS: Record<PromType, TranslationKey> = {
  product_discount: 'promo.typeProductDiscount',
  category_discount: 'promo.typeCategoryDiscount',
  free_delivery: 'promo.typeFreeDelivery',
};

interface CreatePromotionModalProps {
  visible: boolean;
  shopId: string;
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePromotionModal({
  visible,
  shopId,
  categories: _categories,
  onClose,
  onCreated,
}: CreatePromotionModalProps) {
  const { tr } = useTranslation();
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
    setName('');
    setType('product_discount');
    setDiscountType('percent');
    setDiscountValue('');
    setFreeMinAmount('');
    setStartAt('');
    setEndAt('');
    setHasEndDate(true);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-surface rounded-t-3xl p-6 gap-3.5 max-h-[85%]">
          <Text className="text-xl font-bold text-text-primary">{tr('promo.newTitle')}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            <View className="gap-1">
              <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.nameLabel')}</Text>
              <TextInput
                className="bg-surface border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary"
                value={name}
                onChangeText={setName}
                placeholder={tr('promo.namePlaceholder')}
                placeholderTextColor={colors.text.hint}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.typeLabel')}</Text>
              {(['product_discount', 'category_discount', 'free_delivery'] as PromType[]).map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    className={`flex-row items-center gap-3 p-3 rounded-xl border ${
                      active ? 'bg-brand-primary-surface border-brand-primary' : 'bg-surface border-border-default'
                    }`}
                    onPress={() => setType(t)}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                        active ? 'border-brand-primary bg-brand-primary' : 'border-border-default'
                      }`}
                    />
                    <Text className={`text-sm font-semibold ${active ? 'text-brand-primary' : 'text-text-primary'}`}>
                      {tr(TYPE_LABELS[t])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {type !== 'free_delivery' && (
              <View className="gap-2">
                <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.discountTypeLabel')}</Text>
                <View className="flex-row gap-2">
                  {(['percent', 'fixed'] as DiscountType[]).map((dt) => {
                    const active = discountType === dt;
                    return (
                      <Pressable
                        key={dt}
                        className={`flex-1 py-2.5 rounded-xl border items-center ${
                          active ? 'bg-brand-primary border-brand-primary' : 'bg-surface border-border-default'
                        }`}
                        onPress={() => setDiscountType(dt)}
                      >
                        <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-text-secondary'}`}>
                          {dt === 'percent' ? tr('promo.discountPercent') : tr('promo.discountFixed')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  className="bg-surface border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary"
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                  placeholder={discountType === 'percent' ? '10' : '5000'}
                  placeholderTextColor={colors.text.hint}
                />
              </View>
            )}

            {type === 'free_delivery' && (
              <View className="gap-1">
                <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.minOrderLabel')}</Text>
                <TextInput
                  className="bg-surface border border-border-default rounded-xl px-4 py-2.5 text-base text-text-primary"
                  value={freeMinAmount}
                  onChangeText={setFreeMinAmount}
                  keyboardType="numeric"
                  placeholder="50000"
                  placeholderTextColor={colors.text.hint}
                />
              </View>
            )}

            <View className="gap-1">
              <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.startDate')}</Text>
              <Pressable
                className="flex-row items-center gap-2.5 bg-surface border border-border-default rounded-xl px-4 h-12"
                onPress={() => setPickingDate('start')}
              >
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text className={`text-sm ${startAt ? 'text-text-primary font-medium' : 'text-text-hint'}`}>
                  {startAt || tr('promo.pickDate')}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs font-bold text-text-secondary uppercase">{tr('promo.hasEndDate')}</Text>
              <Switch value={hasEndDate} onValueChange={setHasEndDate} trackColor={{ true: colors.brand.primary }} />
            </View>

            {hasEndDate && (
              <Pressable
                className="flex-row items-center gap-2.5 bg-surface border border-border-default rounded-xl px-4 h-12 -mt-1"
                onPress={() => setPickingDate('end')}
              >
                <CalendarDays size={16} color={colors.brand.primary} strokeWidth={2.2} />
                <Text className={`text-sm ${endAt ? 'text-text-primary font-medium' : 'text-text-hint'}`}>
                  {endAt || tr('promo.pickDate')}
                </Text>
              </Pressable>
            )}

            <Pressable
              className={`h-12 rounded-xl bg-brand-primary items-center justify-center mt-2 ${
                create.isPending ? 'opacity-60' : 'active:opacity-90'
              }`}
              onPress={() => create.mutate()}
              disabled={create.isPending}
            >
              {create.isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-extrabold text-white">{tr('promo.create')}</Text>
              )}
            </Pressable>

            <Pressable className="items-center py-2" onPress={handleClose}>
              <Text className="text-sm font-semibold text-text-secondary">{tr('common.cancel')}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      <DatePickerModal
        visible={pickingDate !== null}
        value={pickingDate === 'start' ? startAt : endAt}
        title={pickingDate === 'start' ? tr('promo.startDate') : tr('promo.endDate')}
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
