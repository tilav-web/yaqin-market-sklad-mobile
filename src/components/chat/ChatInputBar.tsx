import { Paperclip, Send, Smile } from 'lucide-react-native';
import React, { useRef } from 'react';
import { Platform, Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface ChatInputBarProps {
  readonly text: string;
  readonly onChangeText: (text: string) => void;
  readonly onSend: () => void;
  readonly isSending: boolean;
  readonly onOpenEmoji?: () => void;
  readonly onAttach?: () => void;
  readonly onTyping?: (isTyping: boolean) => void;
  readonly bottomInset?: number;
}

export function ChatInputBar({
  text,
  onChangeText,
  onSend,
  isSending,
  onOpenEmoji,
  onAttach,
  onTyping,
  bottomInset,
}: ChatInputBarProps) {
  const { tr } = useTranslation();
  const { colors: activeColors } = useTheme();
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasContent = Boolean(text.trim());

  const handleChangeText = (val: string) => {
    onChangeText(val);
    if (onTyping) {
      onTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  const handlePressSend = () => {
    if (!hasContent || isSending) return;
    if (onTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      onTyping(false);
    }
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
      {/* 1. Left Emoji Button (Authentic Telegram layout) */}
      <Pressable
        onPress={() => {
          haptics.selection();
          onOpenEmoji?.();
        }}
        className="w-9 h-9 rounded-full items-center justify-center bg-surface-muted active:opacity-70"
        hitSlop={6}
      >
        <Smile size={20} color={activeColors.text.secondary} />
      </Pressable>

      {/* 2. Telegram-style Compact Input Pill with Attachment */}
      <View
        className="flex-1 flex-row items-center rounded-full pl-3.5 pr-2 bg-surface-muted border border-border-subtle"
        style={{
          minHeight: 36,
          maxHeight: 110,
        }}
      >
        <TextInput
          className="flex-1 text-[15px] text-text-primary pr-1"
          style={{
            paddingVertical: Platform.OS === 'android' ? 3 : 5,
            paddingHorizontal: 0,
            textAlignVertical: 'center',
          }}
          value={text}
          onChangeText={handleChangeText}
          placeholder={tr('chat.placeholder')}
          placeholderTextColor={activeColors.text.hint}
          multiline
        />

        {/* Paperclip Attachment inside pill */}
        <Pressable
          hitSlop={6}
          className="p-1 opacity-70 active:opacity-100"
          onPress={() => {
            haptics.selection();
            onAttach?.();
          }}
        >
          <Paperclip size={18} color={activeColors.text.secondary} />
        </Pressable>
      </View>

      {/* 3. Right Send Button */}
      <Pressable
        onPress={handlePressSend}
        disabled={!hasContent || isSending}
        className={`w-9 h-9 rounded-full items-center justify-center active:scale-95 shadow-sm ${
          hasContent ? 'bg-brand-primary' : 'bg-surface-muted opacity-40'
        }`}
        hitSlop={6}
      >
        <Send
          size={16}
          color={hasContent ? '#FFFFFF' : activeColors.text.secondary}
          strokeWidth={2.4}
        />
      </Pressable>
    </View>
  );
}
