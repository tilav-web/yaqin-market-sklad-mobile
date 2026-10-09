import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { EmptyState } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/stores/theme';

import { TelegramChatRow } from './TelegramChatRow';
import { TelegramChatsEmpty } from './TelegramChatsEmpty';
import { TelegramSavedMessagesRow } from './TelegramSavedMessagesRow';
import { UnifiedChat } from './types';

interface TelegramChatsTabPageProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  filteredChats: UnifiedChat[];
  activeColors: ReturnType<typeof useTheme>['colors'];
  isRefreshing: boolean;
  bottomInset: number;
  onRefresh: () => void;
  onOpenChat: (chat: UnifiedChat) => void;
  onOpenSaved: () => void;
  onExplore: () => void;
  onLogin: () => void;
}

export function TelegramChatsTabPage({
  isLoading,
  isAuthenticated,
  filteredChats,
  activeColors,
  isRefreshing,
  bottomInset,
  onRefresh,
  onOpenChat,
  onOpenSaved,
  onExplore,
  onLogin,
}: TelegramChatsTabPageProps) {
  const { tr } = useTranslation();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: activeColors.bg.canvas }}>
        <ActivityIndicator size="large" color={activeColors.brand.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: activeColors.bg.canvas }}>
        <EmptyState
          icon={MessageCircle}
          title={tr('chat.loginTitle')}
          description={tr('chat.loginDesc')}
          actionLabel={tr('chat.loginButton')}
          onAction={onLogin}
        />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: activeColors.bg.canvas }}>
      <FlatList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TelegramChatRow
            item={item}
            onPress={() => onOpenChat(item)}
            activeColors={activeColors}
          />
        )}
        ItemSeparatorComponent={() => (
          <View
            className="h-[1px] ml-[82px]"
            style={{ backgroundColor: activeColors.border.subtle }}
          />
        )}
        contentContainerStyle={{ paddingTop: 2, paddingBottom: bottomInset + 90 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={activeColors.brand.primary}
          />
        }
        ListHeaderComponent={
          <TelegramSavedMessagesRow
            onPress={onOpenSaved}
            activeColors={activeColors}
          />
        }
        ListEmptyComponent={
          <TelegramChatsEmpty
            onExplore={onExplore}
            activeColors={activeColors}
          />
        }
      />
    </View>
  );
}
