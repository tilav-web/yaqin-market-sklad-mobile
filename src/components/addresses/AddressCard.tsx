import { Check, MapPin, Pencil, Star, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { UserAddress } from '@/lib/types';
import { useTheme } from '@/stores/theme';

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
  const { colors: activeColors } = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: active ? activeColors.brand.primarySurface : activeColors.bg.surface,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        gap: 14,
        borderWidth: 1.5,
        borderColor: active ? activeColors.brand.primary : activeColors.border.subtle,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? activeColors.brand.primary : activeColors.brand.primarySurface,
        }}>
        <MapPin
          size={20}
          color={active ? '#FFFFFF' : activeColors.brand.primary}
          strokeWidth={2.4}
        />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text style={{ fontSize: 16, fontWeight: '700', color: activeColors.text.primary }}>
            {item.label}
          </Text>
          {item.isDefault && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: activeColors.brand.primarySurface,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
              <Star size={10} color={activeColors.brand.primary} fill={activeColors.brand.primary} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: activeColors.brand.primary }}>
                {tr('picker.main')}
              </Text>
            </View>
          )}
          {active && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: activeColors.brand.primary,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
              }}>
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>{tr('addr.active')}</Text>
            </View>
          )}
        </View>

        <Text style={{ fontSize: 12, color: activeColors.text.secondary, marginTop: 4 }} numberOfLines={2}>
          {item.address}
        </Text>

        {(item.entrance || item.floor || item.apartment || item.intercom) && (
          <Text style={{ fontSize: 12, color: activeColors.text.tertiary, marginTop: 4 }} numberOfLines={1}>
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
              <Star size={14} color={activeColors.text.tertiary} strokeWidth={2.2} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: activeColors.text.tertiary }}>
                {tr('addr.makeDefault')}
              </Text>
            </Pressable>
          )}
          <Pressable hitSlop={6} onPress={onEdit} className="flex-row items-center gap-1">
            <Pencil size={14} color={activeColors.text.tertiary} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: activeColors.text.tertiary }}>
              {tr('addr.edit')}
            </Text>
          </Pressable>
          <Pressable hitSlop={6} onPress={onDelete} className="flex-row items-center gap-1">
            <Trash2 size={14} color={activeColors.text.danger} strokeWidth={2.2} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: activeColors.text.danger }}>
              {tr('addr.delete')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
