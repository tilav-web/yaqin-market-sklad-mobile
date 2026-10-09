import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatTemplate } from '@/lib/types';
import { colors, layout, radius, spacing, typography } from '@/theme';

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
    <View style={styles.templatesPanel}>
      {isLoading ? (
        <ActivityIndicator color={colors.brand.primary} style={{ margin: spacing.md }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templatesList}
        >
          {templates.map((t) => (
            <Pressable
              key={t.id}
              style={styles.templateChip}
              onPress={() => onSelectTemplate(t.text)}
            >
              <Text style={styles.templateChipText} numberOfLines={2}>
                {t.text}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  templatesPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surfaceMuted,
    paddingVertical: spacing.sm,
  },
  templatesList: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.sm,
  },
  templateChip: {
    maxWidth: 200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.brand.primaryBorder,
  },
  templateChipText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    lineHeight: 18,
  },
});
