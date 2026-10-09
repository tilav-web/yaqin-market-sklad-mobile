import { CalendarDays } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { colors } from '@/theme';

interface ExcelDateRangeRowProps {
  range: { from: string; to: string };
  onPickFrom: () => void;
  onPickTo: () => void;
}

export function ExcelDateRangeRow({
  range,
  onPickFrom,
  onPickTo,
}: ExcelDateRangeRowProps) {
  const { tr } = useTranslation();

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        className="flex-1 flex-row items-center gap-2 bg-canvas border border-border-default rounded-xl px-3 h-11"
        onPress={onPickFrom}
      >
        <CalendarDays size={15} color={colors.brand.primary} strokeWidth={2.2} />
        <Text
          className={`text-sm ${
            range.from ? 'text-text-primary font-medium' : 'text-text-hint'
          }`}
        >
          {range.from || tr('excel.from')}
        </Text>
      </Pressable>

      <Text className="text-sm font-bold text-text-tertiary">—</Text>

      <Pressable
        className="flex-1 flex-row items-center gap-2 bg-canvas border border-border-default rounded-xl px-3 h-11"
        onPress={onPickTo}
      >
        <CalendarDays size={15} color={colors.brand.primary} strokeWidth={2.2} />
        <Text
          className={`text-sm ${
            range.to ? 'text-text-primary font-medium' : 'text-text-hint'
          }`}
        >
          {range.to || tr('excel.to')}
        </Text>
      </Pressable>
    </View>
  );
}
