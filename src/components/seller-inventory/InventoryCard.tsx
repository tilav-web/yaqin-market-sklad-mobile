import {
  History,
  Minus,
  MoreVertical,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { SellerVariant } from '@/lib/types';
import { colors } from '@/theme';

import { fmt, unitLabel } from './types';

interface InventoryCardProps {
  item: SellerVariant;
  isOwner?: boolean;
  onEdit: (item: SellerVariant) => void;
  onMenu: (item: SellerVariant) => void;
  onAdjust: (variantId: string, delta: number) => void;
  onHistory: (item: SellerVariant) => void;
  onDelete: (item: SellerVariant) => void;
  onKirim: (item: SellerVariant) => void;
}

export function InventoryCard({
  item,
  isOwner,
  onEdit,
  onMenu,
  onAdjust,
  onHistory,
  onDelete,
  onKirim,
}: InventoryCardProps) {
  const hasDiscount = item.discountPrice != null && item.discountPrice < item.price;
  const low = item.stock <= item.lowStockThreshold;
  const sellPrice = item.discountPrice ?? item.price;
  const avgCost = item.cost?.avgCost ?? 0;
  const profit = Math.max(0, sellPrice - avgCost);

  return (
    <View className="bg-bg-surface rounded-2xl border border-border-subtle shadow-sm">
      <Pressable className="flex-row items-center gap-3 p-3.5" onPress={() => onEdit(item)}>
        <View className="w-14 h-14 rounded-xl overflow-hidden bg-brand-primary/10">
          {item.photos[0] ? (
            <Image source={{ uri: resolveMedia(item.photos[0]) }} className="w-14 h-14" />
          ) : (
            <View className="w-14 h-14 items-center justify-center">
              <Package size={22} color={colors.brand.primary} strokeWidth={1.6} />
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-text-primary" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            {hasDiscount ? (
              <Text className="text-xs text-text-hint line-through">{item.price.toLocaleString()}</Text>
            ) : null}
            <Text className="text-sm font-bold text-brand-primary">
              {sellPrice.toLocaleString()} {tr('common.som')}
            </Text>
          </View>
          <Text className="text-xs text-text-tertiary mt-0.5">
            {item.unitSize} {unitLabel(item.unitType)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Pencil size={16} color={colors.text.tertiary} strokeWidth={2} />
          <Pressable onPress={() => onMenu(item)} hitSlop={8}>
            <MoreVertical size={16} color={colors.text.tertiary} strokeWidth={2} />
          </Pressable>
        </View>
      </Pressable>

      {/* Cost / profit strip */}
      <View className="flex-row gap-4 px-3.5 pb-2">
        <Text className="text-xs text-text-secondary">
          {tr('inv.cost')}{' '}
          <Text className="font-extrabold text-text-primary">{avgCost > 0 ? fmt(avgCost) : '—'}</Text>
        </Text>
        <Text className="text-xs text-text-secondary">
          {tr('inv.profitPerUnit')}{' '}
          <Text className="font-extrabold text-feedback-success">{fmt(profit)}</Text>
        </Text>
      </View>

      <View className="flex-row items-center justify-between px-3.5 py-2 border-t border-border-subtle">
        <Text className={`text-xs ${low ? 'text-feedback-danger font-extrabold' : 'text-text-secondary font-semibold'}`}>
          {tr('inv.stockLine', { count: item.stock })}
          {low ? tr('inv.stockLowSuffix') : ''}
        </Text>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="w-8 h-8 rounded-full bg-brand-primary/10 items-center justify-center active:opacity-75"
            onPress={() => onAdjust(item.id, -1)}
          >
            <Minus size={15} color={colors.brand.primary} strokeWidth={2.6} />
          </Pressable>
          <Pressable
            className="w-8 h-8 rounded-full bg-brand-primary/10 items-center justify-center active:opacity-75"
            onPress={() => onAdjust(item.id, 1)}
          >
            <Plus size={15} color={colors.brand.primary} strokeWidth={2.6} />
          </Pressable>
          <Pressable
            className="w-8 h-8 rounded-full bg-bg-surface-muted items-center justify-center active:opacity-75"
            onPress={() => onHistory(item)}
          >
            <History size={15} color={colors.text.secondary} strokeWidth={2.2} />
          </Pressable>
          {isOwner !== false && (
            <Pressable
              className="w-8 h-8 rounded-full bg-feedback-danger/10 items-center justify-center ml-1 active:opacity-75"
              onPress={() => onDelete(item)}
            >
              <Trash2 size={15} color={colors.feedback.danger} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Primary warehouse action */}
      <Pressable
        className="flex-row items-center justify-center gap-1.5 py-2.5 border-t border-border-subtle active:opacity-75"
        onPress={() => onKirim(item)}
      >
        <PackagePlus size={16} color={colors.brand.primary} strokeWidth={2.3} />
        <Text className="text-xs font-bold text-brand-primary">{tr('inv.kirimBtn')}</Text>
      </Pressable>
    </View>
  );
}
