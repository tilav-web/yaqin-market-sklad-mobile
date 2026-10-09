import { Check, MapPin, Pencil, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { UserAddress } from '@/lib/types';
import { colors } from '@/theme';

interface AddressCardProps {
  readonly item: UserAddress;
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly onSetDefault: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

export function AddressCard({
  item,
  active,
  onSelect,
  onSetDefault,
  onEdit,
  onDelete,
}: AddressCardProps) {
  const { tr } = useTranslation();

  return (
    <Pressable
      onPress={onSelect}
      className={`bg-surface rounded-2xl p-4 flex-row gap-3.5 border-[1.5px] shadow-xs ${
        active ? 'border-brand-primary bg-brand-primary/5' : 'border-border-subtle'
      }`}>
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          active ? 'bg-brand-primary' : 'bg-brand-primary/10'
        }`}>
        <MapPin
          size={20}
          color={active ? colors.text.onPrimary : colors.brand.primary}
          strokeWidth={2.4}
        />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-base font-bold text-text-primary">{item.label}</Text>
          {item.isDefault && (
            <View className="flex-row items-center gap-1 bg-brand-primary/10 px-2 py-0.5 rounded">
              <Star size={10} color={colors.brand.primary} fill={colors.brand.primary} />
              <Text className="text-xs font-bold text-brand-primary">{tr('picker.main')}</Text>
            </View>
          )}
          {active && (
            <View className="flex-row items-center gap-1 bg-brand-primary px-2 py-0.5 rounded">
              <Check size={11} color={colors.text.onPrimary} strokeWidth={3} />
              <Text className="text-xs font-bold text-white">{tr('addr.active')}</Text>
            </View>
          )}
        </View>

        <Text className="text-xs text-text-secondary mt-1" numberOfLines={2}>
          {item.address}
        </Text>

        {(item.entrance || item.floor || item.apartment || item.intercom) && (
          <Text className="text-xs text-text-tertiary mt-1" numberOfLines={1}>
            {[
              item.entrance && `${tr('addr.entrance')} ${item.entrance}`,
              item.floor && `${tr('addr.floor')} ${item.floor}`,
              item.apartment && `${tr('addr.apartment')} ${item.apartment}`,
              item.intercom && `${tr('addr.intercom')} ${item.intercom}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        )}

        <View className="flex-row gap-4 mt-3">
          {!item.isDefault && (
            <Pressable hitSlop={6} onPress={onSetDefault} className="flex-row items-center gap-1">
              <Star size={14} color={colors.text.tertiary} strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-text-tertiary">{tr('addr.makeDefault')}</Text>
            </Pressable>
          )}
          <Pressable hitSlop={6} onPress={onEdit} className="flex-row items-center gap-1">
            <Pencil size={14} color={colors.text.tertiary} strokeWidth={2.2} />
            <Text className="text-xs font-semibold text-text-tertiary">{tr('addr.edit')}</Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={onDelete} className="flex-row items-center gap-1">
            <Trash2 size={14} color={colors.text.danger} strokeWidth={2.2} />
            <Text className="text-xs font-semibold text-text-danger">{tr('addr.delete')}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
