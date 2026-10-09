import { Bookmark, Pin } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramSavedMessagesRowProps {
  onPress: () => void;
  activeColors: {
    bg: { surface: string; surfaceMuted: string };
    brand: { primary: string };
    border: { subtle: string };
    text: { primary: string; secondary: string };
  };
}

export function TelegramSavedMessagesRow({ onPress, activeColors }: TelegramSavedMessagesRowProps) {
  const { tr } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        styles.savedRow,
        {
          backgroundColor: activeColors.bg.surface,
          borderBottomColor: activeColors.border.subtle,
        },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarFallback, { backgroundColor: activeColors.brand.primary }]}>
          <Bookmark size={24} color="#FFFFFF" />
        </View>
      </View>
      <View style={styles.contentWrap}>
        <View style={styles.topLine}>
          <Text style={[styles.chatTitle, { color: activeColors.text.primary }]}>
            {tr('chat.savedMessages')}
          </Text>
          <Pin
            size={15}
            color={activeColors.text.secondary}
            style={{ transform: [{ rotate: '45deg' }] }}
          />
        </View>
        <View style={styles.bottomLine}>
          <Text
            style={[styles.lastMessageText, { color: activeColors.text.secondary }]}
            numberOfLines={1}
          >
            {tr('chat.savedMessagesDesc')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chatRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  savedRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessageText: {
    fontSize: 13.5,
    flex: 1,
    lineHeight: 18,
  },
});
