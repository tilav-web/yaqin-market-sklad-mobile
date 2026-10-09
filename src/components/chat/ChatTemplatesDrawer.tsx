import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ChatTemplate } from '@/lib/types';
import { colors } from '@/theme';

interface ChatTemplatesDrawerProps {
  isLoading: boolean;
  templates: ChatTemplate[];
  onSelectTemplate: (text: string) => void;
}

export function ChatTemplatesDrawer({
  isLoading,
  templates,
  onSelectTemplate,
}: ChatTemplatesDrawerProps) {
  return (
    <View className="border-t border-[#DEDAD6] bg-[#ECE9E6] py-2">
      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} className="m-4" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 gap-2"
        >
          {templates.map((t) => (
            <Pressable
              key={t.id}
              className="max-w-[200px] px-3 py-2 rounded-xl bg-white border border-[#FBD9D5]"
              onPress={() => onSelectTemplate(t.text)}
            >
              <Text className="text-xs text-[#191715] leading-[18px]" numberOfLines={2}>
                {t.text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
