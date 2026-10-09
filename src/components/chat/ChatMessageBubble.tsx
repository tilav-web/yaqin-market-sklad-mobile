import { CheckCheck, Clock } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface ChatMessageBubbleProps {
  readonly text: string;
  readonly createdAt: string;
  readonly isMine: boolean;
  readonly isPending?: boolean;
}

export function ChatMessageBubble({
  text,
  createdAt,
  isMine,
  isPending,
}: ChatMessageBubbleProps) {
  const { colors: activeColors } = useTheme();

  const formattedTime = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Check if message is a system / order status update
  const isStatusMessage =
    !isMine &&
    (text.startsWith('📦') ||
      text.startsWith('✅') ||
      text.startsWith('🧑‍🍳') ||
      text.startsWith('🛵') ||
      text.startsWith('🎉') ||
      text.startsWith('❌') ||
      text.startsWith('⚠️') ||
      text.startsWith('⌛'));

  if (isStatusMessage) {
    return (
      <View className="w-full my-2 items-center px-4">
        <Pressable
          onLongPress={() => haptics.selection()}
          className="w-full max-w-[94%] bg-white dark:bg-[#1C1C1E] border border-brand-primary/20 rounded-2xl p-3.5 shadow-xs"
          style={{
            borderLeftWidth: 4,
            borderLeftColor: activeColors.brand.primary,
          }}
        >
          <Text className="text-[14px] leading-5 font-medium text-text-primary">
            {text}
          </Text>
          <Text className="text-[10.5px] text-text-hint mt-1.5 self-end">
            {formattedTime}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={`w-full flex-row my-0.5 ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
      <Pressable
        onLongPress={() => haptics.selection()}
        style={{ elevation: 1 }}
        className={`max-w-[82%] px-3.5 pt-2 pb-1.5 shadow-xs ${
          isMine
            ? 'bg-brand-primary rounded-[18px] rounded-br-[3px]'
            : 'bg-white dark:bg-[#1C1C1E] rounded-[18px] rounded-bl-[3px] border border-border-subtle'
        }`}
      >
        <Text
          className={`text-[15px] leading-[20.5px] ${
            isMine ? 'text-white font-normal' : 'text-text-primary'
          }`}
        >
          {text}
        </Text>

        <View className="flex-row items-center justify-end gap-1 mt-0.5 self-end">
          <Text
            className={`text-[11px] ${
              isMine ? 'text-white/80' : 'text-text-hint'
            }`}
          >
            {formattedTime}
          </Text>
          {isMine &&
            (isPending ? (
              <Clock size={11} color="#FFFFFF" opacity={0.8} strokeWidth={2.2} />
            ) : (
              <CheckCheck size={13} color="#FFFFFF" strokeWidth={2.4} />
            ))}
        </View>
      </Pressable>
    </View>
  );
}
