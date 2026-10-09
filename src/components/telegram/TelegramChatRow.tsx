import { Check, CheckCheck, Store } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

import { UnifiedChat } from './types';

interface TelegramChatRowProps {
  item: UnifiedChat;
  onPress: () => void;
  activeColors: {
    bg: { surface: string; surfaceMuted: string; surfaceElevated: string };
    brand: { primary: string };
    text: { primary: string; secondary: string; tertiary: string };
  };
}

export function TelegramChatRow({ item, onPress, activeColors }: TelegramChatRowProps) {
  const initials = item.title
    ? item.title
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'YM';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        { backgroundColor: activeColors.bg.surface },
        pressed && { backgroundColor: activeColors.bg.surfaceMuted },
      ]}
    >
      {/* Telegram Circle Avatar */}
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={[styles.avatarImage, { backgroundColor: activeColors.bg.surfaceMuted }]}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {
                backgroundColor: item.isSellerSide
                  ? activeColors.bg.surfaceElevated
                  : activeColors.brand.primary,
              },
            ]}
          >
            {item.isSellerSide ? (
              <Text style={styles.avatarInitials}>{initials}</Text>
            ) : (
              <Store size={22} color="#FFFFFF" />
            )}
          </View>
        )}
        {item.isSellerSide && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Xaridor</Text>
          </View>
        )}
      </View>

      {/* Telegram Chat Content */}
      <View style={styles.contentWrap}>
        <View style={styles.topLine}>
          <Text
            style={[styles.chatTitle, { color: activeColors.text.primary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.timeWrap}>
            <Text
              style={[
                styles.timeText,
                { color: activeColors.text.tertiary },
                item.unreadCount > 0 && styles.timeTextUnread,
              ]}
            >
              {item.time}
            </Text>
          </View>
        </View>

        <View style={styles.bottomLine}>
          <Text
            style={[
              styles.lastMessageText,
              { color: activeColors.text.secondary },
              item.unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={2}
          >
            {item.subtitle}
          </Text>

          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : item.isOrder ? (
            <CheckCheck size={16} color={activeColors.text.tertiary} />
          ) : (
            <Check size={16} color={activeColors.text.tertiary} />
          )}
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
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '800',
    fontSize: 18,
    color: '#FFFFFF',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#374151',
    borderRadius: radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
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
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeTextUnread: {
    color: colors.brand.primary,
    fontWeight: '700',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lastMessageText: {
    fontSize: 13.5,
    flex: 1,
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
});
