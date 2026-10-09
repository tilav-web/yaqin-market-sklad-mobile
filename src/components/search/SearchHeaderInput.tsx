import { Search as SearchIcon, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { typography } from '@/theme';

interface SearchHeaderInputProps {
  input: string;
  onChangeInput: (text: string) => void;
  onSubmit: () => void;
  onClear: () => void;
}

export function SearchHeaderInput({
  input,
  onChangeInput,
  onSubmit,
  onClear,
}: SearchHeaderInputProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View className="px-4 pt-1 pb-2" style={{ backgroundColor: activeColors.bg.surface }}>
      <View
        className="flex-row items-center gap-2 rounded-2xl px-3 h-11 border"
        style={{
          backgroundColor: activeColors.bg.surfaceMuted,
          borderColor: activeColors.border.subtle,
        }}
      >
        <SearchIcon size={18} color={activeColors.text.secondary} strokeWidth={2.2} />
        <TextInput
          className="flex-1 py-0"
          style={[typography.body, { color: activeColors.text.primary }]}
          value={input}
          onChangeText={onChangeInput}
          placeholder={tr('search.placeholder')}
          placeholderTextColor={activeColors.text.tertiary}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onSubmit}
        />
        {input.length > 0 && (
          <Pressable onPress={onClear} hitSlop={8}>
            <X size={18} color={activeColors.text.secondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
