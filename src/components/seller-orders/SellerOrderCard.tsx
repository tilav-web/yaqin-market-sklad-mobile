import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { ORDER_STATUS_KEY, Order } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

import { fmt, NEXT_STATUS } from './types';

interface SellerOrderCardProps {
  item: Order;
  isOpen: boolean;
  onToggleOpen: () => void;
  onCancelOrReject: (item: Order) => void;
  onAdvance: (item: Order) => void;
  shopId: string;
}

export function SellerOrderCard({
  item,
  isOpen,
  onToggleOpen,
  onCancelOrReject,
  onAdvance,
  shopId,
}: SellerOrderCardProps) {
  const { tr } = useTranslation();
  const next = NEXT_STATUS[item.status];
  const itemCount = item.items.reduce((s, it) => s + it.quantity, 0);
  const customer = item.user?.name ?? item.user?.phone ?? null;

  return (
    <View style={[styles.card, { borderLeftColor: colors.status[item.status] }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Pressable
          style={styles.numWrap}
          onPress={() => router.push(`/seller/order/${item.id}`)}
          hitSlop={6}
        >
          <Text style={styles.orderNum}>#{item.orderNumber}</Text>
          <ChevronRight size={14} color={colors.text.tertiary} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: colors.status[item.status] }]}>
            <Text style={styles.statusText}>{tr(ORDER_STATUS_KEY[item.status])}</Text>
          </View>
          {(item.status === 'new' || item.status === 'accepted') && (
            <Pressable
              style={styles.cancelIcon}
              hitSlop={8}
              onPress={() => onCancelOrReject(item)}
            >
              <X size={15} color={colors.feedback.danger} strokeWidth={2.8} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Time + customer */}
      <View style={styles.metaRow}>
        <Text style={styles.time}>{item.createdAt.slice(11, 16)}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.time}>{itemCount} dona</Text>
        {customer && (
          <>
            <Text style={styles.dot}>·</Text>
            <Phone size={11} color={colors.text.tertiary} strokeWidth={2} />
            <Text style={styles.time} numberOfLines={1}>
              {customer}
            </Text>
          </>
        )}
      </View>

      {item.status === 'new' && (
        <AutoCancelCountdown createdAt={item.createdAt} status={item.status} />
      )}

      {/* Accordion */}
      <Pressable style={styles.accordionToggle} onPress={onToggleOpen}>
        <Text style={styles.accordionLabel}>
          {isOpen ? 'Yashirish' : `${item.items.length} xil mahsulot`}
        </Text>
        {isOpen ? (
          <ChevronUp size={15} color={colors.brand.primary} strokeWidth={2.4} />
        ) : (
          <ChevronDown size={15} color={colors.brand.primary} strokeWidth={2.4} />
        )}
      </Pressable>

      {isOpen ? (
        <View style={styles.itemsExpanded}>
          {item.items.map((it) => (
            <View key={it.id} style={styles.itemRow}>
              <View style={styles.itemImageWrap}>
                {it.productVariant?.globalProduct?.photos?.[0] ? (
                  <Image
                    source={{ uri: resolveMedia(it.productVariant.globalProduct.photos[0]) }}
                    style={styles.itemImage}
                  />
                ) : (
                  <View style={[styles.itemImage, styles.itemPlaceholder]}>
                    <Package size={14} color={colors.brand.primary} strokeWidth={1.7} />
                  </View>
                )}
              </View>
              <Text style={styles.itemName} numberOfLines={1}>
                {it.productName}
              </Text>
              <Text style={styles.itemQty}>×{it.quantity}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.preview} numberOfLines={1}>
          {item.items.map((it) => it.productName).join(', ')}
        </Text>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.total}>{fmt(item.total)} so'm</Text>
        <Pressable
          style={styles.chatBtn}
          onPress={() => router.push(`/chat/${item.id}?shopId=${shopId}`)}
        >
          <MessageCircle size={14} color={colors.brand.primary} strokeWidth={2.4} />
          <Text style={styles.chatBtnText}>{tr('nav.chat')}</Text>
        </Pressable>
      </View>

      {item.status === 'delivering' && (
        <Pressable
          style={styles.returnBtn}
          onPress={() => router.push(`/seller/return/${item.id}`)}
        >
          <RotateCcw size={14} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text style={styles.returnBtnText}>{tr('sellerOrders.markReturn')}</Text>
        </Pressable>
      )}

      {next && (
        <Pressable
          style={[styles.actionBtn, item.status === 'new' && styles.acceptBtn]}
          onPress={() => onAdvance(item)}
        >
          {item.status === 'new' && (
            <Check size={17} color={colors.text.onPrimary} strokeWidth={2.8} />
          )}
          <Text style={styles.actionBtnText}>{tr(next.labelKey)}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  orderNum: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 10,
    color: colors.text.onPrimary,
    fontWeight: '800',
  },
  cancelIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: colors.feedback.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  time: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  dot: {
    ...typography.caption,
    color: colors.text.hint,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  accordionLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.brand.primary,
  },
  preview: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  itemsExpanded: {
    gap: spacing.sm,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemImageWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  itemImage: {
    width: 36,
    height: 36,
    backgroundColor: colors.brand.primarySurface,
  },
  itemPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    ...typography.caption,
    color: colors.text.primary,
    flex: 1,
  },
  itemQty: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  total: {
    ...typography.h4,
    color: colors.brand.primary,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primarySurface,
  },
  chatBtnText: {
    ...typography.caption,
    color: colors.brand.primary,
    fontWeight: '700',
  },
  returnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: layout.buttonHeight.sm,
    borderRadius: radius.md,
    backgroundColor: colors.feedback.warningSurface,
    marginTop: spacing.xs,
  },
  returnBtnText: {
    ...typography.caption,
    color: colors.feedback.warning,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.brand.primary,
    height: layout.buttonHeight.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  acceptBtn: {
    backgroundColor: colors.feedback.success,
  },
  actionBtnText: {
    ...typography.buttonSmall,
    color: colors.text.onPrimary,
  },
});
