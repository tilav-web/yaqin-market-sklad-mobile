import React from 'react';
import { Text, View } from 'react-native';

interface ChatDateBadgeProps {
  readonly dateText: string;
}

export function ChatDateBadge({ dateText }: ChatDateBadgeProps) {
  return (
    <View className="self-center my-2 items-center justify-center">
      <View className="px-3.5 py-1 rounded-full bg-black/25 dark:bg-white/25">
        <Text className="text-[12px] font-semibold text-white tracking-wide">
          {dateText}
        </Text>
      </View>
    </View>
  );
}
