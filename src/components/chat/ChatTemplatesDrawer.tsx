import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { ChatTemplate } from '@/lib/types';
import { useTheme } from '@/stores/theme';
import { haptics } from '@/utils/haptics';

interface ChatTemplatesDrawerProps {
  readonly isLoading: boolean;
  readonly templates: ChatTemplate[];
  readonly onSelectTemplate: (text: string) => void;
}

export function ChatTemplatesDrawer({
  isLoading,
  templates,
  onSelectTemplate,
}: ChatTemplatesDrawerProps) {
  const { colors: activeColors } = useTheme();

  return (
    <View
      className="py-2 border-t bg-bg-surface"
      style={{ borderTopColor: activeColors.border.subtle }}
    >
      {isLoading ? (
        <ActivityIndicator color={activeColors.brand.primary} className="my-2" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-3 gap-2"
        >
          {templates.map((t) => (
            <Pressable
              key={t.id}
              className="max-w-[220px] px-3.5 py-1.5 rounded-full bg-surface-muted border border-border-subtle active:scale-95"
              onPress={() => {
                haptics.selection();
                onSelectTemplate(t.text);
              }}
            >
              <Text
                className="text-xs font-medium text-text-primary leading-tight"
                numberOfLines={1}
              >
                {t.text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
