import { Send, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { colors, layout, radius, spacing, typography } from '@/theme';

interface ChatInputBarProps {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  hasShop: boolean;
  templatesOpen: boolean;
  onToggleTemplates: () => void;
}

export function ChatInputBar({
  text,
  onChangeText,
  onSend,
  isSending,
  hasShop,
  templatesOpen,
  onToggleTemplates,
}: ChatInputBarProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  return (
    <View
      style={[
        styles.inputBar,
        {
          backgroundColor: activeColors.bg.surface,
          borderTopColor: activeColors.border.subtle,
        },
      ]}
    >
      {hasShop && (
        <Pressable
          style={[styles.templateBtn, templatesOpen && styles.templateBtnActive]}
          onPress={onToggleTemplates}
        >
          <Zap
            size={18}
            color={templatesOpen ? activeColors.text.onPrimary : activeColors.brand.primary}
            strokeWidth={2.2}
          />
        </Pressable>
      )}

      <TextInput
        style={[
          styles.input,
          {
            color: activeColors.text.primary,
            backgroundColor: activeColors.bg.surfaceMuted,
          },
        ]}
        value={text}
        onChangeText={onChangeText}
        placeholder={tr('chat.placeholder')}
        placeholderTextColor={activeColors.text.tertiary}
        multiline
        onSubmitEditing={onSend}
      />

      <Pressable
        style={[
          styles.sendBtn,
          { backgroundColor: activeColors.brand.primary },
          (!text.trim() || isSending) && styles.sendBtnDisabled,
        ]}
        onPress={onSend}
        disabled={!text.trim() || isSending}
      >
        <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 8,
  },
  templateBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.brand.primarySurface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateBtnActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.text.hint,
  },
});
