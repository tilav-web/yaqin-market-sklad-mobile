import { Send, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';

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
      className="flex-row items-center gap-1.5 px-4 py-1.5 border-t"
      style={{
        backgroundColor: activeColors.bg.surface,
        borderTopColor: activeColors.border.subtle,
      }}
    >
      {hasShop && (
        <Pressable
          className={`w-[38px] h-[38px] rounded-full border items-center justify-center ${
            templatesOpen ? 'bg-[#E8392E] border-[#E8392E]' : 'bg-[#FDECEA] border-[#FBD9D5]'
          }`}
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
        className="flex-1 text-sm max-h-[100px] min-h-[40px] rounded-2xl px-3.5 py-2"
        style={{
          color: activeColors.text.primary,
          backgroundColor: activeColors.bg.surfaceMuted,
        }}
        value={text}
        onChangeText={onChangeText}
        placeholder={tr('chat.placeholder')}
        placeholderTextColor={activeColors.text.tertiary}
        multiline
        onSubmitEditing={onSend}
      />

      <Pressable
        className={`w-[38px] h-[38px] rounded-full items-center justify-center ${
          !text.trim() || isSending ? 'bg-[#C5BFB9]' : 'bg-[#E8392E]'
        }`}
        onPress={onSend}
        disabled={!text.trim() || isSending}
      >
        <Send size={18} color="#FFFFFF" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
