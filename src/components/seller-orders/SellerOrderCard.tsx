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
import { Image, Pressable, Text, View } from 'react-native';

import { AutoCancelCountdown } from '@/components/AutoCancelCountdown';
import { useTranslation } from '@/i18n';
import { resolveMedia } from '@/lib/api';
import { ORDER_STATUS_KEY, Order } from '@/lib/types';
import { colors } from '@/theme';

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
    <View
      className="bg-bg-surface rounded-2xl p-4 gap-1.5 border-l-4 border border-border-subtle"
      style={{ borderLeftColor: colors.status[item.status] }}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center">
        <Pressable
          className="flex-row items-center gap-0.5"
          onPress={() => router.push(`/seller/order/${item.id}`)}
          hitSlop={6}
        >
          <Text className="text-base font-bold text-text-primary">#{item.orderNumber}</Text>
          <ChevronRight size={14} color={colors.text.tertiary} strokeWidth={2.4} />
        </Pressable>
        <View className="flex-row items-center gap-3">
          <View
            className="px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: colors.status[item.status] }}
          >
            <Text className="text-[10px] text-text-on-primary font-extrabold">
              {tr(ORDER_STATUS_KEY[item.status])}
            </Text>
          </View>
          {(item.status === 'new' || item.status === 'accepted') && (
            <Pressable
              className="w-6 h-6 rounded-full bg-feedback-danger/10 items-center justify-center active:opacity-75"
              hitSlop={8}
              onPress={() => onCancelOrReject(item)}
            >
              <X size={15} color={colors.feedback.danger} strokeWidth={2.8} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Time + customer */}
      <View className="flex-row items-center gap-1 flex-wrap">
        <Text className="text-xs text-text-tertiary">{item.createdAt.slice(11, 16)}</Text>
        <Text className="text-xs text-text-hint">·</Text>
        <Text className="text-xs text-text-tertiary">{itemCount} dona</Text>
        {customer && (
          <>
            <Text className="text-xs text-text-hint">·</Text>
            <Phone size={11} color={colors.text.tertiary} strokeWidth={2} />
            <Text className="text-xs text-text-tertiary" numberOfLines={1}>
              {customer}
            </Text>
          </>
        )}
      </View>

      {item.status === 'new' && (
        <AutoCancelCountdown createdAt={item.createdAt} status={item.status} />
      )}

      {/* Accordion */}
      <Pressable className="flex-row items-center justify-between mt-0.5 py-1.5 border-t border-border-subtle" onPress={onToggleOpen}>
        <Text className="text-xs font-bold text-brand-primary">
          {isOpen ? 'Yashirish' : `${item.items.length} xil mahsulot`}
        </Text>
        {isOpen ? (
          <ChevronUp size={15} color={colors.brand.primary} strokeWidth={2.4} />
        ) : (
          <ChevronDown size={15} color={colors.brand.primary} strokeWidth={2.4} />
        )}
      </Pressable>

      {isOpen ? (
        <View className="gap-2 mt-0.5">
          {item.items.map((it) => (
            <View key={it.id} className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg overflow-hidden bg-brand-primary/10">
                {it.productVariant?.globalProduct?.photos?.[0] ? (
                  <Image
                    source={{ uri: resolveMedia(it.productVariant.globalProduct.photos[0]) }}
                    className="w-9 h-9"
                  />
                ) : (
                  <View className="w-9 h-9 items-center justify-center">
                    <Package size={14} color={colors.brand.primary} strokeWidth={1.7} />
                  </View>
                )}
              </View>
              <Text className="text-xs text-text-primary flex-1" numberOfLines={1}>
                {it.productName}
              </Text>
              <Text className="text-xs font-extrabold text-text-primary">×{it.quantity}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-xs text-text-secondary" numberOfLines={1}>
          {item.items.map((it) => it.productName).join(', ')}
        </Text>
      )}

      <View className="flex-row items-center justify-between mt-0.5">
        <Text className="text-lg font-bold text-brand-primary">{fmt(item.total)} so'm</Text>
        <Pressable
          className="flex-row items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-primary/10 active:opacity-75"
          onPress={() => router.push(`/chat/${item.id}?shopId=${shopId}`)}
        >
          <MessageCircle size={14} color={colors.brand.primary} strokeWidth={2.4} />
          <Text className="text-xs text-brand-primary font-bold">{tr('nav.chat')}</Text>
        </Pressable>
      </View>

      {item.status === 'delivering' && (
        <Pressable
          className="flex-row items-center justify-center gap-1.5 h-9 rounded-xl bg-feedback-warning/10 mt-1 active:opacity-75"
          onPress={() => router.push(`/seller/return/${item.id}`)}
        >
          <RotateCcw size={14} color={colors.feedback.warning} strokeWidth={2.4} />
          <Text className="text-xs text-feedback-warning font-bold">{tr('sellerOrders.markReturn')}</Text>
        </Pressable>
      )}

      {next && (
        <Pressable
          className={`flex-row items-center justify-center gap-1.5 h-11 rounded-xl mt-1 active:opacity-85 ${
            item.status === 'new' ? 'bg-feedback-success' : 'bg-brand-primary'
          }`}
          onPress={() => onAdvance(item)}
        >
          {item.status === 'new' && (
            <Check size={17} color={colors.text.onPrimary} strokeWidth={2.8} />
          )}
          <Text className="text-sm font-bold text-text-on-primary">{tr(next.labelKey)}</Text>
        </Pressable>
      )}
    </View>
  );
}
