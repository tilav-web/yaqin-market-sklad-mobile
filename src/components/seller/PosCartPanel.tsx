import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { SellerVariant } from '@/lib/types';
import { colors } from '@/theme';

function fmt(n: number): string {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}

interface PosCartLine {
  variant: SellerVariant;
  qty: number;
}

interface PosCartPanelProps {
  cartLines: PosCartLine[];
  total: number;
  itemCount: number;
  onAdd: (variant: SellerVariant) => void;
  onDec: (variantId: string) => void;
  onClear: () => void;
  onSell: () => void;
  isPending: boolean;
}

export function PosCartPanel({
  cartLines,
  total,
  itemCount,
  onAdd,
  onDec,
  onClear,
  onSell,
  isPending,
}: PosCartPanelProps) {
  if (cartLines.length === 0) return null;

  return (
    <View className="bg-surface rounded-t-3xl p-5 gap-2 shadow-2xl border-t border-border-subtle">
      {cartLines.map((l) => (
        <View key={l.variant.id} className="flex-row items-center gap-2.5 py-1">
          <Text className="text-sm font-semibold text-text-primary flex-1" numberOfLines={1}>
            {l.variant.name}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Pressable
              className="w-7 h-7 rounded-full bg-brand-primary-surface items-center justify-center active:opacity-70"
              onPress={() => onDec(l.variant.id)}
            >
              <Minus size={13} color={colors.brand.primary} strokeWidth={2.8} />
            </Pressable>
            <Text className="text-sm font-bold text-text-primary min-w-[20px] text-center">{l.qty}</Text>
            <Pressable
              className="w-7 h-7 rounded-full bg-brand-primary-surface items-center justify-center active:opacity-70"
              onPress={() => onAdd(l.variant)}
            >
              <Plus size={13} color={colors.brand.primary} strokeWidth={2.8} />
            </Pressable>
          </View>
          <Text className="text-sm font-bold text-text-primary min-w-[70px] text-right">
            {fmt((l.variant.discountPrice ?? l.variant.price) * l.qty)}
          </Text>
        </View>
      ))}

      <View className="flex-row items-center gap-2.5 mt-2">
        <Pressable
          className="w-12 h-12 rounded-xl border border-red-500 items-center justify-center active:opacity-70"
          onPress={() =>
            Alert.alert(tr('pos.clearCart'), tr('pos.clearCartConfirm'), [
              { text: tr('common.cancel'), style: 'cancel' },
              { text: 'Tozalash', style: 'destructive', onPress: onClear },
            ])
          }
          hitSlop={8}
        >
          <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
        </Pressable>

        <Pressable
          className={`flex-1 flex-row items-center justify-center gap-2 h-12 rounded-xl bg-emerald-600 active:opacity-90 ${
            isPending ? 'opacity-60' : ''
          }`}
          disabled={isPending}
          onPress={onSell}
        >
          <ShoppingCart size={18} color="#ffffff" strokeWidth={2.4} />
          <Text className="text-base font-extrabold text-white">
            {isPending ? 'Sotilmoqda…' : `Sotish · ${fmt(total)} so‘m`}
          </Text>
        </Pressable>
      </View>
      <Text className="text-xs text-text-tertiary text-center mt-1">{itemCount} dona · naqd · do‘konda sotuv</Text>
    </View>
  );
}
