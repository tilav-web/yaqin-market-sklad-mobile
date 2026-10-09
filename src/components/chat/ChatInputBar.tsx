import { Mic, Paperclip, Send, Smile, Zap } from 'lucide-react-native';
import React from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

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
      className="flex-row items-center gap-1.5 px-2.5 pt-1.5 border-t bg-bg-surface"
      style={{
        borderTopColor: activeColors.border.subtle,
        paddingBottom: bottomInset !== undefined ? bottomInset : 6,
      }}
    >
      {/* Left Action: Quick Templates or Attachment */}
      {hasShop ? (
        <Pressable
          onPress={() => {
            haptics.selection();
            onToggleTemplates();
          }}
          className={`w-9 h-9 rounded-full items-center justify-center active:scale-95 ${
            templatesOpen ? 'bg-brand-primary' : 'bg-surface-muted'
          }`}
          hitSlop={6}
        >
          <Zap
            size={17}
            color={templatesOpen ? '#FFFFFF' : activeColors.brand.primary}
            strokeWidth={2.4}
          />
        </Pressable>
      ) : (
        <Pressable
          className="w-9 h-9 rounded-full items-center justify-center bg-surface-muted active:opacity-70"
          hitSlop={6}
        >
          <Paperclip size={17} color={activeColors.text.secondary} />
        </Pressable>
      )}

      {/* Telegram-style Compact Pill TextInput Container */}
      <View
        className="flex-1 flex-row items-center rounded-full px-3.5 bg-surface-muted border border-border-subtle"
        style={{
          minHeight: 36,
          maxHeight: 110,
        }}
      >
        <TextInput
          className="flex-1 text-[15px] text-text-primary pr-1.5"
          style={{
            paddingVertical: Platform.OS === 'android' ? 3 : 5,
            paddingHorizontal: 0,
            textAlignVertical: 'center',
          }}
          value={text}
          onChangeText={onChangeText}
          placeholder={tr('chat.placeholder')}
          placeholderTextColor={activeColors.text.hint}
          multiline
        />

        <Pressable
          hitSlop={6}
          className="p-0.5 opacity-70 active:opacity-100"
          onPress={() => haptics.selection()}
        >
          <Smile size={18} color={activeColors.text.secondary} />
        </Pressable>
      </View>

      {/* Right Send / Mic Button */}
      {hasContent ? (
        <Pressable
          onPress={handlePressSend}
          disabled={isSending}
          className="w-9 h-9 rounded-full items-center justify-center bg-brand-primary active:scale-95 shadow-sm"
          hitSlop={6}
        >
          <Send size={16} color="#FFFFFF" strokeWidth={2.6} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => haptics.light()}
          className="w-9 h-9 rounded-full items-center justify-center bg-surface-muted active:opacity-70"
          hitSlop={6}
        >
          <Mic size={18} color={activeColors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}
