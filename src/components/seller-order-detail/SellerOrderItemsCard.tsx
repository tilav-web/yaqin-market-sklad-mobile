import { Package, ScanBarcode } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { Order, OrderItem } from '@/lib/types';
import { colors } from '@/theme';
import { fmt } from './types';

interface SellerOrderItemsCardProps {
  order: Order;
  onOpenMarkingScanner: (item: OrderItem) => void;
  isSavingMarking?: boolean;
}

export function SellerOrderItemsCard({
  order,
  onOpenMarkingScanner,
  isSavingMarking,
}: SellerOrderItemsCardProps) {
  const { tr } = useTranslation();

  return (
    <View className="bg-bg-surface rounded-2xl p-4 border border-border-subtle gap-2">
      <Text className="text-xs uppercase tracking-wider font-bold text-text-secondary">{tr('shop.products')}</Text>
      {order.items.map((it) => {
        const remainingQty = it.quantity - it.returnedQuantity;
        const markingDone = (it.markingCodes?.length ?? 0) >= remainingQty;

        return (
          <View key={it.id} className="flex-row items-center gap-3">
            <View className="w-12 h-12 rounded-xl overflow-hidden bg-brand-primary/10">
              {it.productVariant?.globalProduct?.photos?.[0] ? (
                <Image
                  source={{ uri: resolveMedia(it.productVariant.globalProduct.photos[0]) }}
                  className="w-12 h-12"
                />
              ) : (
                <View className="w-12 h-12 items-center justify-center">
                  <Package size={18} color={colors.brand.primary} strokeWidth={1.7} />
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary" numberOfLines={2}>
                {it.productName}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                {it.quantity} × {fmt(it.unitPrice)} {tr('common.som')}
                {it.returnedQuantity > 0
                  ? ` · ${tr('sellerOrder.returnedCount', { n: it.returnedQuantity })}`
                  : ''}
              </Text>
              {it.productVariant?.globalProduct?.taxCategory?.markingRequired ? (
                <Pressable
                  className="flex-row items-center gap-1 mt-1 active:opacity-75"
                  onPress={() => onOpenMarkingScanner(it)}
                  disabled={isSavingMarking}
                >
                  <ScanBarcode
                    size={14}
                    color={markingDone ? colors.feedback.success : colors.feedback.warning}
                    strokeWidth={2.2}
                  />
                  <Text
                    className={`text-xs font-bold ${
                      markingDone ? 'text-feedback-success' : 'text-feedback-warning'
                    }`}
                  >
                    {tr('sellerOrder.marking', {
                      done: it.markingCodes?.length ?? 0,
                      total: remainingQty,
                    })}
                    {!markingDone ? ` — ${tr('sellerOrder.scanAction')}` : ''}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Text className="text-sm font-extrabold text-text-primary">{fmt(it.lineTotal)}</Text>
          </View>
        );
      })}
    </View>
  );
}
