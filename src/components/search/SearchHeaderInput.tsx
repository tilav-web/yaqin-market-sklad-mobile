import { Search as SearchIcon, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { layout, radius, spacing, typography } from '@/theme';

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
    <View style={[styles.searchHeader, { backgroundColor: activeColors.bg.surface }]}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: activeColors.bg.surfaceMuted,
            borderColor: activeColors.border.subtle,
          },
        ]}
      >
        <SearchIcon size={18} color={activeColors.text.secondary} strokeWidth={2.2} />
        <TextInput
          style={[styles.input, { color: activeColors.text.primary }]}
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

const styles = StyleSheet.create({
  searchHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: layout.inputHeight,
    borderWidth: 1,
  },
  input: { flex: 1, ...typography.body, paddingVertical: 0 },
});
