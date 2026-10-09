import { CheckCheck } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/utils/haptics';

interface ChatMessageBubbleProps {
  readonly text: string;
  readonly createdAt: string;
  readonly isMine: boolean;
}

export function ChatMessageBubble({ text, createdAt, isMine }: ChatMessageBubbleProps) {
  const formattedTime = new Date(createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className={`w-full flex-row my-0.5 ${isMine ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
      <Pressable
        onLongPress={() => haptics.selection()}
        style={{ elevation: 1 }}
        className={`max-w-[82%] px-3.5 pt-2 pb-1.5 shadow-xs ${
          isMine
            ? 'bg-[#EEFFDE] dark:bg-[#2B5278] rounded-[18px] rounded-br-[3px] border border-[#D5EAC3] dark:border-[#38628B]'
            : 'bg-white dark:bg-[#182533] rounded-[18px] rounded-bl-[3px] border border-black/5 dark:border-white/5'
        }`}
      >
        <Text
          className={`text-[15px] leading-[20.5px] ${
            isMine ? 'text-[#000000] dark:text-[#FFFFFF]' : 'text-[#111827] dark:text-[#F3F4F6]'
          }`}
        >
          {text}
        </Text>

        <View className="flex-row items-center justify-end gap-1 mt-0.5 self-end">
          <Text
            className={`text-[11px] ${
              isMine
                ? 'text-[#5AA155] dark:text-[#88B8E8]'
                : 'text-[#8E9CA8] dark:text-[#7A91A8]'
            }`}
          >
            {formattedTime}
          </Text>
          {isMine && (
            <CheckCheck size={13} color="#4FAE4E" strokeWidth={2.4} />
          )}
        </View>
      </Pressable>
    </View>
  );
}
