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
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { tr } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { SellerVariant } from '@/lib/types';
import { colors, radius, shadow, spacing, typography } from '@/theme';

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
    <View style={styles.card}>
      <Pressable style={styles.cardMain} onPress={() => onEdit(item)}>
        <View style={styles.imageWrap}>
          {item.photos[0] ? (
            <Image source={{ uri: resolveMedia(item.photos[0]) }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Package size={22} color={colors.brand.primary} strokeWidth={1.6} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            {hasDiscount ? (
              <Text style={styles.oldPrice}>{item.price.toLocaleString()}</Text>
            ) : null}
            <Text style={styles.price}>
              {sellPrice.toLocaleString()} {tr('common.som')}
            </Text>
          </View>
          <Text style={styles.unit}>
            {item.unitSize} {unitLabel(item.unitType)}
          </Text>
        </View>
        <View style={styles.cardTopActions}>
          <Pencil size={16} color={colors.text.tertiary} strokeWidth={2} />
          <Pressable onPress={() => onMenu(item)} hitSlop={8}>
            <MoreVertical size={16} color={colors.text.tertiary} strokeWidth={2} />
          </Pressable>
        </View>
      </Pressable>

      {/* Cost / profit strip */}
      <View style={styles.costStrip}>
        <Text style={styles.costText}>
          {tr('inv.cost')}{' '}
          <Text style={styles.costVal}>{avgCost > 0 ? fmt(avgCost) : '—'}</Text>
        </Text>
        <Text style={styles.costText}>
          {tr('inv.profitPerUnit')}{' '}
          <Text style={[styles.costVal, { color: colors.feedback.success }]}>
            {fmt(profit)}
          </Text>
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.stock, low && styles.stockLow]}>
          {tr('inv.stockLine', { count: item.stock })}
          {low ? tr('inv.stockLowSuffix') : ''}
        </Text>
        <View style={styles.stockControls}>
          <Pressable style={styles.stepBtn} onPress={() => onAdjust(item.id, -1)}>
            <Minus size={15} color={colors.brand.primary} strokeWidth={2.6} />
          </Pressable>
          <Pressable style={styles.stepBtn} onPress={() => onAdjust(item.id, 1)}>
            <Plus size={15} color={colors.brand.primary} strokeWidth={2.6} />
          </Pressable>
          <Pressable style={styles.historyBtn} onPress={() => onHistory(item)}>
            <History size={15} color={colors.text.secondary} strokeWidth={2.2} />
          </Pressable>
          {isOwner !== false && (
            <Pressable style={styles.delBtn} onPress={() => onDelete(item)}>
              <Trash2 size={15} color={colors.text.danger} strokeWidth={2.2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Primary warehouse action */}
      <Pressable style={styles.kirimBtn} onPress={() => onKirim(item)}>
        <PackagePlus size={16} color={colors.brand.primary} strokeWidth={2.3} />
        <Text style={styles.kirimText}>{tr('inv.kirimBtn')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    ...shadow.xs,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  costStrip: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  costText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  costVal: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  stock: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  stockLow: {
    color: colors.text.danger,
    fontWeight: '800',
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  historyBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.bg.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kirimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  kirimText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  image: {
    width: 56,
    height: 56,
    backgroundColor: colors.brand.primarySurface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  oldPrice: {
    ...typography.caption,
    color: colors.text.hint,
    textDecorationLine: 'line-through',
  },
  price: {
    ...typography.bodyStrong,
    color: colors.brand.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 1,
  },
});
