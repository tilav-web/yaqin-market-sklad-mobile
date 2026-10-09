import { Mic, Paperclip, Send, Smile, Zap } from 'lucide-react-native';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface ChatInputBarProps {
  readonly text: string;
  readonly onChangeText: (text: string) => void;
  readonly onSend: () => void;
  readonly isSending: boolean;
  readonly hasShop: boolean;
  readonly templatesOpen: boolean;
  readonly onToggleTemplates: () => void;
  readonly bottomInset?: number;
}

export function ChatInputBar({
  text,
  onChangeText,
  onSend,
  isSending,
  hasShop,
  templatesOpen,
  onToggleTemplates,
  bottomInset,
}: ChatInputBarProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();

  const hasContent = Boolean(text.trim());

  const handlePressSend = () => {
    if (!hasContent || isSending) return;
    haptics.light();
    onSend();
  };

  return (
    <View
      className="flex-row items-end gap-2 px-3 pt-2 border-t bg-bg-surface"
      style={{
        borderTopColor: activeColors.border.subtle,
        paddingBottom: bottomInset !== undefined ? bottomInset : 8,
      }}
    >
      {/* Left Action: Quick Templates or Attachment */}
      {hasShop ? (
        <Pressable
          onPress={() => {
            haptics.selection();
            onToggleTemplates();
          }}
          className={`w-9 h-9 rounded-full items-center justify-center mb-0.5 active:scale-95 ${
            templatesOpen ? 'bg-brand-primary' : 'bg-surface-muted'
          }`}
          hitSlop={6}
        >
          <Zap
            size={18}
            color={templatesOpen ? '#FFFFFF' : activeColors.brand.primary}
            strokeWidth={2.4}
          />
        </Pressable>
      ) : (
        <Pressable
          className="w-9 h-9 rounded-full items-center justify-center mb-0.5 bg-surface-muted active:opacity-70"
          hitSlop={6}
        >
          <Paperclip size={18} color={activeColors.text.secondary} />
        </Pressable>
      )}

      {/* Pill TextInput Container */}
      <View className="flex-1 flex-row items-end rounded-[22px] px-3.5 py-1.5 bg-surface-muted border border-border-subtle min-h-[40px] max-h-[120px]">
        <TextInput
          className="flex-1 text-[15px] text-text-primary py-1 pr-2 max-h-[110px]"
          value={text}
          onChangeText={onChangeText}
          placeholder={tr('chat.placeholder')}
          placeholderTextColor={activeColors.text.hint}
          multiline
        />

        <Pressable
          hitSlop={6}
          className="mb-1 opacity-70 active:opacity-100"
          onPress={() => haptics.selection()}
        >
          <Smile size={19} color={activeColors.text.secondary} />
        </Pressable>
      </View>

      {/* Right Send / Mic Button */}
      {hasContent ? (
        <Pressable
          onPress={handlePressSend}
          disabled={isSending}
          className="w-10 h-10 rounded-full items-center justify-center bg-brand-primary active:scale-95 shadow-sm mb-0.5"
          hitSlop={6}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.6} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => haptics.light()}
          className="w-10 h-10 rounded-full items-center justify-center bg-surface-muted active:opacity-70 mb-0.5"
          hitSlop={6}
        >
          <Mic size={19} color={activeColors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}
