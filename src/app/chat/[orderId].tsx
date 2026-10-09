import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import EmojiPicker from 'rn-emoji-keyboard';

import {
  ChatAttachedProduct,
  ChatDateBadge,
  ChatHeader,
  ChatInputBar,
  ChatMessageBubble,
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
  const insets = useSafeAreaInsets();
  const { colors: activeColors } = useTheme();
  const myId = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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
    sendMessage,
    isSending,
  } = useChatSession({
    effectiveId,
    isDirectConv,
    productId,
    shopId,
    onSentSuccess: () => setText(''),
  });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates?.height ?? 0);
        setIsKeyboardVisible(true);
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const chatBg = activeColors.bg.canvas;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: activeColors.bg.surface }}>
      {/* Telegram-style Top Header */}
      <ChatHeader chatTitle={chatTitle} shopId={shopId} avatarUrl={avatarUrl} />

      {/* Attached Product Preview Card */}
      {productQuery.data && <ChatAttachedProduct product={productQuery.data} />}

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor: chatBg,
          paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0,
        }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {isLoadingMessages ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand.primary} />
          </View>
        ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              style={{ flex: 1 }}
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 10,
                paddingVertical: 12,
                flexGrow: 1,
                justifyContent: messages.length === 0 ? 'center' : undefined,
              }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
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

          {/* Telegram-style Bottom Input Bar pinned to keyboard/bottom */}
          <ChatInputBar
            text={text}
            onChangeText={setText}
            onSend={handleSend}
            isSending={isSending}
            onOpenEmoji={() => {
              Keyboard.dismiss();
              setIsEmojiPickerOpen(true);
            }}
            bottomInset={isKeyboardVisible ? 4 : Math.max(insets.bottom, 6)}
          />
      </KeyboardAvoidingView>

      {/* Telegram-style Emoji Picker Sheet */}
      <EmojiPicker
        open={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onEmojiSelected={(emojiObject) => {
          haptics.selection();
          setText((prev) => prev + emojiObject.emoji);
        }}
        theme={{
          backdrop: 'rgba(0,0,0,0.4)',
          knob: activeColors.border.subtle,
          container: activeColors.bg.surface,
          header: activeColors.text.primary,
          skinTonesContainer: activeColors.bg.canvas,
          category: {
            icon: activeColors.text.secondary,
            iconActive: activeColors.brand.primary,
            container: activeColors.bg.surface,
            containerActive: activeColors.bg.canvas,
          },
        }}
      />
    </SafeAreaView>
  );
}
