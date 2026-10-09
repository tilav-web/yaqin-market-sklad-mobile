import { Pencil, RotateCcw, Save, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, shadow, typography } from '@/theme';
import { ZoneKey } from './types';

interface DeliveryZonesBottomBarProps {
  zone: ZoneKey;
  onSelectZone: (zone: ZoneKey) => void;
  hint: string;
  pencilOn: boolean;
  onTogglePencil: () => void;
  isClosed: boolean;
  vertsCount: number;
  onUndo: () => void;
  onReset: () => void;
  onClosePolygon: () => void;
  onSave: () => void;
  isSaving: boolean;
  dColor: string;
  fColor: string;
  activeColor: string;
}

export function DeliveryZonesBottomBar({
  zone,
  onSelectZone,
  hint,
  pencilOn,
  onTogglePencil,
  isClosed,
  vertsCount,
  onUndo,
  onReset,
  onClosePolygon,
  onSave,
  isSaving,
  dColor,
  fColor,
  activeColor,
}: DeliveryZonesBottomBarProps) {
  return (
    <SafeAreaView
      className="absolute bottom-0 inset-x-0 bg-white/95 px-4 pt-2 pb-1 gap-1"
      style={shadow.lg}
      edges={['bottom']}
    >
      {/* Zone toggle + hint in one row */}
      <View className="flex-row items-center gap-1">
        {(['delivery', 'free'] as ZoneKey[]).map((z) => {
          const col = z === 'delivery' ? dColor : fColor;
          const active = zone === z;
          return (
            <TouchableOpacity
              key={z}
              className="flex-row items-center gap-1 px-2 py-1 rounded-full border-[1.5px]"
              style={[
                {
                  borderColor: active ? col : colors.border.subtle,
                  backgroundColor: active ? col + '20' : colors.bg.surfaceMuted,
                },
              ]}
              onPress={() => onSelectZone(z)}
            >
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col }} />
              <Text
                className="text-[11px]"
                style={[
                  typography.caption,
                  { color: active ? colors.text.primary : colors.text.tertiary, fontWeight: active ? '700' : '400' },
                ]}
              >
                {z === 'delivery' ? 'Yetkazib berish' : 'Tekin'}
              </Text>
            </TouchableOpacity>
          );
        })}
        <Text className="flex-1 text-[11px] text-right" style={[typography.caption, { color: colors.text.hint }]} numberOfLines={1}>
          {hint}
        </Text>
      </View>

      {/* Tool row */}
      <View className="flex-row items-center gap-1">
        <TouchableOpacity
          className="w-9 h-9 rounded-xl items-center justify-center border"
          style={[
            {
              backgroundColor: colors.bg.surfaceMuted,
              borderColor: colors.border.subtle,
              opacity: vertsCount === 0 ? 0.3 : 1,
            },
          ]}
          disabled={vertsCount === 0}
          onPress={onUndo}
          hitSlop={4}
        >
          <RotateCcw size={16} color={vertsCount === 0 ? colors.text.hint : colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          className="w-9 h-9 rounded-xl items-center justify-center border"
          style={[
            {
              backgroundColor: colors.bg.surfaceMuted,
              borderColor: colors.border.subtle,
              opacity: vertsCount === 0 ? 0.3 : 1,
            },
          ]}
          disabled={vertsCount === 0}
          onPress={onReset}
          hitSlop={4}
        >
          <X size={16} color={vertsCount === 0 ? colors.text.hint : colors.feedback.danger} />
        </TouchableOpacity>

        {pencilOn && vertsCount >= 3 && !isClosed && (
          <TouchableOpacity
            className="px-3 h-9 rounded-xl items-center justify-center border-2"
            style={[{ borderColor: activeColor, backgroundColor: colors.bg.surface }]}
            onPress={onClosePolygon}
          >
            <Text className="text-xs font-bold" style={{ color: activeColor }}>Yop</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="flex-row items-center gap-1 h-9 px-3 rounded-xl border-[1.5px]"
          style={[
            {
              backgroundColor: pencilOn ? activeColor : colors.bg.surface,
              borderColor: pencilOn ? activeColor : colors.border.default,
              opacity: isClosed ? 0.3 : 1,
            },
          ]}
          disabled={isClosed}
          onPress={onTogglePencil}
        >
          <Pencil size={15} color={pencilOn ? '#fff' : activeColor} />
          <Text className="text-xs font-semibold" style={{ color: pencilOn ? '#fff' : colors.text.secondary }}>
            {pencilOn ? 'Chizmoqda' : 'Qalam'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center gap-1.5 h-9 rounded-2xl"
          style={[{ backgroundColor: colors.brand.primary, opacity: isSaving ? 0.6 : 1 }]}
          disabled={isSaving}
          onPress={onSave}
        >
          <Save size={15} color="#fff" />
          <Text className="text-xs font-bold text-white">
            {isSaving ? 'Saqlanmoqda…' : 'Saqlash'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
