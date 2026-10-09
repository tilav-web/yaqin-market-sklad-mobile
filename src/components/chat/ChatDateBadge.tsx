import React from 'react';
import { Text, View } from 'react-native';

interface ChatDateBadgeProps {
  readonly dateText: string;
}

export function ChatDateBadge({ dateText }: ChatDateBadgeProps) {
  return (
    <View className="self-center my-2.5 items-center justify-center">
      <View className="px-3 py-1 rounded-full bg-white dark:bg-[#1C1C1E] border border-border-subtle shadow-xs">
        <Text className="text-[11.5px] font-medium text-text-secondary tracking-wide">
          {dateText}
        </Text>
      </View>
    </View>
  );
}
