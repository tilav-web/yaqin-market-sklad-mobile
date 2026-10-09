import React from 'react';
import { Text, View } from 'react-native';

interface ChatMessageBubbleProps {
  text: string;
  createdAt: string;
  isMine: boolean;
}

export function ChatMessageBubble({ text, createdAt, isMine }: ChatMessageBubbleProps) {
  const formattedTime = new Date(createdAt).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View className={`flex-row ${isMine ? 'justify-end' : 'justify-start'}`}>
      <View
        className={`max-w-[78%] px-4 py-2 rounded-2xl ${
          isMine
            ? 'bg-[#E8392E] rounded-br-xs'
            : 'bg-white border border-[#DEDAD6] rounded-bl-xs'
        }`}
      >
        <Text
          className={`text-[14.5px] leading-5 ${
            isMine ? 'text-white' : 'text-[#191715]'
          }`}
        >
          {text}
        </Text>
        <Text
          className={`text-[10px] mt-0.5 self-end ${
            isMine ? 'text-white/85' : 'text-[#A39D96]'
          }`}
        >
          {formattedTime}
        </Text>
      </View>
    </View>
  );
}
