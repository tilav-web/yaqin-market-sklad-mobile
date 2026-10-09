import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

interface ChatMessageBubbleProps {
  text: string;
  createdAt: string;
  isMine: boolean;
}

export function ChatMessageBubble({ text, createdAt, isMine }: ChatMessageBubbleProps) {
  return (
    <View style={[styles.bubbleRow, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{text}</Text>
        <Text style={[styles.time, isMine && styles.timeMine]}>
          {new Date(createdAt).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: colors.brand.primary,
    borderBottomRightRadius: radius.xs,
  },
  bubbleTheirs: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderBottomLeftRadius: radius.xs,
  },
  bubbleText: {
    ...typography.body,
    fontSize: 14.5,
    color: colors.text.primary,
    lineHeight: 20,
  },
  bubbleTextMine: { color: colors.text.onPrimary },
  time: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  timeMine: {
    color: colors.text.onPrimary,
    opacity: 0.85,
  },
});
