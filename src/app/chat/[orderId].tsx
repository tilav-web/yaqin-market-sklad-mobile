import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ChatAttachedProduct,
  ChatDateBadge,
  ChatHeader,
  ChatInputBar,
  ChatMessageBubble,
  ChatTemplatesDrawer,
  formatChatGroupDate,
  useChatSession,
} from '@/components/chat';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { PublicProductVariant } from '@/lib/types';
import { useAuthStore } from '@/stores/auth';
import { useTheme } from '@/stores/theme';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

export default function ChatScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    conversationId?: string;
    shopId?: string;
    title?: string;
    avatarUrl?: string;
    productId?: string;
  }>();

  const effectiveId = params.conversationId || params.orderId;
  const shopId = params.shopId;
  const chatTitle = params.title;
  const avatarUrl = params.avatarUrl;
  const productId = params.productId;

  const { tr } = useTranslation();
  const { isDark, colors: activeColors } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const listRef = useRef<FlatList<any>>(null);

  const productQuery = useQuery({
    queryKey: ['product-variant', productId],
    queryFn: async () => {
      const res = await api.get<PublicProductVariant>(`/catalog/products/${productId}`);
      return res.data;
    },
    enabled: !!productId,
  });

  const isDirectConv = Boolean(params.conversationId || (!params.orderId?.startsWith('ord_') && params.title));

  const {
    messages,
    isLoadingMessages,
    templates,
    isLoadingTemplates,
    sendMessage,
    isSending,
  } = useChatSession({
    effectiveId,
    isDirectConv,
    productId,
    shopId,
    templatesOpen,
    onSentSuccess: () => setText(''),
  });

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages.length]);

  const handleSend = () => {
    const body = text.trim();
    if (!body || isSending) return;
    haptics.light();
    sendMessage(body);
  };

  const telegramBg = isDark ? '#0E1621' : '#E2EAF1';

  return (
    <SafeAreaView className="flex-1" edges={['top', 'bottom']} style={{ backgroundColor: activeColors.bg.surface }}>
      {/* Telegram-style Top Header */}
      <ChatHeader chatTitle={chatTitle} shopId={shopId} avatarUrl={avatarUrl} />

      {/* Attached Product Preview Card */}
      {productQuery.data && <ChatAttachedProduct product={productQuery.data} />}

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: telegramBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        {isLoadingMessages ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 12, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-12">
                <View className="px-4 py-2 rounded-full bg-black/20 dark:bg-white/20">
                  <Text className="text-xs font-semibold text-white">{tr('chat.empty')}</Text>
                </View>
              </View>
            }
            renderItem={({ item, index }) => {
              const isNewDay =
                index === 0 ||
                new Date(item.createdAt).toDateString() !==
                  new Date(messages[index - 1].createdAt).toDateString();

              return (
                <View key={item.id}>
                  {isNewDay && (
                    <ChatDateBadge dateText={formatChatGroupDate(item.createdAt, tr)} />
                  )}
                  <ChatMessageBubble
                    text={item.text}
                    createdAt={item.createdAt}
                    isMine={item.senderUserId === myId}
                  />
                </View>
              );
            }}
          />
        )}

        {/* Quick reply templates drawer */}
        {templatesOpen && shopId && (
          <ChatTemplatesDrawer
            isLoading={isLoadingTemplates}
            templates={templates}
            onSelectTemplate={(templateText) => {
              setText(templateText);
              setTemplatesOpen(false);
            }}
          />
        )}

        {/* Telegram-style Bottom Input Bar */}
        <ChatInputBar
          text={text}
          onChangeText={setText}
          onSend={handleSend}
          isSending={isSending}
          hasShop={Boolean(shopId)}
          templatesOpen={templatesOpen}
          onToggleTemplates={() => setTemplatesOpen((v) => !v)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
