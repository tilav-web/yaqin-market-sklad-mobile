import { MessageCircle, ShoppingBag } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/i18n';

interface TelegramChatsEmptyProps {
  onExplore: () => void;
  activeColors: {
    brand: { primary: string; primarySurface: string };
    text: { primary: string; secondary: string };
  };
}

export function TelegramChatsEmpty({ onExplore, activeColors }: TelegramChatsEmptyProps) {
  const { tr } = useTranslation();

  return (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconCircle,
          { backgroundColor: activeColors.brand.primarySurface },
        ]}
      >
        <MessageCircle size={44} color={activeColors.brand.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: activeColors.text.primary }]}>
        {tr('chat.emptyTitle')}
      </Text>
      <Text style={[styles.emptyDesc, { color: activeColors.text.secondary }]}>
        {tr('chat.emptyDesc')}
      </Text>
      <Pressable
        onPress={onExplore}
        style={[styles.exploreButton, { backgroundColor: activeColors.brand.primary }]}
      >
        <ShoppingBag size={18} color="#FFFFFF" />
        <Text style={styles.exploreButtonText}>{tr('chat.exploreButton')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreButtonText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
